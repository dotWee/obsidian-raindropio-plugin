import { App, PluginSettingTab, Setting } from "obsidian";
import type RaindropViewPlugin from "./main";

export type RaindropTagClickBehavior = "obsidian-search" | "raindrop-search" | "none";

const TAG_CLICK_BEHAVIORS = new Set<RaindropTagClickBehavior>(["obsidian-search", "raindrop-search", "none"]);

export interface RaindropViewSettings {
	accessToken: string;
	defaultCollectionId: number;
	defaultLimit: number;
	defaultSort: string;
	tagClickBehavior: RaindropTagClickBehavior;
}

export const DEFAULT_SETTINGS: RaindropViewSettings = {
	accessToken: "",
	defaultCollectionId: 0,
	defaultLimit: 20,
	defaultSort: "-created",
	tagClickBehavior: "obsidian-search",
};

export function isRaindropTagClickBehavior(value: unknown): value is RaindropTagClickBehavior {
	return typeof value === "string" && TAG_CLICK_BEHAVIORS.has(value as RaindropTagClickBehavior);
}

function parseNumberSetting(value: string, fallback: number): number {
	const parsed = Number(value.trim());
	return Number.isFinite(parsed) ? parsed : fallback;
}

export class RaindropSettingTab extends PluginSettingTab {
	plugin: RaindropViewPlugin;

	constructor(app: App, plugin: RaindropViewPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Authentication").setHeading();

		new Setting(containerEl)
			.setName("Access token")
			.setDesc("Stored in plugin data and sent only when requesting bookmarks.")
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder("Access token")
					.setValue(this.plugin.settings.accessToken)
					.onChange(async (value) => {
						this.plugin.settings.accessToken = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Default collection")
			.setDesc("Used when a note block does not set `collection`. Use 0 for all collections.")
			.addText((text) =>
				text
					.setPlaceholder("0")
					.setValue(String(this.plugin.settings.defaultCollectionId))
					.onChange(async (value) => {
						this.plugin.settings.defaultCollectionId = parseNumberSetting(value, DEFAULT_SETTINGS.defaultCollectionId);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Default limit")
			.setDesc("Maximum links to request when a note block does not set `limit`.")
			.addText((text) =>
				text
					.setPlaceholder("20")
					.setValue(String(this.plugin.settings.defaultLimit))
					.onChange(async (value) => {
						const parsed = parseNumberSetting(value, DEFAULT_SETTINGS.defaultLimit);
						this.plugin.settings.defaultLimit = Math.max(1, Math.min(100, Math.floor(parsed)));
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Default sort")
			.setDesc("Passed through to Raindrop.io when a note block does not set `sort`.")
			.addText((text) =>
				text
					.setPlaceholder("-created")
					.setValue(this.plugin.settings.defaultSort)
					.onChange(async (value) => {
						this.plugin.settings.defaultSort = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Tag action")
			.setDesc("Choose whether item tags search notes, filter the explorer, or do nothing.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("obsidian-search", "Search notes for the tag")
					.addOption("raindrop-search", "Filter explorer by the tag")
					.addOption("none", "Do nothing")
					.setValue(this.plugin.settings.tagClickBehavior)
					.onChange(async (value) => {
						if (isRaindropTagClickBehavior(value)) {
							this.plugin.settings.tagClickBehavior = value;
						}
						await this.plugin.saveSettings();
					}),
			);
	}
}
