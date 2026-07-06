import { App, PluginSettingTab } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
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

export class RaindropSettingTab extends PluginSettingTab {
	plugin: RaindropViewPlugin;

	constructor(app: App, plugin: RaindropViewPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: "group",
				heading: "Authentication",
				items: [
					{
						name: "Access token",
						desc: "Stored in plugin data and sent only to the Raindrop.io API.",
						render: (setting) => {
							setting.addText((text) => {
								text.inputEl.type = "password";
								text
									.setPlaceholder("Access token")
									.setValue(this.plugin.settings.accessToken)
									.onChange(async (value) => {
										this.plugin.settings.accessToken = value.trim();
										await this.plugin.saveSettings();
									});
							});
						},
					},
				],
			},
			{
				name: "Default collection",
				desc: "Used when a note block does not set `collection`. Use 0 for all collections.",
				control: {
					type: "number",
					key: "defaultCollectionId",
					defaultValue: DEFAULT_SETTINGS.defaultCollectionId,
					placeholder: "0",
					min: 0,
					step: 1,
					validate: (value) => {
						if (!Number.isInteger(value) || value < 0) {
							return "Enter a collection ID of 0 or greater.";
						}
						return undefined;
					},
				},
			},
			{
				name: "Default limit",
				desc: "Maximum links to request when a note block does not set `limit`.",
				control: {
					type: "number",
					key: "defaultLimit",
					defaultValue: DEFAULT_SETTINGS.defaultLimit,
					placeholder: "20",
					min: 1,
					max: 100,
					step: 1,
					validate: (value) => {
						if (!Number.isInteger(value) || value < 1 || value > 100) {
							return "Enter a whole number between 1 and 100.";
						}
						return undefined;
					},
				},
			},
			{
				name: "Default sort",
				desc: "Passed through to Raindrop.io when a note block does not set `sort`.",
				control: {
					type: "text",
					key: "defaultSort",
					defaultValue: DEFAULT_SETTINGS.defaultSort,
					placeholder: "-created",
				},
			},
			{
				name: "Tag click behavior",
				desc: "Choose whether item tags search notes, filter the explorer, or do nothing.",
				control: {
					type: "dropdown",
					key: "tagClickBehavior",
					defaultValue: DEFAULT_SETTINGS.tagClickBehavior,
					options: {
						"obsidian-search": "Search notes for the tag",
						"raindrop-search": "Filter explorer by the tag",
						none: "Do nothing",
					},
				},
			},
		];
	}

	setControlValue(key: string, value: unknown): void | Promise<void> {
		if (key === "tagClickBehavior" && !isRaindropTagClickBehavior(value)) return;
		return super.setControlValue(key, typeof value === "string" ? value.trim() : value);
	}

}
