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
