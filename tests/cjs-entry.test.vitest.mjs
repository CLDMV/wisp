/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /tests/cjs-entry.test.vitest.mjs
 *	@Date: 2026-10-03T19:27:00-07:00 (1791080820)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T19:27:20-07:00 (1791080840)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * @fileoverview Characterization tests for the CommonJS entry point (index.cjs).
 * @module @cldmv/wisp.test.cjs-entry
 * @internal
 * @private
 *
 * @description
 * tests/cjs/entry.test.cjs checks a real CommonJS consumer under `node --test`. These tests load
 * the same entry through createRequire inside the Vitest run so its version guard is exercised
 * and measured: the guard branch is driven by overriding the `process.features.require_module`
 * getter for one load.
 */

import { describe, it, expect, afterEach } from "vitest";
import { createRequire } from "node:module";
import * as esm from "../index.mjs";

const require = createRequire(import.meta.url);
const entry = require.resolve("../index.cjs");

afterEach(() => {
	delete require.cache[entry];
});

describe("index.cjs", () => {
	it("re-exports the ESM entry's functions", () => {
		const cjs = require("../index.cjs");
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
			require("../index.cjs");
		} catch (e) {
			err = e;
		} finally {
			Object.defineProperty(process.features, "require_module", original);
		}
		expect(err).toBeInstanceOf(Error);
		expect(err.code).toBe("ERR_REQUIRE_ESM");
		expect(err.message).toMatch(
			/^@cldmv\/wisp: require\(\) needs Node\.js \^20\.19\.0 or >=22\.12\.0 \(this is v[\d.]+\)\. On older Node\.js, load the package with import\(\) instead\.$/
		);
	});
});
