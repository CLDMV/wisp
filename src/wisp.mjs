/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /src/wisp.mjs
 *	@Date: 2025-10-30T14:12:05-07:00 (1761858725)
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
function deepClone(v) {
	return typeof globalThis.structuredClone === "function" ? globalThis.structuredClone(v) : JSON.parse(JSON.stringify(v));
}

/**
 * Picks the value a loaded module provides: its default export, or the namespace when it has none.
 * With a reviver or validate the value is copied so the module cache is never mutated; a namespace
 * object cannot be structured-cloned, so it is first copied to a plain object of its exports.
 * @private
 * @param {Record<string, any>} mod - The module namespace returned by import().
 * @param {((this: any, key: string, value: any) => any)|undefined} reviver - Reviver function, if any.
 * @param {((val: any) => void)|undefined} validate - Validation function, if any.
 * @returns {*} The module's value, copied when a reviver or validate is given.
 */
function moduleValue(mod, reviver, validate) {
	const value = mod.default ?? mod;
	if (!reviver && !validate) return value;
	const data = value === mod ? { ...mod } : value;
	// JSON.parse already returns a fresh value, so a reviver needs no separate clone.
	return reviver ? JSON.parse(JSON.stringify(data), reviver) : deepClone(data);
}

/**
 * Runs the caller's validation on a loaded value, throwing the wisp-prefixed load error when it rejects the data.
 * @private
 * @param {((val: any) => void)|undefined} validate - Validation function, if any.
 * @param {*} val - The loaded value.
 * @param {URL} url - The URL the value was loaded from.
 * @returns {void}
 */
function runValidate(validate, val, url) {
	if (!validate) return;
	try {
		validate(val);
	} catch (e) {
		throw new Error(`@cldmv/wisp: Failed to load JSON file at ${url.href}: @cldmv/wisp: ${e?.message ?? e}`, { cause: e });
	}
}

/**
 * Asynchronously loads JSON from a file, trying modern import with 'with', then 'assert', then fs.
 * @public
 * @param {string|URL} input - The path or URL to the JSON file.
 * @param {Object} [options] - Options object.
 * @param {string|URL} [options.base] - Base URL for relative paths.
 * @param {(val: any) => void} [options.validate] - Validation function for the parsed JSON.
 * @param {(this: any, key: string, value: any) => any} [options.reviver] - Reviver function for JSON.parse.
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

	// Each import() strategy only has to load the module; validate runs after the strategy loop, so a
	// rejection is reported as the validation error instead of being treated as a failed strategy.
	// Legacy import assertions (`assert`) serve Node 16.14-20.9, which predate `with`; the cast keeps the type checker from rejecting the key.
	const loadWith = async (attributes) => moduleValue(await import(url.href, attributes), reviver, validate);
	for (const attributes of [{ with: { type } }, /** @type {any} */ ({ assert: { type } })]) {
		let val;
		try {
			val = await loadWith(attributes);
		} catch {
			continue;
		}
		runValidate(validate, val, url);
		return val;
	}

	if (type === "json") {
		let val;
		try {
			const txt = await readFile(url, "utf8");
			val = deepClone(JSON.parse(txt, reviver));
		} catch (e) {
			// Only a primary that cannot be read or parsed falls through to the fallback; the fallback itself gets no further fallback.
			if (fallback) {
				return wisp(fallback, { ...options, fallback: undefined });
			}
			throw new Error(`@cldmv/wisp: Failed to load JSON file at ${url.href}: ${e.message}`, { cause: e });
		}
		// A validation failure on a loaded primary is the caller's rejection, never a reason to use the fallback.
		runValidate(validate, val, url);
		return val;
	}

	throw new Error(`@cldmv/wisp: Unsupported type '${type}' or failed to load module at ${url.href}`);
}

/**
 * Synchronously loads JSON from a file using fs.
 * @public
 * @param {string|URL} input - The path or URL to the JSON file.
 * @param {Object} [options] - Options object.
 * @param {string|URL} [options.base] - Base URL for relative paths.
 * @param {(val: any) => void} [options.validate] - Validation function for the parsed JSON.
 * @param {(this: any, key: string, value: any) => any} [options.reviver] - Reviver function for JSON.parse.
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
	const { base, validate, reviver, fallback } = options;
	let url;
	if (input instanceof URL) url = input;
	else {
		const s = String(input);
		if (s.startsWith("file://")) url = new URL(s);
		else if (path.isAbsolute(s)) url = pathToFileURL(s);
		else if (base) url = new URL(s, new URL(base));
		else url = new URL(resolveUrlFromCaller(s));
	}

	let val;
	try {
		const txt = fs.readFileSync(url, "utf8");
		val = deepClone(JSON.parse(txt, reviver));
	} catch (e) {
		// Only a primary that cannot be read or parsed falls through to the fallback; the fallback itself gets no further fallback.
		if (fallback) {
			return wispSync(fallback, { ...options, fallback: undefined });
		}
		throw new Error(`@cldmv/wisp: Failed to load JSON file at ${url.href}: ${e.message}`, { cause: e });
	}
	// A validation failure on a loaded primary is the caller's rejection, never a reason to use the fallback.
	runValidate(validate, val, url);
	return val;
}

export default wisp;
