import { extractFirstRaindropBlock, parseRaindropBlock } from "block-parser";

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
