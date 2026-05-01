import { buildRaindropSearchQuery, buildRaindropTagSearch, formatRaindropTagFilter } from "raindrop-search";

describe("formatRaindropTagFilter", () => {
	it("formats simple tags without quotes", () => {
		expect(formatRaindropTagFilter("#project/docs")).toBe("#project/docs");
		expect(formatRaindropTagFilter("read_later")).toBe("#read_later");
	});

	it("quotes tags containing spaces or special characters", () => {
		expect(formatRaindropTagFilter("read later")).toBe('#"read later"');
		expect(formatRaindropTagFilter('work "important"')).toBe('#"work \\"important\\""');
	});

	it("returns null for empty tags", () => {
		expect(formatRaindropTagFilter("  #  ")).toBeNull();
	});
});

describe("buildRaindropTagSearch", () => {
	it("joins tags with implicit AND by default", () => {
		expect(buildRaindropTagSearch(["docs", "obsidian"], false)).toBe("#docs #obsidian");
	});

	it("adds match:OR when matching any tag", () => {
		expect(buildRaindropTagSearch(["docs", "obsidian"], true)).toBe("#docs #obsidian match:OR");
	});

	it("returns undefined when no valid tags are provided", () => {
		expect(buildRaindropTagSearch(["", "  "], true)).toBeUndefined();
	});
});

describe("buildRaindropSearchQuery", () => {
	it("combines tag filters and free-text search", () => {
		expect(
			buildRaindropSearchQuery({
				tags: ["docs", "read later"],
				search: "obsidian plugin",
			}),
		).toBe('#docs #"read later" obsidian plugin');
	});

	it("trims empty query parts", () => {
		expect(buildRaindropSearchQuery({ search: "   ", tags: [] })).toBeUndefined();
	});
});
