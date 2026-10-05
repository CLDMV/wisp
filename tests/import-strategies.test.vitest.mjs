/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /tests/import-strategies.test.vitest.mjs
 *	@Date: 2026-10-03T19:24:23-07:00 (1791080663)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T19:27:21-07:00 (1791080841)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * @fileoverview Characterization tests for wisp's input handling and its three load strategies:
 * `import()` with `with` attributes, legacy `assert` attributes, and the fs.readFile fallback.
 * @module @cldmv/wisp.test.import-strategies
 * @internal
 * @private
 *
 * @description
 * On Node.js 24+, a module that `with { type }` rejects (an unsupported `type` such as
 * "javascript") is imported by the `assert` retry of the same URL, because a failed import is
 * not cached. That is how these tests reach the second strategy. Node.js 20 and 22 cache the
 * failure, so there the tests check that wisp reports the unsupported type instead.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { wisp, wispSync } from "../src/index.mjs";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const sample = path.join(fixtures, "sample.json");
const sampleData = { foo: "bar", nested: { ok: true } };
const fixturesBaseHref = pathToFileURL(fixtures + path.sep).href;

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("input forms", () => {
	it("accepts a URL instance", async () => {
		expect(await wisp(pathToFileURL(sample))).toEqual(sampleData);
		expect(wispSync(pathToFileURL(sample))).toEqual(sampleData);
	});

	it("accepts a file:// URL string", async () => {
		expect(await wisp(pathToFileURL(sample).href)).toEqual(sampleData);
		expect(wispSync(pathToFileURL(sample).href)).toEqual(sampleData);
	});

	it("resolves a relative path against a string base", async () => {
		expect(await wisp("sample.json", { base: fixturesBaseHref })).toEqual(sampleData);
		expect(wispSync("nested/ok.json", { base: fixturesBaseHref })).toEqual({ ok: true });
	});

	it("resolves a relative path against a URL base", async () => {
		const base = new URL(fixturesBaseHref);
		expect(await wisp("./nested/ok.json", { base })).toEqual({ ok: true });
		expect(wispSync("./sample.json", { base })).toEqual(sampleData);
	});

	it("stringifies a non-string, non-URL input before resolving it", async () => {
		const input = { toString: () => sample };
		expect(await wisp(input)).toEqual(sampleData);
		expect(wispSync(input)).toEqual(sampleData);
	});
});

describe("import() with `with` attributes", () => {
	it("returns the module's default export when no reviver or validate is given", async () => {
		const a = await wisp(sample);
		const b = await wisp(sample);
		// The JSON module is cached by Node, so both calls share the same object.
		expect(a).toBe(b);
	});

	it("returns a deep clone when a reviver or validate is given", async () => {
		const shared = await wisp(sample);
		const cloned = await wisp(sample, { validate: () => {} });
		expect(cloned).toEqual(shared);
		expect(cloned).not.toBe(shared);
		expect(cloned.nested).not.toBe(shared.nested);
	});

	it("applies the reviver and validate together", async () => {
		const seen = [];
		const data = await wisp(sample, {
			reviver: (key, value) => (key === "ok" ? "revived" : value),
			validate: (val) => seen.push(val.nested.ok)
		});
		expect(data.nested.ok).toBe("revived");
		expect(seen).toEqual(["revived"]);
	});

	it("reports a non-Error validation failure with the thrown value", async () => {
		const validate = () => {
			throw "plain rejection";
		};
		await expect(wisp(sample, { validate })).rejects.toThrow(
			/^@cldmv\/wisp: Failed to load JSON file at .*sample\.json: @cldmv\/wisp: plain rejection$/
		);
	});

	it("runs a rejecting validate once instead of once per load strategy", async () => {
		let calls = 0;
		await expect(
			wisp(sample, {
				validate: () => {
					calls++;
					throw new Error("once");
				}
			})
		).rejects.toThrow(/: @cldmv\/wisp: once$/);
		expect(calls).toBe(1);
	});

	it("keeps the validation error as the cause", async () => {
		const original = new Error("nope");
		const err = await wisp(sample, {
			validate: () => {
				throw original;
			}
		}).catch((e) => e);
		expect(err.cause).toBe(original);
	});
});

// Node.js 24+ does not cache a failed import: after `with { type: "javascript" }` rejects a URL,
// the `assert` retry of that same URL loads it. Node.js 20 and 22 cache the failure, so the retry
// is rejected with the same error and wisp reports the unsupported type. The `assert` strategy can
// only be reached this way on Node.js 24+, so those tests run there; older versions check the error.
const nodeMajor = Number(process.versions.node.split(".")[0]);
const retriesFailedImport = nodeMajor >= 24;

describe.runIf(retriesFailedImport)("import() with legacy `assert` attributes", () => {
	// Node.js only checks import attributes on a module's first load; once a URL is in the module
	// cache, a later `with { type: "javascript" }` import of it succeeds. Each test therefore loads
	// its own URL (a unique query string makes a separate module instance) so the `with` attempt
	// really fails and the `assert` attempt is the one that loads the module.
	let counter = 0;
	const fresh = (file) => `${pathToFileURL(path.join(fixtures, file)).href}?case=${++counter}`;
	const moduleFile = "module.mjs";
	const noDefaultFile = "no-default.mjs";

	it("loads a module whose type `with` rejects, returning its default export", async () => {
		const data = await wisp(fresh(moduleFile), { type: "javascript" });
		expect(data).toEqual({ kind: "module", list: [1, 2] });
	});

	it("returns the module namespace when there is no default export", async () => {
		const ns = await wisp(fresh(noDefaultFile), { type: "javascript" });
		expect(ns.named).toBe("value");
		expect(ns.other).toBe(2);
	});

	it("returns a cloned, revived and validated default export", async () => {
		const seen = [];
		const data = await wisp(fresh(moduleFile), {
			type: "javascript",
			reviver: (key, value) => (key === "kind" ? "revived" : value),
			validate: (val) => seen.push(val.kind)
		});
		expect(data).toEqual({ kind: "revived", list: [1, 2] });
		expect(seen).toEqual(["revived"]);
	});

	it("applies a reviver without a validate", async () => {
		const data = await wisp(fresh(moduleFile), {
			type: "javascript",
			reviver: (key, value) => (Array.isArray(value) ? value.length : value)
		});
		expect(data).toEqual({ kind: "module", list: 2 });
	});

	it("serves an already-loaded module through the `with` attempt", async () => {
		// Second load of the same URL: Node.js skips the attribute check for a cached module.
		const url = fresh(noDefaultFile);
		const first = await wisp(url, { type: "javascript" });
		const second = await wisp(url, { type: "javascript" });
		expect(second).toBe(first);
		// The cached namespace has no default export, so the reviver gets a plain-object copy of it.
		const revived = await wisp(url, { type: "javascript", reviver: (key, value) => (key === "other" ? value + 1 : value) });
		expect(revived).toEqual({ named: "value", other: 3 });
		// A validation failure on the `with` attempt surfaces as the validation error too.
		await expect(
			wisp(url, {
				type: "javascript",
				validate: () => {
					throw "rejected on with";
				}
			})
		).rejects.toThrow(/^@cldmv\/wisp: Failed to load JSON file at file:.*no-default\.mjs\?case=\d+: @cldmv\/wisp: rejected on with$/);
	});

	it("applies a reviver to a plain-object copy of a namespace without a default export", async () => {
		const keys = [];
		const data = await wisp(fresh(noDefaultFile), {
			type: "javascript",
			reviver: (key, value) => {
				keys.push(key);
				return key === "named" ? "revived" : value;
			}
		});
		expect(data).toEqual({ named: "revived", other: 2 });
		expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
		expect(keys).toEqual(["named", "other", ""]);
	});

	it("validates a plain-object copy of a namespace without a default export", async () => {
		const seen = [];
		const data = await wisp(fresh(noDefaultFile), { type: "javascript", validate: (val) => seen.push(val) });
		expect(data).toEqual({ named: "value", other: 2 });
		expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
		expect(seen).toEqual([data]);
	});

	it("reports a validation failure on a non-JSON module as the validation error", async () => {
		let calls = 0;
		const validate = () => {
			calls++;
			throw "rejected";
		};
		await expect(wisp(fresh(moduleFile), { type: "javascript", validate })).rejects.toThrow(
			/^@cldmv\/wisp: Failed to load JSON file at file:.*module\.mjs\?case=\d+: @cldmv\/wisp: rejected$/
		);
		// The rejection is final: no later strategy loads the module again and re-runs validate.
		expect(calls).toBe(1);
		const original = new Error("rejected as Error");
		const err = await wisp(fresh(moduleFile), {
			type: "javascript",
			validate: () => {
				throw original;
			}
		}).catch((e) => e);
		expect(err.message).toMatch(/: @cldmv\/wisp: rejected as Error$/);
		expect(err.cause).toBe(original);
	});
});

describe.skipIf(retriesFailedImport)("import() of an unsupported type on Node.js < 24", () => {
	let counter = 0;
	const fresh = (file) => `${pathToFileURL(path.join(fixtures, file)).href}?legacy=${++counter}`;

	it("reports the unsupported type, because the failed `with` import is cached for that URL", async () => {
		await expect(wisp(fresh("module.mjs"), { type: "javascript" })).rejects.toThrow(/^@cldmv\/wisp: Unsupported type 'javascript'/);
		await expect(wisp(fresh("no-default.mjs"), { type: "javascript" })).rejects.toThrow(/^@cldmv\/wisp: Unsupported type 'javascript'/);
	});
});
describe("fs.readFile fallback", () => {
	it("reads JSON content that import() cannot load (a .js file holding JSON)", async () => {
		const data = await wisp(path.join(fixtures, "caller.js"), { reviver: (key, value) => (key === "caller" ? "revived" : value) });
		expect(data).toEqual({ caller: "revived" });
	});

	it("throws a wisp error naming the file when the primary is missing and there is no fallback", async () => {
		const missing = path.join(fixtures, "missing.json");
		const err = await wisp(missing).catch((e) => e);
		expect(err).toBeInstanceOf(Error);
		expect(err.message).toMatch(/^@cldmv\/wisp: Failed to load JSON file at file:.*missing\.json: ENOENT/);
		expect(err.cause.code).toBe("ENOENT");
	});

	it("throws a wisp error when the primary is invalid JSON and there is no fallback", async () => {
		const err = await wisp(path.join(fixtures, "invalid.json")).catch((e) => e);
		expect(err.message).toMatch(/^@cldmv\/wisp: Failed to load JSON file at .*invalid\.json: /);
		expect(err.cause).toBeInstanceOf(SyntaxError);
	});

	it("does not fall back a second time when the fallback is also missing", async () => {
		const err = await wisp(path.join(fixtures, "missing.json"), { fallback: path.join(fixtures, "also-missing.json") }).catch((e) => e);
		expect(err.message).toMatch(/^@cldmv\/wisp: Failed to load JSON file at .*also-missing\.json: ENOENT/);
	});

	it("rejects an unsupported type for a file no strategy can load", async () => {
		await expect(wisp(sample, { type: "javascript" })).rejects.toThrow(
			/^@cldmv\/wisp: Unsupported type 'javascript' or failed to load module at file:.*sample\.json$/
		);
	});

	it("deep-clones with JSON when structuredClone is unavailable", async () => {
		vi.stubGlobal("structuredClone", undefined);
		const data = await wisp(sample, { validate: () => {} });
		expect(data).toEqual(sampleData);
	});
});

describe("wispSync", () => {
	it("throws a wisp error when the primary is missing and there is no fallback", () => {
		expect(() => wispSync(path.join(fixtures, "missing.json"))).toThrow(
			/^@cldmv\/wisp: Failed to load JSON file at file:.*missing\.json: ENOENT/
		);
	});

	it("throws a wisp error when the primary is invalid JSON and there is no fallback", () => {
		expect(() => wispSync(path.join(fixtures, "invalid.json"))).toThrow(/^@cldmv\/wisp: Failed to load JSON file at .*invalid\.json: /);
	});

	it("reports a non-Error validation failure with the thrown value", () => {
		expect(() =>
			wispSync(sample, {
				validate: () => {
					throw "sync plain rejection";
				}
			})
		).toThrow(/: @cldmv\/wisp: sync plain rejection$/);
	});

	it("returns a fresh clone on every call", () => {
		const a = wispSync(sample);
		const b = wispSync(sample);
		expect(a).toEqual(b);
		expect(a).not.toBe(b);
	});

	it("deep-clones with JSON when structuredClone is unavailable", () => {
		vi.stubGlobal("structuredClone", undefined);
		expect(wispSync(sample)).toEqual(sampleData);
	});

	it("ignores the type option and always parses JSON", () => {
		expect(wispSync(path.join(fixtures, "caller.js"), { type: "javascript" })).toEqual({ caller: "ok" });
	});
});
