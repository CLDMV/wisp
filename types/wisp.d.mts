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
export function wisp(input: string | URL, options?: {
    base?: string | URL;
    validate?: (val: any) => void;
    reviver?: (this: any, key: string, value: any) => any;
    type?: string;
    fallback?: string | URL;
}): Promise<any>;
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
export function wispSync(input: string | URL, options?: {
    base?: string | URL;
    validate?: (val: any) => void;
    reviver?: (this: any, key: string, value: any) => any;
    type?: string;
    fallback?: string | URL;
}): any;
export default wisp;
//# sourceMappingURL=wisp.d.mts.map