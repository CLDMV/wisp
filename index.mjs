/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /index.mjs
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
 * @fileoverview Main entry point for @cldmv/wisp, providing version-agnostic JSON importing.
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

export * from "./src/wisp.mjs";
export { default } from "./src/wisp.mjs";
