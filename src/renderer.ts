import type { RaindropItem } from "./raindrop-api";

export type RaindropStatusKind = "loading" | "empty" | "error" | "info";

export interface RaindropDisplayFields {
	cover: boolean;
	domain: boolean;
	created: boolean;
	excerpt: boolean;
	tags: boolean;
	collection: boolean;
}

export const DEFAULT_DISPLAY_FIELDS: RaindropDisplayFields = {
	cover: false,
	domain: true,
	created: true,
	excerpt: true,
	tags: true,
	collection: false,
};

export const RAINDROP_FIELD_NAMES = Object.keys(DEFAULT_DISPLAY_FIELDS) as (keyof RaindropDisplayFields)[];

export function isRaindropFieldName(value: string): value is keyof RaindropDisplayFields {
	return (RAINDROP_FIELD_NAMES as string[]).includes(value);
}

export function resolveRaindropDisplayFields(
	defaults: RaindropDisplayFields,
	show?: (keyof RaindropDisplayFields)[],
	hide?: (keyof RaindropDisplayFields)[],
): RaindropDisplayFields {
	const fields = { ...defaults };
	for (const field of show ?? []) fields[field] = true;
	for (const field of hide ?? []) fields[field] = false;
	return fields;
}

export interface RenderRaindropOptions {
	title?: string;
	warnings?: string[];
	onTagClick?: (tag: string) => void;
	fields?: RaindropDisplayFields;
	collectionTitles?: Map<number, string>;
}

function getDisplayDate(value: string | undefined): string | undefined {
	if (!value) return undefined;

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return undefined;

	return date.toLocaleDateString();
}

function getCollectionTitle(item: RaindropItem, collectionTitles: Map<number, string> | undefined): string | undefined {
	const collectionId = item.collection?.$id;
	if (typeof collectionId !== "number") return undefined;

	return collectionTitles?.get(collectionId);
}

export function renderRaindropStatus(container: HTMLElement, message: string, kind: RaindropStatusKind): void {
	container.empty();
	container.createDiv({
		cls: `raindrop-status raindrop-status-${kind}`,
		text: message,
	});
}

export function renderRaindropItems(
	container: HTMLElement,
	items: RaindropItem[],
	options: RenderRaindropOptions = {},
): void {
	container.empty();

	const fields = options.fields ?? DEFAULT_DISPLAY_FIELDS;
	const root = container.createDiv({ cls: "raindrop-results" });
	if (options.title) {
		root.createEl("h4", { cls: "raindrop-results-title", text: options.title });
	}

	if (options.warnings && options.warnings.length > 0) {
		const warnings = root.createDiv({ cls: "raindrop-warnings" });
		for (const warning of options.warnings) {
			warnings.createDiv({ cls: "raindrop-warning", text: warning });
		}
	}

	if (items.length === 0) {
		root.createDiv({ cls: "raindrop-status raindrop-status-empty", text: "No Raindrop.io links matched this filter." });
		return;
	}

	const list = root.createDiv({ cls: "raindrop-list" });
	for (const item of items) {
		const row = list.createDiv({ cls: "raindrop-item" });

		if (fields.cover && item.cover) {
			row.createEl("img", {
				cls: "raindrop-item-cover",
				attr: {
					src: item.cover,
					alt: "",
					loading: "lazy",
				},
			});
		}

		const title = row.createEl("a", {
			cls: "raindrop-item-title",
			text: item.title || item.link,
			attr: {
				href: item.link,
				target: "_blank",
				rel: "noopener noreferrer",
			},
		});
		title.setAttr("aria-label", `Open ${item.title || item.link}`);

		const metaParts = [
			fields.collection ? getCollectionTitle(item, options.collectionTitles) : undefined,
			fields.domain ? item.domain : undefined,
			fields.created ? getDisplayDate(item.created) : undefined,
		].filter((part): part is string => Boolean(part));
		if (metaParts.length > 0) {
			row.createDiv({ cls: "raindrop-item-meta", text: metaParts.join(" - ") });
		}

		if (fields.excerpt && item.excerpt) {
			row.createDiv({ cls: "raindrop-item-excerpt", text: item.excerpt });
		}

		if (fields.tags && item.tags && item.tags.length > 0) {
			const tags = row.createDiv({ cls: "raindrop-item-tags" });
			for (const tag of item.tags) {
				const tagEl = tags.createEl("a", {
					cls: "tag raindrop-item-tag",
					text: `#${tag}`,
					attr: {
						href: `#${tag}`,
					},
				});
				tagEl.addEventListener("click", (event) => {
					event.preventDefault();
					options.onTagClick?.(tag);
				});
			}
		}
	}
}
