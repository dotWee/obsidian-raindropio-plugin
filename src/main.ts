import { MarkdownView, Notice, Plugin, TFile } from "obsidian";
import { parseRaindropBlock } from "./block-parser";
import { RAINDROP_CODE_BLOCK, RAINDROP_VIEW_TYPE } from "./constants";
import {
	RAINDROP_FAVICON_ICON_ID,
	registerRaindropIcons,
	unregisterRaindropIcons,
} from "./icons";
import { RaindropApi } from "./raindrop-api";
import { buildRaindropSearchQuery, formatRaindropTagFilter } from "./raindrop-search";
import { RaindropSideView } from "./raindrop-view";
import { DEFAULT_DISPLAY_FIELDS, renderRaindropItems, renderRaindropStatus, resolveRaindropDisplayFields } from "./renderer";
import { getAccessTokenSecret, setAccessTokenSecret } from "./secrets";
import { DEFAULT_SETTINGS, isRaindropTagClickBehavior, RaindropSettingTab, RaindropViewSettings } from "./settings";

interface PersistedRaindropViewSettings extends Partial<RaindropViewSettings> {
	accessToken?: string;
}

interface GlobalSearchPluginInstance {
	openGlobalSearch?: (query?: string) => void;
	setQuery?: (query: string) => void;
	setGlobalQuery?: (query: string) => void;
}

export default class RaindropViewPlugin extends Plugin {
	settings!: RaindropViewSettings;
	activeMarkdownFile: TFile | null = null;
	private refreshTimeoutId: number | null = null;
	private readonly refreshDebounceMs = 200;
	private collectionTitles: Map<number, string> | null = null;
	private collectionTitlesRequest: Promise<Map<number, string> | undefined> | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.captureActiveMarkdownFile();
		registerRaindropIcons();

		this.registerView(RAINDROP_VIEW_TYPE, (leaf) => new RaindropSideView(leaf, this));

		this.registerMarkdownCodeBlockProcessor(RAINDROP_CODE_BLOCK, async (source, el, ctx) => {
			await this.renderRaindropSource(source, el, undefined, ctx.sourcePath);
		});

		this.addRibbonIcon(RAINDROP_FAVICON_ICON_ID, "Open explorer", () => {
			void this.openRaindropView();
		});

		this.addCommand({
			id: "open-raindrop-view",
			name: "Open explorer",
			callback: () => {
				void this.openRaindropView();
			},
		});

		this.addCommand({
			id: "refresh-raindrop-view",
			name: "Refresh explorer",
			callback: () => {
				void this.refreshRaindropViews();
			},
		});

		this.addSettingTab(new RaindropSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				const didChange = this.captureActiveMarkdownFile();
				if (didChange) {
					this.scheduleRefreshRaindropViews();
				}
			}),
		);

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file === this.activeMarkdownFile) {
					this.scheduleRefreshRaindropViews();
				}
			}),
		);
	}

	onunload(): void {
		if (this.refreshTimeoutId !== null) {
			window.clearTimeout(this.refreshTimeoutId);
			this.refreshTimeoutId = null;
		}
		unregisterRaindropIcons();
	}

	async loadSettings(): Promise<void> {
		const loaded = (await this.loadData()) as PersistedRaindropViewSettings | null;
		const { accessToken: legacyAccessToken, ...persistedSettings } = loaded ?? {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, persistedSettings);
		this.settings.displayFields = { ...DEFAULT_DISPLAY_FIELDS, ...persistedSettings.displayFields };
		this.settings.defaultLimit = Math.max(1, Math.min(100, Math.floor(this.settings.defaultLimit)));
		if (!isRaindropTagClickBehavior(this.settings.tagClickBehavior)) {
			this.settings.tagClickBehavior = DEFAULT_SETTINGS.tagClickBehavior;
		}
		if (legacyAccessToken?.trim()) {
			this.settings.accessTokenSecretId = setAccessTokenSecret(this.app, legacyAccessToken);
			await this.saveSettings();
		}
	}

	async saveSettings(): Promise<void> {
		// The access token may have changed, so drop cached collection titles.
		this.collectionTitles = null;
		this.collectionTitlesRequest = null;
		await this.saveData(this.settings);
	}

	async getAccessToken(): Promise<string> {
		return getAccessTokenSecret(this.app, this.settings.accessTokenSecretId);
	}

	async getCollectionTitles(api: RaindropApi): Promise<Map<number, string> | undefined> {
		if (this.collectionTitles) return this.collectionTitles;

		this.collectionTitlesRequest ??= api
			.listCollections()
			.then((titles) => {
				this.collectionTitles = titles;
				return titles;
			})
			.catch(() => {
				// Collection titles are optional; results render without them.
				return undefined;
			})
			.finally(() => {
				this.collectionTitlesRequest = null;
			});

		return this.collectionTitlesRequest;
	}

	async openRaindropView(searchQuery?: string, context?: string): Promise<void> {
		this.captureActiveMarkdownFile();

		const existingLeaf = this.app.workspace.getLeavesOfType(RAINDROP_VIEW_TYPE)[0];
		const leaf = existingLeaf ?? this.app.workspace.getRightLeaf(false);
		if (!leaf) {
			new Notice("Could not open explorer.");
			return;
		}

		await leaf.setViewState({ type: RAINDROP_VIEW_TYPE, active: true });
		await this.app.workspace.revealLeaf(leaf);
		if (searchQuery !== undefined && leaf.view instanceof RaindropSideView) {
			await leaf.view.applySearchQuery(searchQuery, context);
			return;
		}

		await this.refreshRaindropViews(true);
	}

	async refreshRaindropViews(force = false): Promise<void> {
		const refreshes = this.app.workspace
			.getLeavesOfType(RAINDROP_VIEW_TYPE)
			.map((leaf) => leaf.view)
			.filter((view): view is RaindropSideView => view instanceof RaindropSideView)
			.map((view) => view.refresh(force));

		await Promise.all(refreshes);
	}

	async renderRaindropSource(source: string, container: HTMLElement, title?: string, sourcePath?: string): Promise<void> {
		renderRaindropStatus(container, "Loading Raindrop.io links...", "loading");

		try {
			const parsed = parseRaindropBlock(source);
			const api = new RaindropApi(await this.getAccessToken());
			if (!api.isConfigured) {
				renderRaindropStatus(container, "Add a Raindrop.io access token under Access token in plugin settings.", "info");
				return;
			}

			const fields = resolveRaindropDisplayFields(
				this.settings.displayFields ?? DEFAULT_DISPLAY_FIELDS,
				parsed.options.showFields,
				parsed.options.hideFields,
			);

			const limit = parsed.options.limit ?? this.settings.defaultLimit;
			const items = await api.listRaindrops({
				collectionId: parsed.options.collectionId ?? this.settings.defaultCollectionId,
				search: buildRaindropSearchQuery({
					search: parsed.options.search,
					tags: parsed.options.tag ? [parsed.options.tag] : [],
				}),
				sort: (parsed.options.sort ?? this.settings.defaultSort) || undefined,
				perpage: limit,
			});

			const collectionTitles = fields.collection ? await this.getCollectionTitles(api) : undefined;

			renderRaindropItems(container, items, {
				title,
				warnings: parsed.warnings,
				fields,
				collectionTitles,
				onTagClick: (tag) => {
					void this.handleRaindropTagClick(tag, sourcePath);
				},
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "Could not load Raindrop.io links.";
			renderRaindropStatus(container, message, "error");
		}
	}

	private captureActiveMarkdownFile(): boolean {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const nextFile = markdownView?.file;
		if (!nextFile) return false;

		const currentPath = this.activeMarkdownFile?.path ?? "";
		const nextPath = nextFile.path;
		this.activeMarkdownFile = nextFile;
		return currentPath !== nextPath;
	}

	private scheduleRefreshRaindropViews(): void {
		if (this.refreshTimeoutId !== null) {
			window.clearTimeout(this.refreshTimeoutId);
		}

		this.refreshTimeoutId = window.setTimeout(() => {
			this.refreshTimeoutId = null;
			void this.refreshRaindropViews();
		}, this.refreshDebounceMs);
	}

	async handleRaindropTagClick(tag: string, sourcePath?: string): Promise<void> {
		switch (this.settings.tagClickBehavior) {
			case "obsidian-search":
				await this.openObsidianTag(tag, sourcePath);
				return;
			case "raindrop-search": {
				const tagFilter = formatRaindropTagFilter(tag);
				if (!tagFilter) return;
				await this.openRaindropView(tagFilter, `Filtering Raindrop.io by ${tagFilter}.`);
				return;
			}
			case "none":
				return;
		}
	}

	async openObsidianTag(tag: string, sourcePath?: string): Promise<void> {
		const normalized = tag.replace(/^#/, "").trim();
		if (!normalized) return;

		const searchQuery = `tag:#${normalized}`;
		const appWithInternals = this.app as typeof this.app & {
			internalPlugins?: {
				plugins?: Record<string, { instance?: unknown }>;
			};
		};
		const globalSearch = appWithInternals.internalPlugins?.plugins?.["global-search"]?.instance as
			| GlobalSearchPluginInstance
			| undefined;

		// Prefer native global search behavior for tag clicks from any view.
		if (globalSearch?.openGlobalSearch) {
			globalSearch.openGlobalSearch(searchQuery);
			return;
		}
		if (globalSearch?.setGlobalQuery) {
			globalSearch.setGlobalQuery(searchQuery);
			return;
		}
		if (globalSearch?.setQuery) {
			globalSearch.setQuery(searchQuery);
			return;
		}

		await this.app.workspace.openLinkText(`#${normalized}`, sourcePath ?? this.activeMarkdownFile?.path ?? "", false);
	}
}
