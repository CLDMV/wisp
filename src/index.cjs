/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /src/index.cjs
 *	@Date: 2025-10-30T15:06:33-07:00 (1761861993)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-11-01T16:21:38-08:00 (1793578898)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * @fileoverview CJS entry point for @cldmv/wisp, providing version-agnostic JSON importing.
 * @module @cldmv/wisp
 * @public
 *
 * @description
 * Generic CLDMV CommonJS shim: it loads ./index.mjs through Node's synchronous require(esm) and
 * hands back the same exports as `import`. The ESM entry exports two distinct values (`wisp` and
 * `wispSync`; `default` is `wisp`), so require() returns the module object
 * `{ __esModule, default: wisp, wisp, wispSync }`, not a callable. It is not bundled: tsup copies it
 * verbatim to dist/index.cjs, where ./index.mjs is the ESM bundle; under the `wisp-dev` export
 * condition it is served from src/, where ./index.mjs is the source entry.
 *
 * @example
 * const { wisp, wispSync } = require('@cldmv/wisp');
 * const data = wispSync('./data.json');
 */

"use strict";

// Node.js versions without require(esm) would fail with a bare ERR_REQUIRE_ESM, so fail early with a
// message that says what to do instead. The floor is 22.13 rather than 22.12 because Node.js 22.12
// has require(esm) but prints an ExperimentalWarning on every use.
if (!process.features?.require_module) {
	const error = new Error(
		`@cldmv/wisp: require() needs Node.js ^20.19.0 or >=22.13.0 (this is ${process.version}). On older Node.js, load the package with import() instead.`
	);
	error.code = "ERR_REQUIRE_ESM";
	throw error;
}

// Same exports as `import`. One distinct exported value (aliases of it count once) comes back as that value,
// so require(x)(...) works; anything else comes back as the module object ({ default, ...named }).
const esm = require("./index.mjs");
const values = new Set(
	Object.keys(esm)
		.filter((key) => key !== "__esModule")
		.map((key) => esm[key])
);
module.exports = values.size === 1 ? values.values().next().value : esm;
