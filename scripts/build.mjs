/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: scripts/build.mjs
 *	@Date: 2026-11-28T00:00:00-08:00 (1796198400)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-11-28T00:00:00-08:00 (1796198400)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * @fileoverview Builds dist/ from src/: one minified file per source module, in the same layout.
 *
 * esbuild minifies each `src/**\/*.mjs` file on its own (`bundle: false`), keeping names for stack
 * traces and writing source maps next to the output. Nothing is bundled, so every module exists once
 * and the entries share it by plain relative imports: dist/index.mjs imports dist/wisp.mjs, which
 * imports dist/lib/resolve-from-caller.mjs. The hand-written CommonJS entry (src/index.cjs) is copied
 * verbatim; it requires ./index.mjs, which is its sibling in both src/ and dist/.
 *
 * Constraints:
 *  - `target: "node16"` matches package.json `engines` (>=16).
 *  - `supported["import-attributes"]` keeps esbuild from rejecting the `import(url, { with: { type } })`
 *    / `{ assert: { type } }` calls in src/wisp.mjs for a node16 target. They are runtime feature
 *    probes (wisp tries `with`, then `assert`, then fs), so they must reach Node exactly as written.
 *    Their `type` is a variable, so esbuild reports `unsupported-dynamic-import`; that expected
 *    warning is silenced.
 *  - Caller detection (src/lib/resolve-from-caller.mjs) skips every frame inside the package's own
 *    `src/` or `dist/` folder, so wisp.mjs and index.mjs as separate files are both library frames.
 *    tests/dist/ checks this against the built output.
 *
 * Source maps are written to dist/ but excluded from the tarball by the `!dist/**\/*.map` entry in
 * package.json `files`.
 */
import { copyFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = path.join(root, "src");
const dist = path.join(root, "dist");

rmSync(dist, { recursive: true, force: true });

const entryPoints = readdirSync(src, { recursive: true })
	.map(String)
	.filter((file) => file.endsWith(".mjs"))
	.map((file) => path.join(src, file));

await build({
	entryPoints,
	outdir: dist,
	outbase: src,
	outExtension: { ".js": ".mjs" },
	bundle: false,
	format: "esm",
	platform: "node",
	target: "node16",
	minify: true,
	keepNames: true,
	sourcemap: true,
	supported: { "import-attributes": true },
	logOverride: { "unsupported-dynamic-import": "silent" },
	logLevel: "warning"
});

copyFileSync(path.join(src, "index.cjs"), path.join(dist, "index.cjs"));
