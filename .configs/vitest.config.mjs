/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /.configs/vitest.config.mjs
 *	@Date: 2026-10-03T19:21:07-07:00 (1791080467)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-11-07T21:34:25-08:00 (1794116065)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

import { defineConfig, mergeConfig } from "vitest/config";
import { devCondition } from "@cldmv/configs/vitest.config.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Anchor the project root to the package directory so include/exclude work no
// matter what cwd vitest is invoked from.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// devCondition() reads the package's "-dev" export condition and sets resolve/ssr conditions plus test.execArgv, so
// Vite and the Node workers both load src/. `--mode=dist` (npm run test:dist) leaves it out, so tests that import
// "@cldmv/wisp" by name run against the build in dist/ instead.
export default defineConfig(({ mode }) =>
	mergeConfig(
		mode === "dist" ? {} : devCondition({ root }),
		defineConfig({
			root,
			test: {
				include: ["tests/**/*.test.vitest.mjs"],
				exclude: ["node_modules"],
				environment: "node",
				testTimeout: 30000,
				// Run test files and the code under test through Node's native import()
				// instead of Vite's module runner. wisp's behaviour depends on Node's real
				// dynamic-import semantics (import attributes `with` / legacy `assert`, JSON
				// module loading); the module runner ignores import attributes and loads JSON
				// itself, so under it the suite would exercise Vite rather than Node.
				// nodeLoader: false also skips Vitest's own loader transform (only needed for
				// vi.mock / import.meta.vitest, which this suite does not use), so V8 coverage is
				// measured against the files exactly as Node runs them.
				experimental: {
					viteModuleRunner: false,
					nodeLoader: false
				},
				// "dot" keeps CI logs to one character per test file; the final
				// "Test Files X passed" / "Tests Y passed" summary is unaffected.
				reporters: ["dot"],
				coverage: {
					provider: "v8",
					// Measured on src/ (ESM entry, library and the CJS entry src/index.cjs). The published dist/ is
					// built from it and checked separately by tests/cjs + tests/bundle under node --test.
					include: ["src/**/*.mjs", "src/**/*.cjs"],
					exclude: ["**/*.json", "tests/**", "src/types/**"],
					reporter: ["text", "html", "json-summary", "json"]
				}
			}
		})
	)
);
