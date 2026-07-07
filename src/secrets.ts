import type { App } from "obsidian";
import * as Obsidian from "obsidian";

export const RAINDROP_ACCESS_TOKEN_SECRET_ID = "raindrop-io-access-token";

export interface SecretStorageLike {
	getSecret(id: string): string | null;
	setSecret(id: string, value: string): void;
}

export type AppWithSecretStorage = App & {
	secretStorage?: SecretStorageLike;
};

export interface SecretComponentLike {
	setValue(value: string): this;
	onChange(callback: (value: string) => unknown): this;
}

type SecretComponentConstructor = new (app: App, containerEl: HTMLElement) => SecretComponentLike;

export function getSecretComponentConstructor(): SecretComponentConstructor | undefined {
	return (Obsidian as typeof Obsidian & { SecretComponent?: SecretComponentConstructor }).SecretComponent;
}

export function getAccessTokenSecret(app: App, secretId: string): string {
	const trimmedId = secretId.trim();
	if (!trimmedId) return "";

	return ((app as AppWithSecretStorage).secretStorage?.getSecret(trimmedId) ?? "").trim();
}

export function setAccessTokenSecret(app: App, accessToken: string): string {
	const trimmedToken = accessToken.trim();
	if (!trimmedToken) return "";

	(app as AppWithSecretStorage).secretStorage?.setSecret(RAINDROP_ACCESS_TOKEN_SECRET_ID, trimmedToken);
	return RAINDROP_ACCESS_TOKEN_SECRET_ID;
}
