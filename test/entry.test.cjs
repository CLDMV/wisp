/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /test/entry.test.cjs
 *	@Date: 2026-10-03T10:24:25-07:00 (1791048265)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T10:24:25-07:00 (1791048265)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * CommonJS entry tests. These run under Node's own test runner (`node --test`), not Mocha:
 * Mocha's `test/**\/*.mjs` glob only picks up ESM specs, so it cannot show whether a plain
 * `require()` of the package works the way it does for a CommonJS consumer.
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

test("require() returns the same wisp object as import", async () => {
	const cjs = require("../index.cjs");
	const esm = await import("../index.mjs");

	assert.equal(cjs, esm.default);
	assert.equal(cjs.default, esm.default);
	assert.equal(cjs.wisp, esm.wisp);
	assert.equal(cjs.wispSync, esm.wispSync);
	assert.equal(typeof cjs.wisp, "function");
	assert.equal(typeof cjs.wispSync, "function");
});

test("require() fails with a clear message where Node.js has no require(esm)", () => {
	// --no-experimental-require-module turns require(esm) off, which is what Node.js
	// versions before 20.19 / 22.12 look like to the entry.
	const res = spawnSync(process.execPath, ["--no-experimental-require-module", "-e", "require('./index.cjs')"], {
		cwd: repoRoot,
		encoding: "utf8"
	});

	assert.notEqual(res.status, 0);
	assert.match(res.stderr, /ERR_REQUIRE_ESM/);
	assert.match(res.stderr, /require\(\) needs Node\.js \^20\.19\.0 or >=22\.12\.0/);
	assert.match(res.stderr, /import\(\)/);
});
