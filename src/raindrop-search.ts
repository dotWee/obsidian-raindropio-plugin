const SIMPLE_TAG_PATTERN = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/;

function escapeQuotedValue(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function formatRaindropTagFilter(tag: string): string | null {
	const normalized = tag.trim().replace(/^#/, "");
	if (!normalized) return null;

	if (SIMPLE_TAG_PATTERN.test(normalized)) {
		return `#${normalized}`;
	}

	return `#"${escapeQuotedValue(normalized)}"`;
}

export function buildRaindropTagSearch(tags: string[], matchAny: boolean): string | undefined {
	const filters = tags.map(formatRaindropTagFilter).filter((filter): filter is string => Boolean(filter));
	if (filters.length === 0) return undefined;

	if (matchAny && filters.length > 1) {
		return `${filters.join(" ")} match:OR`;
	}

	return filters.join(" ");
}

export function buildRaindropSearchQuery({
	search,
	tags,
	matchAnyTags = false,
}: {
	search?: string;
	tags?: string[];
	matchAnyTags?: boolean;
}): string | undefined {
	const parts = [buildRaindropTagSearch(tags ?? [], matchAnyTags), search?.trim()].filter(
		(part): part is string => Boolean(part),
	);

	return parts.length > 0 ? parts.join(" ") : undefined;
}
