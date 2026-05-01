import type { CachedMetadata } from "obsidian";
import { buildNoteRaindropSearch } from "note-search";

describe("buildNoteRaindropSearch", () => {
	it("builds an OR query from note tags and urls", () => {
		const metadata: CachedMetadata = {
			tags: [{ tag: "#docs", position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 5, offset: 5 } } }],
		};
		const source = "See [the docs](https://example.com/docs?ref=\"plugin\").";

		expect(buildNoteRaindropSearch(source, metadata)).toEqual({
			query: '#docs "https://example.com/docs?ref=\\"plugin\\"" match:OR',
			urlCount: 1,
			tagCount: 1,
		});
	});

	it("returns an empty query for notes without references", () => {
		expect(buildNoteRaindropSearch("Nothing to search", null)).toEqual({
			query: "",
			urlCount: 0,
			tagCount: 0,
		});
	});
});
