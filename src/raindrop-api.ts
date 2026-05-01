import { requestUrl } from "obsidian";

export interface RaindropItem {
	_id: number;
	link: string;
	title: string;
	excerpt?: string;
	domain?: string;
	created?: string;
	cover?: string;
	tags?: string[];
}

interface RaindropListResponse {
	items?: RaindropItem[];
	result?: boolean;
	count?: number;
}

export interface RaindropListParams {
	collectionId: number;
	search?: string;
	sort?: string;
	page?: number;
	perpage?: number;
}

export class RaindropApi {
	private readonly baseUrl = "https://api.raindrop.io/rest/v1";
	private readonly token: string;

	constructor(accessToken: string) {
		this.token = accessToken.trim();
	}

	get isConfigured(): boolean {
		return this.token.length > 0;
	}

	async listRaindrops(params: RaindropListParams): Promise<RaindropItem[]> {
		if (!this.isConfigured) {
			throw new Error("Missing Raindrop.io access token. Add one in plugin settings.");
		}

		const collectionId = Number.isFinite(params.collectionId) ? params.collectionId : 0;
		const url = new URL(`${this.baseUrl}/raindrops/${collectionId}`);
		if (params.search) url.searchParams.set("search", params.search);
		if (params.sort) url.searchParams.set("sort", params.sort);
		if (typeof params.page === "number") url.searchParams.set("page", String(params.page));
		if (typeof params.perpage === "number") url.searchParams.set("perpage", String(params.perpage));

		const res = await requestUrl({
			url: url.toString(),
			method: "GET",
			headers: {
				Authorization: `Bearer ${this.token}`,
			},
		});

		if (res.status < 200 || res.status >= 300) {
			throw new Error(`Raindrop.io request failed with status ${res.status}.`);
		}

		const data = res.json as RaindropListResponse;
		if (!data.result || !Array.isArray(data.items)) {
			throw new Error("Unexpected Raindrop.io API response.");
		}

		return data.items;
	}

	async listAllRaindrops(params: RaindropListParams, maxItems = 500): Promise<RaindropItem[]> {
		const items: RaindropItem[] = [];
		const perpage = Math.max(1, Math.min(50, params.perpage ?? 50));
		let page = params.page ?? 0;

		while (items.length < maxItems) {
			const batch = await this.listRaindrops({
				...params,
				page,
				perpage,
			});

			items.push(...batch);
			if (batch.length < perpage) break;
			page += 1;
		}

		return items.slice(0, maxItems);
	}
}
