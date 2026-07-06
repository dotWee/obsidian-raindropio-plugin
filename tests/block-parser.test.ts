import { extractFirstRaindropBlock, parseRaindropBlock } from "../src/block-parser";
import { DEFAULT_DISPLAY_FIELDS, resolveRaindropDisplayFields } from "../src/renderer";

describe("parseRaindropBlock", () => {
	it("parses supported key-value options", () => {
		const parsed = parseRaindropBlock(`
			# Favorite references
			collection: 42
			search: obsidian plugin
			tag: read later
			sort: -created
			limit: 25
		`);

		expect(parsed).toEqual({
			options: {
				collectionId: 42,
				search: "obsidian plugin",
				tag: "read later",
				sort: "-created",
				limit: 25,
			},
			warnings: [],
		});
	});

	it("ignores invalid collections and warns", () => {
		const parsed = parseRaindropBlock("collection: -1");

		expect(parsed.options.collectionId).toBeUndefined();
		expect(parsed.warnings).toEqual(["Invalid `collection`; using the default collection."]);
	});

	it("clamps valid numeric limits", () => {
		expect(parseRaindropBlock("limit: 250").options.limit).toBe(100);
		expect(parseRaindropBlock("limit: 0").options.limit).toBe(1);
	});

	it("warns and falls back when the limit is not numeric", () => {
		const parsed = parseRaindropBlock("limit: many");

		expect(parsed.options.limit).toBe(1);
		expect(parsed.warnings).toEqual(["Invalid `limit`; using the plugin default."]);
	});

	it("parses show and hide field lists", () => {
		const parsed = parseRaindropBlock(`
			show: collection, cover
			hide: excerpt, tags
		`);

		expect(parsed.options.showFields).toEqual(["collection", "cover"]);
		expect(parsed.options.hideFields).toEqual(["excerpt", "tags"]);
		expect(parsed.warnings).toEqual([]);
	});

	it("normalizes casing and duplicates in field lists", () => {
		const parsed = parseRaindropBlock("show: Cover, cover, ,DOMAIN");

		expect(parsed.options.showFields).toEqual(["cover", "domain"]);
		expect(parsed.warnings).toEqual([]);
	});

	it("warns about unknown field names and keeps valid ones", () => {
		const parsed = parseRaindropBlock("hide: excerpt, banana");

		expect(parsed.options.hideFields).toEqual(["excerpt"]);
		expect(parsed.warnings).toEqual([
			"Unknown field `banana` in `hide`; expected one of cover, domain, created, excerpt, tags, collection.",
		]);
	});

	it("omits field lists when no valid names remain", () => {
		const parsed = parseRaindropBlock("show: banana");

		expect(parsed.options.showFields).toBeUndefined();
		expect(parsed.warnings).toHaveLength(1);
	});
});

describe("resolveRaindropDisplayFields", () => {
	it("returns the defaults when no overrides are given", () => {
		expect(resolveRaindropDisplayFields(DEFAULT_DISPLAY_FIELDS)).toEqual(DEFAULT_DISPLAY_FIELDS);
	});

	it("layers show and hide on top of the defaults", () => {
		const fields = resolveRaindropDisplayFields(DEFAULT_DISPLAY_FIELDS, ["collection", "cover"], ["excerpt", "tags"]);

		expect(fields).toEqual({
			cover: true,
			domain: true,
			created: true,
			excerpt: false,
			tags: false,
			collection: true,
		});
	});

	it("applies hide after show and does not mutate the defaults", () => {
		const defaults = { ...DEFAULT_DISPLAY_FIELDS };
		const fields = resolveRaindropDisplayFields(defaults, ["excerpt"], ["excerpt"]);

		expect(fields.excerpt).toBe(false);
		expect(defaults).toEqual(DEFAULT_DISPLAY_FIELDS);
	});
});

describe("extractFirstRaindropBlock", () => {
	it("returns the first raindrop code block body", () => {
		const block = extractFirstRaindropBlock(`
Before

\`\`\`raindrop
tag: docs
\`\`\`

\`\`\`raindrop
tag: later
\`\`\`
		`);

		expect(block).toBe("tag: docs\n");
	});

	it("returns null when no raindrop block exists", () => {
		expect(extractFirstRaindropBlock("```ts\nconsole.log('nope');\n```")).toBeNull();
	});
});
