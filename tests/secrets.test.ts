import RaindropViewPlugin from "../src/main";
import { DEFAULT_DISPLAY_FIELDS } from "../src/renderer";
import { RAINDROP_ACCESS_TOKEN_SECRET_ID } from "../src/secrets";
import { DEFAULT_SETTINGS, type RaindropViewSettings } from "../src/settings";

interface SecretStorageMock {
	getSecret: jest.Mock<string | null, [string]>;
	setSecret: jest.Mock<void, [string, string]>;
}

interface TestPlugin extends RaindropViewPlugin {
	app: RaindropViewPlugin["app"] & { secretStorage: SecretStorageMock };
	loadData: jest.Mock<Promise<unknown>, []>;
	saveData: jest.Mock<Promise<void>, [unknown]>;
}

function createSecretStorage(secrets: Record<string, string> = {}): SecretStorageMock {
	return {
		getSecret: jest.fn((id: string) => secrets[id] ?? null),
		setSecret: jest.fn((id: string, value: string) => {
			secrets[id] = value;
		}),
	};
}

function createPlugin(loadedSettings: unknown, secretStorage = createSecretStorage()): TestPlugin {
	const plugin = Object.create(RaindropViewPlugin.prototype) as TestPlugin;
	plugin.app = { secretStorage } as TestPlugin["app"];
	plugin.loadData = jest.fn(async () => loadedSettings);
	plugin.saveData = jest.fn(async (_data: unknown) => undefined);
	return plugin;
}

describe("Raindrop.io secret storage", () => {
	it("loads the access token from the configured Obsidian secret", async () => {
		const plugin = createPlugin(null, createSecretStorage({ "shared-raindrop-token": "  stored-token  " }));
		plugin.settings = { ...DEFAULT_SETTINGS, accessTokenSecretId: "shared-raindrop-token" };

		await expect(plugin.getAccessToken()).resolves.toBe("stored-token");
		expect(plugin.app.secretStorage.getSecret).toHaveBeenCalledWith("shared-raindrop-token");
	});

	it("migrates a legacy token into Obsidian secret storage", async () => {
		const plugin = createPlugin({
			accessToken: " legacy-token ",
			defaultCollectionId: 42,
			defaultLimit: 250,
			defaultSort: "-title",
			tagClickBehavior: "raindrop-search",
			displayFields: { collection: true },
		});

		await plugin.loadSettings();

		expect(plugin.app.secretStorage.setSecret).toHaveBeenCalledWith(RAINDROP_ACCESS_TOKEN_SECRET_ID, "legacy-token");
		expect(plugin.settings).toEqual<RaindropViewSettings>({
			...DEFAULT_SETTINGS,
			accessTokenSecretId: RAINDROP_ACCESS_TOKEN_SECRET_ID,
			defaultCollectionId: 42,
			defaultLimit: 100,
			defaultSort: "-title",
			tagClickBehavior: "raindrop-search",
			displayFields: { ...DEFAULT_DISPLAY_FIELDS, collection: true },
		});
		expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings);
		expect(plugin.saveData.mock.calls[0]?.[0]).not.toHaveProperty("accessToken");
	});
});
