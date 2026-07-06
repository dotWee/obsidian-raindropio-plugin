module.exports = {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	moduleNameMapper: {
		"^obsidian$": "<rootDir>/tests/__mocks__/obsidian.ts",
	},
};
