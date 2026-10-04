/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /tests/bundle/caller-resolution.test.mjs
 *	@Date: 2026-10-03T19:32:55-07:00 (1791081175)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T19:34:10-07:00 (1791081250)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * Caller-relative path resolution against the BUILT package (dist/), run under Node's own test
 * runner (`node --test`, via `npm run test:cjs`, which builds first).
 *
 * wisp resolves a relative path from its CALLER's file by walking the V8 call stack
 * (src/lib/resolve-from-caller.mjs). Bundling and minifying merge the resolver and the library
 * into dist/index.mjs, so these tests make sure the built output still resolves against the
 * calling file — for both `import` and `require()` — and never against dist/.
 *
 * The callers are fixture files in tests/fixtures/dist-caller/, run as their own Node process
 * with the repository root as the working directory: the data file they load exists only next
 * to them, not in dist/ and not in the working directory.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { wispSync } from "../../dist/index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const fixtureDir = path.join(repoRoot, "tests", "fixtures", "dist-caller");

const expected = {
	sync: { resolvedFrom: "tests/fixtures/dist-caller" },
	up: { ok: true },
	async: { resolvedFrom: "tests/fixtures/dist-caller" },
	// wisp() returns the cached JSON module object only when the import-attributes path
	// (`import(url, { with: { type: "json" } })`) loaded it; the fs fallback parses a fresh
	// object on every call. Identity therefore shows the bundle kept the attributes.
	sameObject: true
};

/**
 * Runs a fixture caller in its own Node process and returns its parsed stdout.
 * @param {string} file - Fixture file name in tests/fixtures/dist-caller/.
 * @returns {unknown} The JSON the fixture printed.
 */
function runCaller(file) {
	const res = spawnSync(process.execPath, [path.join(fixtureDir, file)], { cwd: repoRoot, encoding: "utf8" });
	assert.equal(res.status, 0, res.stderr);
	return JSON.parse(res.stdout);
}

test("the fixture data is reachable only relative to the caller", () => {
	assert.equal(existsSync(path.join(fixtureDir, "caller-data.json")), true);
	assert.equal(existsSync(path.join(repoRoot, "caller-data.json")), false);
	assert.equal(existsSync(path.join(repoRoot, "dist", "caller-data.json")), false);
});

test("import of dist/index.mjs resolves relative paths against the calling file", () => {
	assert.deepEqual(runCaller("esm-caller.mjs"), expected);
});

test("require() of dist/index.cjs resolves relative paths against the calling file", () => {
	assert.deepEqual(runCaller("cjs-caller.cjs"), expected);
});

test("dist/index.mjs imported in-process resolves against this test file", () => {
	assert.deepEqual(wispSync("../fixtures/dist-caller/caller-data.json"), expected.sync);
});
