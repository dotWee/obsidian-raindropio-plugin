import type { CachedMetadata } from "obsidian";

export class Notice {
	constructor(public message: string) {}
}

export class Plugin {}

export class PluginSettingTab {}

export class MarkdownView {
	file: unknown = null;
}

export class TFile {
	path = "";
}

export class ItemView {}

export class Setting {}

export function getAllTags(metadata: CachedMetadata): string[] | null {
	const tags = new Set<string>();

	for (const tag of metadata.tags ?? []) {
		if (tag.tag) tags.add(tag.tag);
	}

	for (const frontmatterTag of metadata.frontmatter?.tags ?? []) {
		if (typeof frontmatterTag === "string") tags.add(frontmatterTag.startsWith("#") ? frontmatterTag : `#${frontmatterTag}`);
	}

	return tags.size > 0 ? Array.from(tags) : null;
}
