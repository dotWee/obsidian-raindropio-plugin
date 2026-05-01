import { ItemView, MarkdownView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { RAINDROP_VIEW_TYPE } from "./constants";
import { RAINDROP_BRAND_ICON_ID } from "./icons";
import { buildNoteRaindropSearch } from "./note-search";
import { RaindropApi, type RaindropItem } from "./raindrop-api";
import { renderRaindropItems, renderRaindropStatus } from "./renderer";
import type RaindropViewPlugin from "./main";

export class RaindropSideView extends ItemView {
	private readonly plugin: RaindropViewPlugin;
	private resultsEl: HTMLElement | null = null;
	private searchInputEl: HTMLInputElement | null = null;
	private contextEl: HTMLElement | null = null;
	private loadMoreButtonEl: HTMLButtonElement | null = null;
	private inFlightRefresh: Promise<void> | null = null;
	private needsRefresh = false;
	private pendingForceRefresh = false;
	private lastFilePath: string | null = null;
	private lastFileMtime: number | null = null;
	private lastFileSize: number | null = null;
	private isFollowingNote = true;
	private query = "";
	private page = 0;
	private items: RaindropItem[] = [];

	constructor(leaf: WorkspaceLeaf, plugin: RaindropViewPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return RAINDROP_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Raindrop.io explorer";
	}

	getIcon(): string {
		return RAINDROP_BRAND_ICON_ID;
	}

	async onOpen(): Promise<void> {
		const root = this.containerEl.children[1];
		if (!(root instanceof HTMLElement)) return;

		root.empty();
		root.addClass("raindrop-side-view");

		const header = root.createDiv({ cls: "raindrop-side-header" });
		header.createEl("h3", { text: "Raindrop.io explorer" });
		const refreshButton = header.createEl("button", { text: "Refresh" });
		refreshButton.addEventListener("click", () => {
			void this.refresh(true);
		});

		const controls = root.createDiv({ cls: "raindrop-explorer-controls" });
		const searchForm = controls.createEl("form", { cls: "raindrop-explorer-search" });
		this.searchInputEl = searchForm.createEl("input", {
			attr: {
				placeholder: "Search, #tag, type:article...",
				type: "search",
			},
		});
		searchForm.createEl("button", { text: "Search", attr: { type: "submit" } });
		searchForm.addEventListener("submit", (event) => {
			event.preventDefault();
			this.isFollowingNote = false;
			this.setQuery(this.searchInputEl?.value.trim() ?? "");
			void this.loadResults(true);
		});

		const actions = controls.createDiv({ cls: "raindrop-explorer-actions" });
		const noteFilterButton = actions.createEl("button", { text: "Use note filter" });
		noteFilterButton.addEventListener("click", () => {
			this.isFollowingNote = true;
			void this.refresh(true);
		});
		const clearButton = actions.createEl("button", { text: "Browse all" });
		clearButton.addEventListener("click", () => {
			this.isFollowingNote = false;
			this.setQuery("");
			this.updateContext("Browsing the configured collection.");
			void this.loadResults(true);
		});

		this.contextEl = root.createDiv({ cls: "raindrop-explorer-context" });
		this.resultsEl = root.createDiv({ cls: "raindrop-side-content" });
		this.loadMoreButtonEl = root.createEl("button", {
			cls: "raindrop-load-more",
			text: "Load more",
		});
		this.loadMoreButtonEl.addEventListener("click", () => {
			void this.loadResults(false);
		});

		await this.refresh(true);
	}

	async refresh(force = false): Promise<void> {
		if (this.inFlightRefresh) {
			this.needsRefresh = true;
			this.pendingForceRefresh = this.pendingForceRefresh || force;
			return this.inFlightRefresh;
		}

		this.inFlightRefresh = this.runRefresh(force);
		try {
			await this.inFlightRefresh;
		} finally {
			this.inFlightRefresh = null;
			if (this.needsRefresh) {
				const nextForce = this.pendingForceRefresh;
				this.needsRefresh = false;
				this.pendingForceRefresh = false;
				void this.refresh(nextForce);
			}
		}
	}

	async applySearchQuery(query: string, context?: string): Promise<void> {
		this.isFollowingNote = false;
		this.setQuery(query);
		this.updateContext(context ?? (this.query ? "Filtering the configured collection." : "Browsing the configured collection."));
		await this.loadResults(true);
	}

	private async runRefresh(force = false): Promise<void> {
		if (!this.resultsEl) return;

		const file = this.getSourceFile();
		if (this.isFollowingNote) {
			const noteQueryChanged = await this.updateQueryFromNote(file, force);
			if (!noteQueryChanged && !force) return;
		}

		await this.loadResults(true);
	}

	private async updateQueryFromNote(file: TFile | null, force: boolean): Promise<boolean> {
		if (!file) {
			const changed = this.lastFilePath !== null || this.query !== "";
			this.lastFilePath = null;
			this.lastFileMtime = null;
			this.lastFileSize = null;
			this.setQuery("");
			this.updateContext("Browsing the configured collection. Open a markdown note to use it as a filter.");
			return force || changed;
		}

		const unchanged =
			!force &&
			this.lastFilePath === file.path &&
			this.lastFileMtime === file.stat.mtime &&
			this.lastFileSize === file.stat.size;
		if (unchanged) return false;

		try {
			const content = await this.app.vault.cachedRead(file);
			const noteSearch = buildNoteRaindropSearch(content, this.app.metadataCache.getFileCache(file));
			this.setQuery(noteSearch.query);
			this.lastFilePath = file.path;
			this.lastFileMtime = file.stat.mtime;
			this.lastFileSize = file.stat.size;

			if (this.query) {
				this.updateContext(
					`Filtering from ${file.basename}: ${noteSearch.tagCount} tags, ${noteSearch.urlCount} links.`,
				);
			} else {
				this.updateContext(`No tags or external links found in ${file.basename}. Browsing the configured collection.`);
			}

			return true;
		} catch (error) {
			const message = error instanceof Error ? error.message : "Could not read this note.";
			this.updateContext("Could not build a note filter.");
			if (this.resultsEl) renderRaindropStatus(this.resultsEl, message, "error");
			new Notice(message);
			return false;
		}
	}

	private async loadResults(reset: boolean): Promise<void> {
		if (!this.resultsEl) return;

		const api = new RaindropApi(this.plugin.settings.accessToken);
		if (!api.isConfigured) {
			renderRaindropStatus(this.resultsEl, "Add a Raindrop.io access token in plugin settings.", "info");
			this.updateLoadMore(false);
			return;
		}

		if (reset) {
			this.resetResults();
		} else {
			this.page += 1;
		}

		const perpage = Math.max(1, Math.min(50, this.plugin.settings.defaultLimit));
		renderRaindropStatus(this.resultsEl, reset ? "Loading Raindrop.io links..." : "Loading more Raindrop.io links...", "loading");

		try {
			const batch = await api.listRaindrops({
				collectionId: this.plugin.settings.defaultCollectionId,
				search: this.query || undefined,
				sort: this.plugin.settings.defaultSort || undefined,
				page: this.page,
				perpage,
			});

			this.items = reset ? batch : [...this.items, ...batch];
			renderRaindropItems(this.resultsEl, this.items, {
				title: this.query ? "Filtered Raindrop.io links" : "All Raindrop.io links",
				onTagClick: (tag) => {
					void this.plugin.handleRaindropTagClick(tag, this.getSourceFile()?.path);
				},
			});
			this.updateLoadMore(batch.length >= perpage);
		} catch (error) {
			if (!reset) this.page = Math.max(0, this.page - 1);
			const message = error instanceof Error ? error.message : "Could not load Raindrop.io links.";
			renderRaindropStatus(this.resultsEl, message, "error");
			this.updateLoadMore(false);
		}
	}

	private setQuery(query: string): void {
		this.query = query.trim();
		if (this.searchInputEl) this.searchInputEl.value = this.query;
	}

	private resetResults(): void {
		this.page = 0;
		this.items = [];
	}

	private updateContext(message: string): void {
		if (this.contextEl) this.contextEl.setText(message);
	}

	private updateLoadMore(show: boolean): void {
		if (!this.loadMoreButtonEl) return;
		this.loadMoreButtonEl.toggle(show);
	}

	private getSourceFile(): TFile | null {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (markdownView?.file) return markdownView.file;

		return this.plugin.activeMarkdownFile;
	}
}
