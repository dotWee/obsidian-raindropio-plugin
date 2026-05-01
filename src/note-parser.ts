import { CachedMetadata, getAllTags } from "obsidian";

export interface NoteRaindropReferences {
	tags: string[];
	urls: string[];
}

function unique(values: string[]): string[] {
	return Array.from(new Set(values));
}

function normalizeUrl(value: string): string {
	return value.replace(/[),.;:!?]+$/g, "");
}

export function getNoteRaindropReferences(source: string, metadata: CachedMetadata | null): NoteRaindropReferences {
	const markdownLinkUrls = Array.from(source.matchAll(/\[[^\]]*]\((https?:\/\/[^\s)]+)(?:\s+["'][^"']*["'])?\)/g)).map(
		(match) => normalizeUrl(match[1] ?? ""),
	);

	const bareUrls = Array.from(source.matchAll(/\bhttps?:\/\/[^\s<>)]+/g)).map((match) => normalizeUrl(match[0]));

	const tags = unique(
		(metadata ? getAllTags(metadata) ?? [] : [])
			.map((tag) => tag.replace(/^#/, "").trim())
			.filter(Boolean),
	);

	return {
		tags,
		urls: unique([...markdownLinkUrls, ...bareUrls].filter(Boolean)),
	};
}

export function getUrlKey(value: string): string {
	try {
		const url = new URL(value);
		url.hash = "";
		return url.toString().replace(/\/$/, "").toLowerCase();
	} catch {
		return value.replace(/\/$/, "").toLowerCase();
	}
}
