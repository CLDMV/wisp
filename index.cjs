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
