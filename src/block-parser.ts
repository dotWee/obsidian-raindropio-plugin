export interface RaindropBlockOptions {
	collectionId?: number;
	search?: string;
	tag?: string;
	sort?: string;
	limit?: number;
}

export interface ParsedRaindropBlock {
	options: RaindropBlockOptions;
	warnings: string[];
}

function parseKeyValueLines(source: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const rawLine of source.split("\n")) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;

		const idx = line.indexOf(":");
		if (idx === -1) continue;

		const key = line.slice(0, idx).trim();
		const value = line.slice(idx + 1).trim();
		if (key) out[key] = value;
	}
	return out;
}

function clampLimit(limit: number, { min, max }: { min: number; max: number }): number {
	if (!Number.isFinite(limit)) return min;
	return Math.max(min, Math.min(max, Math.floor(limit)));
}

export function parseRaindropBlock(source: string): ParsedRaindropBlock {
	const warnings: string[] = [];
	const kv = parseKeyValueLines(source);

	const collectionRaw = kv.collection ?? kv.collectionId;
	const collectionId = collectionRaw === undefined ? undefined : Number(collectionRaw);
	if (collectionId !== undefined && (!Number.isFinite(collectionId) || collectionId < 0)) {
		warnings.push("Invalid `collection`; using the default collection.");
	}

	const limitRaw = kv.limit;
	const limit = limitRaw ? clampLimit(Number(limitRaw), { min: 1, max: 100 }) : undefined;
	if (limitRaw && !Number.isFinite(Number(limitRaw))) {
		warnings.push("Invalid `limit`; using the plugin default.");
	}

	const tag = kv.tag?.trim() || undefined;
	const search = kv.search?.trim() || undefined;
	const sort = kv.sort?.trim() || undefined;

	return {
		options: {
			collectionId: collectionId !== undefined && Number.isFinite(collectionId) && collectionId >= 0 ? collectionId : undefined,
			tag,
			search,
			sort,
			limit,
		},
		warnings,
	};
}

export function extractFirstRaindropBlock(source: string): string | null {
	const match = source.match(/```raindrop\s*\n([\s\S]*?)```/i);
	const block = match?.[1];
	return typeof block === "string" ? block : null;
}
