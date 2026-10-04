/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /src/index.mjs
 *	@Date: 2025-10-30T15:06:33-07:00 (1761861993)
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
 * @fileoverview ESM entry point for @cldmv/wisp, providing version-agnostic JSON importing.
 * tsup bundles this file into dist/index.mjs (see tsup.config.mjs).
 * @module @cldmv/wisp
 * @public
 *
 * @description
 * This module exports the wisp and wispSync functions for loading JSON files
 * with support for different Node.js versions and import syntaxes.
 *
 * @example
 * // ESM
 * import { wisp, wispSync } from '@cldmv/wisp';
 * const data = await wisp('./data.json');
 *
 * @example
 * // CJS
 * const { wisp, wispSync } = require('@cldmv/wisp');
 * const data = wispSync('./data.json');
 */

export * from "./wisp.mjs";
export { default } from "./wisp.mjs";
