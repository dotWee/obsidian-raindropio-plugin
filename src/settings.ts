import { App, PluginSettingTab, Setting } from "obsidian";
import type { SettingControl, SettingDefinition, SettingDefinitionItem, SettingGroup } from "obsidian";
import { DEFAULT_DISPLAY_FIELDS, type RaindropDisplayFields } from "./renderer";
import { getSecretComponentConstructor } from "./secrets";
import type RaindropViewPlugin from "./main";

export type RaindropTagClickBehavior = "obsidian-search" | "raindrop-search" | "none";

const TAG_CLICK_BEHAVIORS = new Set<RaindropTagClickBehavior>(["obsidian-search", "raindrop-search", "none"]);

export interface RaindropViewSettings {
	accessTokenSecretId: string;
	defaultCollectionId: number;
	defaultLimit: number;
	defaultSort: string;
	tagClickBehavior: RaindropTagClickBehavior;
	displayFields: RaindropDisplayFields;
}

export const DEFAULT_SETTINGS: RaindropViewSettings = {
	accessTokenSecretId: "",
	defaultCollectionId: 0,
	defaultLimit: 20,
	defaultSort: "-created",
	tagClickBehavior: "obsidian-search",
	displayFields: { ...DEFAULT_DISPLAY_FIELDS },
};

const DISPLAY_FIELD_SETTINGS: { field: keyof RaindropDisplayFields; name: string; desc: string }[] = [
	{ field: "cover", name: "Show cover", desc: "Show the bookmark cover image on each result." },
	{ field: "domain", name: "Show domain", desc: "Show the bookmark domain on each result." },
	{ field: "created", name: "Show created date", desc: "Show the date the bookmark was saved." },
	{ field: "excerpt", name: "Show excerpt", desc: "Show the bookmark description on each result." },
	{ field: "tags", name: "Show tags", desc: "Show bookmark tags on each result." },
	{ field: "collection", name: "Show collection", desc: "Show the collection a bookmark belongs to. Fetches the collection list from Raindrop.io when enabled." },
];

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
						desc: "Select or create an Obsidian secret containing your Raindrop.io access token.",
						render: (setting) => {
							const SecretComponent = getSecretComponentConstructor();
							if (!SecretComponent) {
								setting.setDesc("Requires Obsidian 1.11.4 or newer to store secrets.");
								return;
							}

							const component = new SecretComponent(this.app, setting.controlEl)
								.setValue(this.plugin.settings.accessTokenSecretId)
								.onChange(async (value) => {
									this.plugin.settings.accessTokenSecretId = value.trim();
									await this.plugin.saveSettings();
									await this.plugin.refreshRaindropViews(true);
								});
							setting.components.push(component as unknown as (typeof setting.components)[number]);
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
				type: "group",
				heading: "Result display",
				items: DISPLAY_FIELD_SETTINGS.map(({ field, name, desc }) => ({
					name,
					desc: `${desc} Applies to the explorer and is the default for note blocks.`,
					render: (setting) => {
						setting.addToggle((toggle) => {
							toggle.setValue(this.plugin.settings.displayFields[field]).onChange(async (value) => {
								this.plugin.settings.displayFields[field] = value;
								await this.plugin.saveSettings();
								await this.plugin.refreshRaindropViews(true);
							});
						});
					},
				})),
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

	// Implemented without super calls so the tab also works on Obsidian
	// versions before 1.13.0, where the SettingTab base class does not
	// provide getControlValue/setControlValue.
	getControlValue(key: string): unknown {
		return (this.plugin.settings as unknown as Record<string, unknown>)[key];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === "tagClickBehavior" && !isRaindropTagClickBehavior(value)) return;
		const normalized = typeof value === "string" ? value.trim() : value;
		(this.plugin.settings as unknown as Record<string, unknown>)[key] = normalized;
		await this.plugin.saveSettings();
	}

	/**
	 * Fallback for Obsidian versions before 1.13.0, which do not call
	 * getSettingDefinitions(). Renders the same definitions imperatively.
	 * On 1.13.0+ this method is never called because getSettingDefinitions()
	 * returns a non-empty array.
	 */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.renderDefinitionItems(this.getSettingDefinitions(), containerEl);
	}

	private renderDefinitionItems(items: SettingDefinitionItem[], containerEl: HTMLElement): void {
		for (const item of items) {
			if ("type" in item && (item.type === "group" || item.type === "list")) {
				if (item.heading) {
					new Setting(containerEl).setName(item.heading).setHeading();
				}
				this.renderDefinitionItems(item.items ?? [], containerEl);
				continue;
			}
			if ("type" in item && item.type === "page") continue;
			this.renderDefinition(item as SettingDefinition, containerEl);
		}
	}

	private renderDefinition(def: SettingDefinition, containerEl: HTMLElement): void {
		const setting = new Setting(containerEl).setName(def.name);
		if (def.desc) setting.setDesc(def.desc);
		if (def.render) {
			// Our render callbacks only use the Setting instance; SettingGroup
			// does not exist at runtime before 1.13.0.
			def.render(setting, undefined as unknown as SettingGroup);
			return;
		}
		if (def.control) this.renderControl(setting, def.control);
	}

	private renderControl(setting: Setting, control: SettingControl): void {
		const rawValue = this.getControlValue(control.key) ?? control.defaultValue;
		const currentValue =
			typeof rawValue === "string" || typeof rawValue === "number" || typeof rawValue === "boolean"
				? rawValue
				: undefined;
		switch (control.type) {
			case "text":
				setting.addText((text) => {
					if (control.placeholder) text.setPlaceholder(control.placeholder);
					text.setValue(currentValue === undefined ? "" : String(currentValue)).onChange(async (value) => {
						if (control.validate && (await control.validate(value))) return;
						await this.setControlValue(control.key, value);
					});
				});
				break;
			case "number":
				setting.addText((text) => {
					text.inputEl.type = "number";
					if (control.min !== undefined) text.inputEl.min = String(control.min);
					if (control.max !== undefined) text.inputEl.max = String(control.max);
					if (control.step !== undefined) text.inputEl.step = String(control.step);
					if (control.placeholder) text.setPlaceholder(control.placeholder);
					text.setValue(currentValue === undefined ? "" : String(currentValue)).onChange(async (value) => {
						const parsed = Number(value);
						if (!Number.isFinite(parsed)) return;
						if (control.validate && (await control.validate(parsed))) return;
						await this.setControlValue(control.key, parsed);
					});
				});
				break;
			case "dropdown":
				setting.addDropdown((dropdown) => {
					dropdown.addOptions(control.options);
					dropdown.setValue(currentValue === undefined ? "" : String(currentValue)).onChange(async (value) => {
						await this.setControlValue(control.key, value);
					});
				});
				break;
			case "toggle":
				setting.addToggle((toggle) => {
					toggle.setValue(Boolean(currentValue)).onChange(async (value) => {
						await this.setControlValue(control.key, value);
					});
				});
				break;
			default:
				break;
		}
	}
}
