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
export function getStack(skipFn?: Function): Array<CallSite>;
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
export function resolvePathFromCaller(rel: string): string;
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
export function resolveUrlFromCaller(rel: string): string;
export function toFsPath(v: any): string | null;
export type CallSite = {
    getFileName: () => string | undefined;
    getLineNumber: () => number | undefined;
    getFunctionName: () => string | undefined;
    getTypeName: () => string | undefined;
    getMethodName: () => string | undefined;
    getScriptNameOrSourceURL: () => string | undefined;
    getColumnNumber: () => number | undefined;
    isNative: () => boolean | undefined;
    isEval: () => boolean | undefined;
    isConstructor: () => boolean | undefined;
    isToplevel: () => boolean | undefined;
    isAsync: () => boolean | undefined;
    isPromiseAll: () => boolean | undefined;
    getPromiseIndex: () => number | undefined;
};
//# sourceMappingURL=resolve-from-caller.d.mts.map