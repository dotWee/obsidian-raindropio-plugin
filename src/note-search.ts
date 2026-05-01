import type { CachedMetadata } from "obsidian";
import { getNoteRaindropReferences } from "./note-parser";
import { formatRaindropTagFilter } from "./raindrop-search";

export interface NoteRaindropSearch {
	query: string;
	urlCount: number;
	tagCount: number;
}

function formatExactSearchTerm(value: string): string {
	return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function buildNoteRaindropSearch(source: string, metadata: CachedMetadata | null): NoteRaindropSearch {
	const references = getNoteRaindropReferences(source, metadata);
	const filters = [
		...references.tags.map(formatRaindropTagFilter).filter((filter): filter is string => Boolean(filter)),
		...references.urls.map(formatExactSearchTerm),
	];

	return {
		query: filters.length > 1 ? `${filters.join(" ")} match:OR` : (filters[0] ?? ""),
		urlCount: references.urls.length,
		tagCount: references.tags.length,
	};
}
