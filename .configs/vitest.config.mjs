/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /.configs/vitest.config.mjs
 *	@Date: 2026-10-03T19:21:07-07:00 (1791080467)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T19:27:20-07:00 (1791080840)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Anchor the project root to the package directory so include/exclude work no
// matter what cwd vitest is invoked from.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig({
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
			// wisp publishes src/ directly (no dist build), plus the two entry points.
			include: ["src/**/*.mjs", "index.mjs", "index.cjs"],
			exclude: ["**/*.json", "tests/**", "src/types/**"],
			reporter: ["text", "html", "json-summary", "json"]
		}
	}
});
