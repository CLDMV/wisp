/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /index.cjs
 *	@Date: 2025-10-30T15:06:33-07:00 (1761861993)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T15:12:05-07:00 (1790979125)
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
 * This module provides CommonJS exports for the wisp and wispSync functions.
 * It uses createRequire to load the ESM implementation and re-exports it.
 *
 * @example
 * const { wisp, wispSync } = require('@cldmv/wisp');
 * const data = wispSync('./data.json');
 */

"use strict";

const { createRequire } = require("module");
const requireESM = createRequire(__filename);
const esm = requireESM("./index.mjs");

module.exports = esm.default;
module.exports.default = esm.default;
module.exports.wisp = esm.wisp;
module.exports.wispSync = esm.wispSync;
