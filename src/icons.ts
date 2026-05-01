import { addIcon, removeIcon } from "obsidian";

export const RAINDROP_BRAND_ICON_ID = "raindropio-brand";
export const RAINDROP_FAVICON_ICON_ID = "raindropio-favicon";

const RAINDROP_BRAND_ICON_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><g fill="currentColor" fill-rule="evenodd"><path d="M35.314 9.686c6.248 6.249 6.248 16.38 0 22.628q-.314.313-.64.605L24 43 13.326 32.92q-.326-.293-.64-.606c-6.248-6.249-6.248-16.38 0-22.628s16.38-6.248 22.628 0"/><path d="M12 19c6.627 0 12 5.373 12 12v12H12C5.373 43 0 37.627 0 31s5.373-12 12-12" opacity=".85"/><path d="M24 43V31l.004-.305C24.166 24.209 29.474 19 36 19c6.627 0 12 5.373 12 12s-5.373 12-12 12z" opacity=".7"/></g></svg>';

const RAINDROP_FAVICON_ICON_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><g fill="currentColor" fill-rule="evenodd"><path d="M35.314 9.686c6.248 6.249 6.248 16.38 0 22.628q-.314.313-.64.605L24 43 13.326 32.92q-.326-.293-.64-.606c-6.248-6.249-6.248-16.38 0-22.628s16.38-6.248 22.628 0"/><path d="M12 19c6.627 0 12 5.373 12 12v12H12C5.373 43 0 37.627 0 31s5.373-12 12-12" opacity=".8"/><path d="M24 43V31l.004-.305C24.166 24.209 29.474 19 36 19c6.627 0 12 5.373 12 12s-5.373 12-12 12z" opacity=".55"/></g></svg>';

export function registerRaindropIcons(): void {
	addIcon(RAINDROP_BRAND_ICON_ID, RAINDROP_BRAND_ICON_SVG);
	addIcon(RAINDROP_FAVICON_ICON_ID, RAINDROP_FAVICON_ICON_SVG);
}

export function unregisterRaindropIcons(): void {
	removeIcon(RAINDROP_BRAND_ICON_ID);
	removeIcon(RAINDROP_FAVICON_ICON_ID);
}
