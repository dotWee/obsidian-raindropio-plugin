import type { CachedMetadata } from "obsidian";
import { getNoteRaindropReferences, getUrlKey } from "note-parser";

describe("getNoteRaindropReferences", () => {
	it("extracts unique tags and urls from a note", () => {
		const metadata: CachedMetadata = {
			tags: [{ tag: "#research", position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 9, offset: 9 } } }],
			frontmatter: {
				tags: ["saved", "#research"],
			},
		};
		const source = [
			"[Obsidian](https://obsidian.md/)",
			"https://raindrop.io/library,",
			"https://obsidian.md/",
		].join("\n");

		expect(getNoteRaindropReferences(source, metadata)).toEqual({
			tags: ["research", "saved"],
			urls: ["https://obsidian.md/", "https://raindrop.io/library"],
		});
	});

	it("handles notes without metadata", () => {
		expect(getNoteRaindropReferences("No links here", null)).toEqual({
			tags: [],
			urls: [],
		});
	});
});

describe("getUrlKey", () => {
	it("normalizes equivalent urls for comparison", () => {
		expect(getUrlKey("https://Example.com/path/#section")).toBe("https://example.com/path");
		expect(getUrlKey("https://example.com/path/")).toBe("https://example.com/path");
	});

	it("falls back to lower-cased text for invalid urls", () => {
		expect(getUrlKey("Example/Path/")).toBe("example/path");
	});
});
