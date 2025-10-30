/**
 *	@Project: @cldmv/wisp
 *	@Filename: /src/wisp.mjs
 *	@Date: 2025-10-30 14:12:05 -07:00 (1761858725)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-10-30 14:59:15 -07:00 (1761861555)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

/**
 * @fileoverview Internal implementation of @cldmv/wisp. Not exported in package.json.
 * @module @cldmv/wisp.src.wisp
 * @internal
 * @private
 *
 * @description
 * This module provides the core implementation for version-agnostic JSON importing in Node.js.
 * It includes functions to load JSON asynchronously and synchronously, with fallbacks for different Node versions.
 *
 * @example
 * // Internal usage example
 * import { wisp } from './src/wisp.mjs';
 * const data = await wisp('./data.json');
 */

import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { resolveUrlFromCaller } from "./lib/resolve-from-caller.mjs";

/**
 * Deep clones a value using structuredClone if available, otherwise JSON.parse/stringify.
 * @private
 * @param {*} v - The value to clone.
 * @returns {*} The cloned value.
 */
/**
 * Deep clones a value using structuredClone if available, otherwise JSON.parse/stringify.
 * @private
 * @param {*} v - The value to clone.
 * @returns {*} The cloned value.
 */
function deepClone(v) {
	return typeof globalThis.structuredClone === "function" ? globalThis.structuredClone(v) : JSON.parse(JSON.stringify(v));
}

/**
 * Asynchronously loads JSON from a file, trying modern import with 'with', then 'assert', then fs.
 * @public
 * @param {string|URL} input - The path or URL to the JSON file.
 * @param {Object} [options] - Options object.
 * @param {string|URL} [options.base] - Base URL for relative paths.
 * @param {Function} [options.validate] - Validation function for the parsed JSON.
 * @param {Function} [options.reviver] - Reviver function for JSON.parse.
 * @param {string} [options.type='json'] - The type of the file being imported. Defaults to 'json'.
 * @param {string|URL} [options.fallback] - Fallback path or URL if the primary file is missing.
 * @returns {Promise<*>} The parsed JSON value.
 *
 * @description
 * Loads JSON asynchronously with version-agnostic support.
 * Attempts modern import syntax first, falls back to legacy assert, then fs.readFile.
 *
 * @example
 * import { wisp } from '@cldmv/wisp';
 * const data = await wisp('./config.json');
 */
export async function wisp(input, options = {}) {
	const { base, validate, reviver, type = "json", fallback } = options;
	let url;
	if (input instanceof URL) url = input;
	else {
		const s = String(input);
		if (s.startsWith("file://")) url = new URL(s);
		else if (path.isAbsolute(s)) url = pathToFileURL(s);
		else if (base) url = new URL(s, new URL(base));
		else url = new URL(resolveUrlFromCaller(s));
	}

	try {
		const mod = await import(url.href, { with: { type } });
		if (!reviver && !validate) return mod?.default ?? mod;
		let val = deepClone(mod?.default ?? mod);
		if (reviver) val = JSON.parse(JSON.stringify(val), reviver);
		if (validate) {
			try {
				validate(val);
			} catch (e) {
				throw new Error(`@cldmv/wisp: ${e?.message ?? e}`);
			}
		}
		return val;
	} catch {}

	try {
		const mod = await import(url.href, { assert: { type } });
		if (!reviver && !validate) return mod?.default ?? mod;
		let val = deepClone(mod?.default ?? mod);
		if (reviver) val = JSON.parse(JSON.stringify(val), reviver);
		if (validate) {
			try {
				validate(val);
			} catch (e) {
				throw new Error(`@cldmv/wisp: ${e?.message ?? e}`);
			}
		}
		return val;
	} catch {}

	if (type === "json") {
		try {
			const txt = await readFile(url, "utf8");
			const val = deepClone(JSON.parse(txt, reviver));
			if (validate) {
				try {
					validate(val);
				} catch (e) {
					throw new Error(`@cldmv/wisp: ${e?.message ?? e}`);
				}
			}
			return val;
		} catch (e) {
			if (fallback) {
				return wisp(fallback, options);
			}
			throw new Error(`@cldmv/wisp: Failed to load JSON file at ${url.href}: ${e.message}`);
		}
	}

	throw new Error(`@cldmv/wisp: Unsupported type '${type}' or failed to load module at ${url.href}`);
}

/**
 * Synchronously loads JSON from a file using fs.
 * @public
 * @param {string|URL} input - The path or URL to the JSON file.
 * @param {Object} [options] - Options object.
 * @param {string|URL} [options.base] - Base URL for relative paths.
 * @param {Function} [options.validate] - Validation function for the parsed JSON.
 * @param {Function} [options.reviver] - Reviver function for JSON.parse.
 * @param {string} [options.type='json'] - The type of the file being imported. Defaults to 'json'.
 * @param {string|URL} [options.fallback] - Fallback path or URL if the primary file is missing.
 * @returns {*} The parsed JSON value.
 *
 * @description
 * Loads JSON synchronously using fs.readFileSync.
 *
 * @example
 * import { wispSync } from '@cldmv/wisp';
 * const data = wispSync('./config.json');
 */
export function wispSync(input, options = {}) {
	const { base, validate, reviver, type = "json", fallback } = options;
	let url;
	if (input instanceof URL) url = input;
	else {
		const s = String(input);
		if (s.startsWith("file://")) url = new URL(s);
		else if (path.isAbsolute(s)) url = pathToFileURL(s);
		else if (base) url = new URL(s, new URL(base));
		else url = new URL(resolveUrlFromCaller(s));
	}

	try {
		const txt = fs.readFileSync(url, "utf8");
		const val = deepClone(JSON.parse(txt, reviver));
		if (validate) {
			try {
				validate(val);
			} catch (e) {
				throw new Error(`@cldmv/wisp: ${e?.message ?? e}`);
			}
		}
		return val;
	} catch (e) {
		if (fallback) {
			return wispSync(fallback, options);
		}
		throw new Error(`@cldmv/wisp: Failed to load JSON file at ${url.href}: ${e.message}`);
	}
}

export default wisp;
