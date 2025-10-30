/**
 *	@Project: @cldmv/wisp
 *	@Filename: /src/lib/resolve-from-caller.mjs
 *	@Date: 2025-09-09 13:22:38 -07:00 (1757449358)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-10-30 14:41:00 -07:00 (1761860460)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

/**
 * @fileoverview Path resolution utilities for resolving paths from the caller context. Internal file (not exported in package.json).
 * @module @cldmv/wisp.helpers.resolve-from-caller
 * @memberof module:@cldmv/wisp.helpers
 * @internal
 * @package
 *
 * @description
 * Advanced path resolution system that uses V8 stack trace analysis to determine caller context.
 * Provides utilities for resolving relative paths from the caller's directory, implementing
 * sophisticated caller detection algorithms to handle complex module loading scenarios.
 *
 * Key features:
 * - V8 CallSite-based stack trace analysis
 * - Primary base file detection with fallback strategies
 * - Support for both filesystem paths and file:// URLs
 * - Smart handling of slothlet.mjs and index file patterns
 * - Existence-based resolution with automatic fallback
 *
 * Technical implementation:
 * - Uses Error.prepareStackTrace to access V8 CallSite objects
 * - Implements dual-phase resolution (primary + fallback)
 * - Handles edge cases like node:internal modules and helper directories
 * - Provides both path and URL resolution variants
 *
 *
 * @example
 * // ESM (internal)
 * import { resolvePathFromCaller } from "@cldmv/slothlet/helpers/resolve-from-caller";
 * // Internal example using package.json exports
 *
 * @example
 * // Relative import (internal)
 * import { resolvePathFromCaller, resolveUrlFromCaller } from "./resolve-from-caller.mjs";
 * const configPath = resolvePathFromCaller("../config.json");
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/* ---------- tiny utils ---------- */

/**
 * @function toFsPath
 * @package
 * @internal
 * @param {any} v - Value to convert (file:// URL, path string, or any other value)
 * @returns {string|null} Filesystem path if URL conversion successful, original string if already a path, null if input is falsy
 *
 * @description
 * Convert file:// URL to filesystem path, or return string as-is.
 * Handles URL-to-path conversion for cross-platform compatibility while preserving
 * non-URL strings unchanged. Provides null-safe operation for invalid inputs.
 *
 * @example
 * // URL conversion
 * toFsPath("file:///project/config.json"); // "/project/config.json" (Unix) or "C:\\project\\config.json" (Windows)
 *
 * @example
 * // String passthrough
 * toFsPath("/project/config.json"); // "/project/config.json"
 * toFsPath("C:\\project\\config.json"); // "C:\\project\\config.json"
 *
 * @example
 * // Null-safe handling
 * toFsPath(null); // null
 * toFsPath(undefined); // null
 * toFsPath(""); // null
 */
export const toFsPath = (v) => (v && String(v).startsWith("file://") ? fileURLToPath(String(v)) : v ? String(v) : null);

/**
 * @function getStack
 * @package
 * @internal
 * @param {Function} [skipFn] - Function to skip in stack trace via Error.captureStackTrace
 * @returns {Array<CallSite>} Array of V8 CallSite objects with methods like getFileName(), getLineNumber(), etc.
 *
 * @description
 * Get V8 stack trace as CallSite array for debugging and caller detection.
 * Temporarily overrides Error.prepareStackTrace to access raw V8 CallSite objects
 * instead of formatted string stack traces. Provides safe restoration of original handler.
 *
 * @example
 * // Get current call stack for debugging
 * const stack = getStack();
 * console.log(stack[0]?.getFileName?.()); // Current file path
 * console.log(stack[0]?.getLineNumber?.()); // Current line number
 *
 * @example
 * // Skip current function from stack trace
 * function myFunction() {
 *   return getStack(myFunction); // Stack starts from caller of myFunction
 * }
 * const callerStack = myFunction();
 *
 * @example
 * // Stack analysis for caller detection
 * function findCaller() {
 *   const stack = getStack(findCaller);
 *   for (const frame of stack) {
 *     const filename = frame?.getFileName?.();
 *     if (filename && !filename.includes("node_modules")) {
 *       return filename; // First non-dependency file
 *     }
 *   }
 * }
 */
export function getStack(skipFn) {
	const orig = Error.prepareStackTrace;
	try {
		Error.prepareStackTrace = (_, s) => s; // V8 CallSite[]
		const e = new Error("Stack trace");
		if (skipFn) Error.captureStackTrace(e, skipFn);
		return e.stack || [];
	} finally {
		Error.prepareStackTrace = orig;
	}
}

const THIS_FILE = fileURLToPath(import.meta.url);
const THIS_DIR = path.dirname(THIS_FILE);

/* ---------- base selection (shared) ---------- */
// Rule you specified:
// 1) Find the LAST frame whose basename is "slothlet.mjs".
// 2) Take the NEXT frame; if its basename is "index.[mjs|cjs|js]", take the following one.
// 3) Fallback: first non-helper frame that isn’t slothlet.mjs.

/**
 * @function pickPrimaryBaseFile
 * @internal
 * @private
 * @returns {string|null} Primary base file path for resolution, null if detection fails
 *
 * @description
 * Find the primary base file using stack trace analysis.
 * Implements sophisticated caller detection algorithm designed for slothlet's module loading patterns.
 * Uses a two-phase approach: locate the last slothlet.mjs frame, then find the actual user code.
 *
 * Algorithm:
 * 1. Scan stack trace to find the LAST frame whose basename is "slothlet.mjs"
 * 2. Take the NEXT frame after slothlet.mjs
 * 3. If that frame is "index.[mjs|cjs|js]", take the following frame instead
 * 4. Return null if no suitable frame found (fallback will be used)
 *
 * This pattern handles slothlet's loading chain: slothlet.mjs → index.mjs → user-code.mjs
 *
 * @example
 * // Stack trace scenario:
 * // 0: pickPrimaryBaseFile() [this function]
 * // 1: resolveWith() [internal helper]
 * // 2: resolvePathFromCaller() [public API]
 * // 3: slothlet.mjs [slothlet loader] ← LAST slothlet.mjs
 * // 4: index.mjs [entry point] ← Skip this
 * // 5: user-code.mjs [actual caller] ← Return this
 */
function pickPrimaryBaseFile() {
	const files = [];
	for (const cs of getStack(pickPrimaryBaseFile)) {
		const f = toFsPath(cs?.getFileName?.());
		if (!f) continue;
		if (f.startsWith?.("node:internal")) continue;
		files.push(f);
	}

	let iSloth = -1;
	for (let i = 0; i < files.length; i++) {
		if (path.basename(files[i]).toLowerCase() === "slothlet.mjs") iSloth = i;
	}
	if (iSloth !== -1) {
		const j = iSloth + 1;
		if (j < files.length) {
			const b = path.basename(files[j]).toLowerCase();
			if (/^index\.(mjs|cjs|js)$/.test(b) && j + 1 < files.length) return files[j + 1];
			return files[j];
		}
	}
	return null;
}

/**
 * @function pickFallbackBaseFile
 * @internal
 * @private
 * @returns {string} Fallback base file path, guaranteed to return a valid path
 *
 * @description
 * Find fallback base file when primary detection fails.
 * Provides robust fallback strategy by finding the first legitimate user code frame.
 * Filters out internal Node.js modules, helper utilities, and slothlet infrastructure.
 *
 * Fallback algorithm:
 * 1. Iterate through stack frames from top to bottom
 * 2. Skip node:internal modules (Node.js internals)
 * 3. Skip this file itself (resolve-from-caller.mjs)
 * 4. Skip other files in the helpers directory
 * 5. Skip slothlet.mjs infrastructure files
 * 6. Return first remaining frame, or THIS_FILE as ultimate fallback
 *
 * This ensures we always have a base path for resolution, even in edge cases.
 *
 * @example
 * // Fallback scenarios:
 * // - Primary detection failed (no slothlet.mjs in stack)
 * // - Complex loading chain with multiple loaders
 * // - Edge cases like REPL or test environments
 * // - Direct API usage without slothlet loader
 */
function pickFallbackBaseFile() {
	for (const cs of getStack(pickFallbackBaseFile)) {
		const f = toFsPath(cs?.getFileName?.());
		if (!f) continue;
		if (f.startsWith?.("node:internal")) continue;
		if (f === THIS_FILE) continue;
		if (f.startsWith(THIS_DIR + path.sep)) continue; // helper’s own dir
		if (path.basename(f).toLowerCase() === "slothlet.mjs") continue;
		return f;
	}
	return THIS_FILE;
}

/* ---------- generic resolver (shared) ---------- */

/**
 * @function resolveWith
 * @internal
 * @private
 * @param {string} rel - Relative path to resolve (must be a string)
 * @param {Function} makePrimary - Function to build primary candidate: (baseFile, rel) => candidate
 * @param {Function} exists - Existence check function: (candidate) => boolean
 * @param {Function} makeFallback - Function to build fallback result: (baseFile, rel) => result
 * @returns {string} Resolved path or URL (type depends on make functions)
 * @throws {TypeError} When rel parameter is not a string
 *
 * @description
 * Generic resolver that tries primary base file detection with fallback.
 * Core resolution engine that orchestrates the two-phase detection strategy.
 * Attempts primary resolution first, then falls back if target doesn't exist.
 *
 * Resolution strategy:
 * 1. Get primary base file using sophisticated stack analysis
 * 2. Build primary candidate using makePrimary function
 * 3. Check if primary candidate exists using exists function
 * 4. If exists, return primary candidate
 * 5. Otherwise, get fallback base file and build fallback result
 * 6. Return fallback result (no second existence check)
 *
 * This pattern ensures we try the most accurate resolution first, but always
 * provide a reasonable fallback even if the target doesn't exist yet.
 *
 * @example
 * // Usage pattern for filesystem paths:
 * resolveWith(
 *   "../config.json",
 *   (base, rel) => path.resolve(path.dirname(base), rel), // makePrimary
 *   (candidate) => fs.existsSync(candidate),              // exists
 *   (base, rel) => path.resolve(path.dirname(base), rel)  // makeFallback
 * );
 *
 * @example
 * // Usage pattern for URLs:
 * resolveWith(
 *   "../config.json",
 *   (base, rel) => new URL(rel, pathToFileURL(base)).href, // makePrimary
 *   (href) => fs.existsSync(fileURLToPath(href)),          // exists
 *   (base, rel) => new URL(rel, pathToFileURL(base)).href  // makeFallback
 * );
 */
function resolveWith(rel, makePrimary, exists, makeFallback) {
	if (typeof rel !== "string") throw new TypeError("rel must be a string");

	// absolute / already-URL cases are handled in the public wrappers
	const primaryBase = pickPrimaryBaseFile() ?? pickFallbackBaseFile();
	const primary = makePrimary(primaryBase, rel);
	if (exists(primary)) return primary;

	const fbBase = pickFallbackBaseFile();
	return makeFallback(fbBase, rel);
}

/* ---------- public API (thin wrappers) ---------- */

/**
 * @function resolvePathFromCaller
 * @package
 * @internal
 * @param {string} rel - Relative path to resolve (e.g., "../config.json", "./data/file.txt")
 * @returns {string} Absolute filesystem path with platform-specific separators
 * @throws {TypeError} When rel parameter is not a string
 *
 * @description
 * Resolve a relative path from the caller's context to an absolute filesystem path.
 * Primary public API for filesystem path resolution with intelligent caller detection.
 * Uses sophisticated stack trace analysis to determine the appropriate base directory.
 *
 * Resolution behavior:
 * - file:// URLs: Converted to filesystem paths via fileURLToPath()
 * - Absolute paths: Returned unchanged (already absolute)
 * - Relative paths: Resolved using caller detection algorithm
 *
 * Caller detection process:
 * 1. Primary: Use sophisticated slothlet.mjs-aware stack analysis
 * 2. Fallback: Use first non-helper frame if primary fails
 * 3. Existence check: Prefer primary if target exists, otherwise use fallback
 *
 * @example
 * // From a file at /project/src/modules/math.mjs
 * const configPath = resolvePathFromCaller("../config.json");
 * // Returns: /project/config.json (absolute filesystem path)
 *
 * @example
 * // Short-circuit cases
 * resolvePathFromCaller("file:///absolute/path.txt");
 * // Returns: /absolute/path.txt (converted from URL)
 *
 * resolvePathFromCaller("/already/absolute/path.txt");
 * // Returns: /already/absolute/path.txt (unchanged)
 *
 * @example
 * // Relative resolution from different contexts
 * // If called from /project/src/lib/utils.mjs:
 * resolvePathFromCaller("./helpers/format.js");
 * // Returns: /project/src/lib/helpers/format.js
 *
 * resolvePathFromCaller("../../config/settings.json");
 * // Returns: /project/config/settings.json
 */
export function resolvePathFromCaller(rel) {
	// short-circuits
	if (rel.startsWith?.("file://")) return fileURLToPath(rel);
	if (path.isAbsolute(rel)) return rel;

	return resolveWith(
		rel,
		// makePrimary (PATH)
		(baseFile, r) => path.resolve(path.dirname(baseFile), r),
		// exists (PATH)
		(candidate) => fs.existsSync(candidate),
		// makeFallback (PATH)
		(baseFile, r) => path.resolve(path.dirname(baseFile), r)
	);
}

/**
 * @function resolveUrlFromCaller
 * @package
 * @internal
 * @param {string} rel - Relative path to resolve (e.g., "../config.json", "./data/file.txt")
 * @returns {string} Absolute file:// URL suitable for dynamic imports and URL operations
 * @throws {TypeError} When rel parameter is not a string
 *
 * @description
 * Resolve a relative path from the caller's context to a file:// URL.
 * Companion API to resolvePathFromCaller that returns file:// URLs instead of filesystem paths.
 * Uses identical caller detection algorithm but outputs URL format for ESM imports.
 *
 * Resolution behavior:
 * - file:// URLs: Returned unchanged (already in URL format)
 * - Absolute paths: Converted to file:// URLs via pathToFileURL()
 * - Relative paths: Resolved using caller detection, then converted to URL
 *
 * Caller detection uses the same sophisticated algorithm as resolvePathFromCaller,
 * but the final result is converted to a file:// URL for compatibility with
 * ESM dynamic imports and other URL-based operations.
 *
 * @example
 * // From a file at /project/src/modules/math.mjs
 * const configUrl = resolveUrlFromCaller("../config.json");
 * // Returns: file:///project/config.json (absolute file:// URL)
 *
 * @example
 * // Short-circuit cases
 * resolveUrlFromCaller("file:///absolute/path.txt");
 * // Returns: file:///absolute/path.txt (unchanged)
 *
 * resolveUrlFromCaller("/already/absolute/path.txt");
 * // Returns: file:///already/absolute/path.txt (converted to URL)
 *
 * @example
 * // Dynamic ESM import usage
 * const modulePath = resolveUrlFromCaller("./dynamic-module.mjs");
 * const dynamicModule = await import(modulePath);
 * // Works seamlessly with ESM import() which expects URLs
 *
 * @example
 * // Cross-platform URL handling
 * // Unix: resolveUrlFromCaller("../config.json") → file:///project/config.json
 * // Windows: resolveUrlFromCaller("../config.json") → file:///C:/project/config.json
 */
export function resolveUrlFromCaller(rel) {
	// short-circuits
	if (rel.startsWith?.("file://")) return rel;
	if (path.isAbsolute(rel)) return pathToFileURL(rel).href;

	return resolveWith(
		rel,
		// makePrimary (URL)
		(baseFile, r) => new URL(r, pathToFileURL(baseFile)).href,
		// exists (URL→check target path)
		(href) => fs.existsSync(fileURLToPath(href)),
		// makeFallback (URL)
		(baseFile, r) => new URL(r, pathToFileURL(baseFile)).href
	);
}

/**
 * @typedef {object} CallSite
 * @property {function(): string|undefined} getFileName
 * @property {function(): number|undefined} getLineNumber
 * @property {function(): string|undefined} getFunctionName
 * @property {function(): string|undefined} getTypeName
 * @property {function(): string|undefined} getMethodName
 * @property {function(): string|undefined} getScriptNameOrSourceURL
 * @property {function(): number|undefined} getColumnNumber
 * @property {function(): boolean|undefined} isNative
 * @property {function(): boolean|undefined} isEval
 * @property {function(): boolean|undefined} isConstructor
 * @property {function(): boolean|undefined} isToplevel
 * @property {function(): boolean|undefined} isAsync
 * @property {function(): boolean|undefined} isPromiseAll
 * @property {function(): number|undefined} getPromiseIndex
 *
 * @description
 * Minimal V8 CallSite object type for stack trace analysis. Only includes methods used in this module.
 */
