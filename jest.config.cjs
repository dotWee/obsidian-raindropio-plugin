module.exports = {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	moduleDirectories: ["node_modules", "src"],
	moduleNameMapper: {
		"^obsidian$": "<rootDir>/tests/__mocks__/obsidian.ts",
	},
};
