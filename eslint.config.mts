import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores, defineConfig } from "eslint/config";

export default defineConfig(
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"eslint.config.mts",
		"jest.config.cjs",
		"package.json",
		"package-lock.json",
		"pnpm-lock.yaml",
		"version-bump.mjs",
		"versions.json",
		"tsconfig.json",
		"main.js",
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mts', 'manifest.json'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	{
		files: ["tests/**/*.ts"],
		languageOptions: {
			globals: {
				...globals.jest,
			},
		},
	},
	...obsidianmd.configs.recommended,
);
