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
 * This module is a thin wrapper: it loads ./index.mjs through Node's synchronous require(esm)
 * and re-exports it. It is not bundled — tsup copies it verbatim to dist/index.cjs (see
 * tsup.config.mjs), where ./index.mjs is the ESM bundle; under the `wisp-dev` export
 * condition it is served from src/, where ./index.mjs is the source entry. It uses a plain
 * require() rather than createRequire so the file keeps working when bundled by
 * esbuild/webpack.
 *
 * @example
 * const { wisp, wispSync } = require('@cldmv/wisp');
 * const data = wispSync('./data.json');
 */

"use strict";

// This is a thin wrapper: it loads ./index.mjs through Node's synchronous require(esm).
// Node.js versions without require(esm) would fail with a bare ERR_REQUIRE_ESM, so fail
// early with a message that says what to do instead. The floor is 22.13 rather than 22.12
// because Node.js 22.12 has require(esm) but prints an ExperimentalWarning on every use.
if (!process.features?.require_module) {
	const error = new Error(
		`@cldmv/wisp: require() needs Node.js ^20.19.0 or >=22.13.0 (this is ${process.version}). On older Node.js, load the package with import() instead.`
	);
	error.code = "ERR_REQUIRE_ESM";
	throw error;
}

const esm = require("./index.mjs");

module.exports = esm.default;
module.exports.default = esm.default;
module.exports.wisp = esm.wisp;
module.exports.wispSync = esm.wispSync;
