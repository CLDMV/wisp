/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /tsup.config.mjs
 *	@Date: 2026-10-03T19:33:05-07:00 (1791081185)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T19:34:10-07:00 (1791081250)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * @fileoverview Bundler config — produces the published dist/ output from src/.
 *
 *  - dist/index.mjs — the real esbuild bundle of src/index.mjs (ESM, minified).
 *  - dist/index.cjs — NOT a second bundle: src/cjs-shim.cjs is copied in verbatim by
 *    onSuccess below. Node's require() loads an ES module synchronously when it has no
 *    top-level await (the ESM build has none), so the shim just requires ./index.mjs.
 *
 * Constraints:
 *  - `target: "node16"` matches package.json `engines` (>=16) — `import` of the ESM build
 *    keeps working there; only require() needs require(esm) (see src/cjs-shim.cjs).
 *  - `supported["import-attributes"]` keeps esbuild from rejecting the
 *    `import(url, { with: { type } })` / `{ assert: { type } }` calls in src/wisp.mjs for a
 *    node16 target. They are runtime feature probes: wisp tries `with`, then `assert`, then
 *    fs, so they must reach Node exactly as written. Their `type` is a variable, so esbuild
 *    reports `unsupported-dynamic-import` (it cannot follow them, and must not); that
 *    expected warning is silenced.
 *  - `keepNames: true` keeps function names (`wisp.name`, stack-trace names) intact under
 *    minification.
 *  - `removeNodeProtocol: false` leaves built-in module specifiers exactly as written.
 *  - Caller detection (src/lib/resolve-from-caller.mjs) survives bundling: the resolver
 *    and wisp itself share one file in the bundle, so every library frame is the resolver's
 *    own `import.meta.url` (dist/index.mjs) and is skipped, and the first remaining frame is
 *    the caller. tests/bundle/ checks this against the built output.
 *
 * Sourcemaps are generated for local debugging but excluded from the published tarball
 * by the `!dist/**\/*.map` entry in package.json `files`.
 */
import { copyFileSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
	entry: { index: "src/index.mjs" },
	format: ["esm"],
	outDir: "dist",
	outExtension() {
		return { js: ".mjs" };
	},
	target: "node16",
	platform: "node",
	splitting: false,
	sourcemap: true,
	dts: false,
	clean: true,
	minify: true,
	keepNames: true,
	removeNodeProtocol: false,
	esbuildOptions(options) {
		options.supported = { ...options.supported, "import-attributes": true };
		options.logOverride = { ...options.logOverride, "unsupported-dynamic-import": "silent" };
	},
	onSuccess() {
		copyFileSync("src/cjs-shim.cjs", "dist/index.cjs");
	}
});
