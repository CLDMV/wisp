/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /tests/cjs-entry.test.vitest.mjs
 *	@Date: 2026-10-03T19:27:00-07:00 (1791080820)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-11-01T12:09:44-08:00 (1793563784)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * @fileoverview Characterization tests for the CommonJS entry (src/index.cjs, published as dist/index.cjs).
 * @module @cldmv/wisp.test.cjs-entry
 * @internal
 * @private
 *
 * @description
 * tests/cjs/entry.test.cjs checks the built dist/index.cjs as a real CommonJS consumer under
 * `node --test`. These tests load the entry from src/ (what the `wisp-dev` export condition
 * serves) through createRequire inside the Vitest run so its version guard is exercised and
 * measured: the guard branch is driven by overriding the `process.features.require_module`
 * getter for one load.
 *
 * The caller-resolution tests check that a relative path passed through the CJS entry still
 * resolves against the calling file and not against src/: once in-process, and once from a
 * fixture that loads the package by name under `--conditions=wisp-dev` in its own Node process.
 * tests/bundle/caller-resolution.test.mjs runs the same fixture against the built dist/index.cjs.
 */

import { describe, it, expect, afterEach } from "vitest";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esm from "../src/index.mjs";

const require = createRequire(import.meta.url);
const entry = require.resolve("../src/index.cjs");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

afterEach(() => {
	delete require.cache[entry];
});

describe("src/index.cjs", () => {
	it("re-exports the ESM entry's functions", () => {
		const cjs = require("../src/index.cjs");
		expect(cjs).toBe(esm.default);
		expect(cjs.default).toBe(esm.default);
		expect(cjs.wisp).toBe(esm.wisp);
		expect(cjs.wispSync).toBe(esm.wispSync);
	});

	it("throws ERR_REQUIRE_ESM with guidance when require(esm) is unavailable", () => {
		const original = Object.getOwnPropertyDescriptor(process.features, "require_module");
		Object.defineProperty(process.features, "require_module", { configurable: true, enumerable: true, get: () => false });
		let err;
		try {
			require("../src/index.cjs");
		} catch (e) {
			err = e;
		} finally {
			Object.defineProperty(process.features, "require_module", original);
		}
		expect(err).toBeInstanceOf(Error);
		expect(err.code).toBe("ERR_REQUIRE_ESM");
		expect(err.message).toMatch(
			/^@cldmv\/wisp: require\(\) needs Node\.js \^20\.19\.0 or >=22\.13\.0 \(this is v[\d.]+\)\. On older Node\.js, load the package with import\(\) instead\.$/
		);
	});
});

describe("caller resolution through src/index.cjs", () => {
	it("resolves relative paths against the calling file in-process", () => {
		const cjs = require("../src/index.cjs");
		expect(cjs.wispSync("./fixtures/sample.json")).toEqual({ foo: "bar", nested: { ok: true } });
		expect(cjs.wispSync("./fixtures/nested/ok.json")).toEqual({ ok: true });
	});

	it("resolves relative paths against a CommonJS caller loading the package under wisp-dev", () => {
		const res = spawnSync(
			process.execPath,
			["--conditions=wisp-dev", path.join(repoRoot, "tests", "fixtures", "entry-caller", "cjs-caller.cjs")],
			{
				cwd: repoRoot,
				encoding: "utf8"
			}
		);
		expect(res.status, res.stderr).toBe(0);
		expect(JSON.parse(res.stdout)).toEqual({
			entry: "src/index.cjs",
			sync: { resolvedFrom: "tests/fixtures/entry-caller" },
			up: { ok: true },
			async: { resolvedFrom: "tests/fixtures/entry-caller" },
			sameObject: true
		});
	});
});
