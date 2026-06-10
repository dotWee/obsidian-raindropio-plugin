import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

type EslintConfig = Parameters<typeof tseslint.config>[number];

const obsidianRecommendedConfigList = [
	...((obsidianmd.configs?.recommended ?? []) as Iterable<EslintConfig>),
];

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.js',
						'manifest.json'
					]
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
	...obsidianRecommendedConfigList,
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
		"main.js",
	]),
);
