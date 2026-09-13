import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
	{
		ignores: [
			"node_modules/**",
			"dist/**",
			"coverage/**",
			"tmp/**",
			"trash/**",
			"**/package-lock.json",
			"*.min.*",
			// Test fixtures are deliberately-non-JS data files that happen to
			// carry a .js extension (wisp's own fallback-loading tests exercise
			// exactly this "not really parseable as a module" case) -- they're
			// test data, not source, and were never meant to be linted as JS.
			"test/fixtures/**"
		]
	},
	{
		files: ["**/*.{js,mjs,cjs}"],
		plugins: { js },
		extends: ["js/recommended"],
		rules: {
			"no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^(_|___.*)$",
					caughtErrorsIgnorePattern: "^(_|___.*)$",
					destructuredArrayIgnorePattern: "^(_|___.*)$",
					varsIgnorePattern: "^(_|___.*)$"
				}
			],
			// wisp.mjs's multi-strategy import fallback (try `with`, then
			// `assert`, then fs.readFile) deliberately swallows each earlier
			// strategy's failure with an empty catch before trying the next.
			"no-empty": ["error", { allowEmptyCatch: true }]
		}
	},
	{ files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: { ...globals.node } } },
	{ files: ["test/**/*.mjs"], languageOptions: { globals: { ...globals.mocha } } }
]);
