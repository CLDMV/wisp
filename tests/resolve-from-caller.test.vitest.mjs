/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /tests/resolve-from-caller.test.vitest.mjs
 *	@Date: 2026-10-03T19:24:51-07:00 (1791080691)
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
 * @fileoverview Characterization tests for the caller-relative path resolver.
 * @module @cldmv/wisp.test.resolve-from-caller
 * @internal
 * @private
 *
 * @description
 * The resolver picks its base file from V8 CallSite frames. Real stacks cover the plain
 * cases; the frame-selection state machine is driven with synthetic CallSite lists by
 * pinning `Error.prepareStackTrace` (which `getStack` installs and restores) for one call.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { toFsPath, getStack, resolvePathFromCaller, resolveUrlFromCaller } from "../src/lib/resolve-from-caller.mjs";

const here = fileURLToPath(import.meta.url);
const testsDir = path.dirname(here);
const repoRoot = path.dirname(testsDir);
const resolverFile = path.join(repoRoot, "src", "lib", "resolve-from-caller.mjs");

/**
 * Runs `fn` while every stack trace V8 formats is replaced by `frames`.
 * @param {Array<object>|undefined} frames - Synthetic CallSite objects (or undefined for an empty stack value).
 * @param {() => any} fn - Code to run with the synthetic stack in place.
 * @returns {any} Whatever `fn` returns.
 */
function withStack(frames, fn) {
	const original = Object.getOwnPropertyDescriptor(Error, "prepareStackTrace");
	Object.defineProperty(Error, "prepareStackTrace", {
		configurable: true,
		get: () => () => frames,
		// getStack assigns its own formatter and then restores the old one; both writes are ignored here.
		set: () => {}
	});
	try {
		return fn();
	} finally {
		if (original) Object.defineProperty(Error, "prepareStackTrace", original);
		else delete Error.prepareStackTrace;
	}
}

const frame = (file) => ({ getFileName: () => file });

afterEach(() => {
	vi.restoreAllMocks();
});

describe("toFsPath", () => {
	it("converts a file:// URL to a filesystem path", () => {
		expect(toFsPath(pathToFileURL(here).href)).toBe(here);
	});

	it("returns a plain path unchanged, stringified", () => {
		expect(toFsPath("/some/path.json")).toBe("/some/path.json");
		expect(toFsPath({ toString: () => "/from/object" })).toBe("/from/object");
	});

	it("returns null for falsy input", () => {
		expect(toFsPath(null)).toBeNull();
		expect(toFsPath(undefined)).toBeNull();
		expect(toFsPath("")).toBeNull();
	});
});

describe("getStack", () => {
	it("returns V8 CallSite objects, starting at the caller when no function is skipped", () => {
		const stack = getStack();
		expect(Array.isArray(stack)).toBe(true);
		expect(typeof stack[0].getFileName).toBe("function");
		expect(toFsPath(stack[0].getFileName())).toBe(resolverFile);
	});

	it("drops the frames above the skipped function", () => {
		function marker() {
			return getStack(marker);
		}
		const stack = marker();
		expect(toFsPath(stack[0].getFileName())).toBe(here);
		expect(stack.some((cs) => cs.getFunctionName() === "marker")).toBe(false);
	});

	it("restores the previous Error.prepareStackTrace", () => {
		const before = Error.prepareStackTrace;
		getStack();
		expect(Error.prepareStackTrace).toBe(before);
	});

	it("returns an empty array when the stack formatter yields nothing", () => {
		expect(withStack(undefined, () => getStack())).toEqual([]);
	});
});

describe("resolvePathFromCaller", () => {
	it("converts a file:// URL short-circuit to a path", () => {
		expect(resolvePathFromCaller(pathToFileURL("/abs/file.json").href)).toBe(path.resolve("/abs/file.json"));
	});

	it("returns an absolute path unchanged", () => {
		expect(resolvePathFromCaller("/abs/file.json")).toBe("/abs/file.json");
	});

	it("resolves an existing relative path from the calling file", () => {
		expect(resolvePathFromCaller("./fixtures/sample.json")).toBe(path.join(testsDir, "fixtures", "sample.json"));
	});

	it("resolves a missing relative path from the calling file too", () => {
		expect(resolvePathFromCaller("./fixtures/does-not-exist.json")).toBe(path.join(testsDir, "fixtures", "does-not-exist.json"));
	});

	it("throws for a non-string path", () => {
		expect(() => resolvePathFromCaller(/** @type {any} */ (42))).toThrow(TypeError);
	});
});

describe("resolveUrlFromCaller", () => {
	it("returns a file:// URL unchanged", () => {
		expect(resolveUrlFromCaller("file:///abs/file.json")).toBe("file:///abs/file.json");
	});

	it("converts an absolute path to a file:// URL", () => {
		expect(resolveUrlFromCaller("/abs/file.json")).toBe(pathToFileURL("/abs/file.json").href);
	});

	it("resolves an existing relative path from the calling file", () => {
		expect(resolveUrlFromCaller("./fixtures/sample.json")).toBe(pathToFileURL(path.join(testsDir, "fixtures", "sample.json")).href);
	});

	it("resolves a missing relative path from the calling file too", () => {
		expect(resolveUrlFromCaller("./nope.json")).toBe(pathToFileURL(path.join(testsDir, "nope.json")).href);
	});
});

describe("base-file selection from the call stack", () => {
	const inSrc = path.join(repoRoot, "src", "wisp.mjs");
	const inDist = path.join(repoRoot, "dist", "wisp.mjs");
	const indexMjs = path.join(repoRoot, "index.mjs");
	const userFile = path.join(testsDir, "fixtures", "nested", "user.mjs");

	it("picks the first frame after the stack leaves src/", () => {
		const frames = [frame(resolverFile), frame(inSrc), frame(userFile), frame(here)];
		expect(withStack(frames, () => resolvePathFromCaller("./ok.json"))).toBe(path.join(testsDir, "fixtures", "nested", "ok.json"));
	});

	it("treats dist/ like src/", () => {
		const frames = [frame(inDist), frame(userFile)];
		expect(withStack(frames, () => resolvePathFromCaller("./ok.json"))).toBe(path.join(testsDir, "fixtures", "nested", "ok.json"));
	});

	it("returns the package's index file when that is the first frame outside src/", () => {
		const frames = [frame(inSrc), frame(indexMjs), frame(userFile)];
		expect(withStack(frames, () => resolvePathFromCaller("./package.json"))).toBe(path.join(repoRoot, "package.json"));
	});

	it("skips frames without a file name, node:internal frames, and the resolver itself", () => {
		const frames = [
			null,
			frame(undefined),
			frame("node:internal/modules/esm/loader"),
			frame(pathToFileURL(resolverFile).href),
			frame(inSrc),
			frame(pathToFileURL(userFile).href)
		];
		expect(withStack(frames, () => resolveUrlFromCaller("./ok.json"))).toBe(
			pathToFileURL(path.join(testsDir, "fixtures", "nested", "ok.json")).href
		);
	});

	it("falls back to the first usable frame when the stack never leaves src/", () => {
		// Leaving an index file without leaving src/ does not select a base, so the fallback picks the first real frame.
		const frames = [frame("node:internal/x"), frame(indexMjs), frame(userFile)];
		expect(withStack(frames, () => resolvePathFromCaller("./x.json"))).toBe(path.join(repoRoot, "x.json"));
	});

	it("switches to the fallback frame when the primary candidate does not exist", () => {
		// The primary base is the user file, but ./missing.json does not exist next to it, so the
		// result is built from the fallback base (the first usable frame) without a second existence check.
		const frames = [frame(inSrc), frame(userFile)];
		expect(withStack(frames, () => resolvePathFromCaller("./missing.json"))).toBe(path.join(repoRoot, "src", "missing.json"));
	});

	it("resolves from the resolver's own directory when the stack has no usable frames", () => {
		expect(withStack([], () => resolvePathFromCaller("./x.json"))).toBe(path.join(repoRoot, "src", "lib", "x.json"));
		expect(withStack([null, frame(undefined), frame(resolverFile), frame("node:internal/y")], () => resolveUrlFromCaller("./y.json"))).toBe(
			pathToFileURL(path.join(repoRoot, "src", "lib", "y.json")).href
		);
	});

	it("ignores frames outside the package when looking for src/", () => {
		const outside = path.join(path.parse(repoRoot).root, "elsewhere", "src", "lib.mjs");
		const frames = [frame(outside), frame(userFile)];
		// The outside file is not in this package's src/, so no primary base is found and the fallback takes the first frame.
		expect(withStack(frames, () => resolvePathFromCaller("./z.json"))).toBe(path.join(path.dirname(outside), "z.json"));
	});
});

describe("package root detection", () => {
	it("still resolves caller-relative paths when no package.json is found above the resolver", async () => {
		// A copy of the resolver bundled somewhere without a package.json above it has no package root:
		// nothing is classified as src/ or an index file, so every lookup goes through the fallback frame.
		vi.spyOn(fs, "existsSync").mockReturnValue(false);
		const mod = await import(`../src/lib/resolve-from-caller.mjs?no-package-root=${Date.now()}`);
		const frames = [frame(path.join(repoRoot, "src", "wisp.mjs")), frame(here)];
		expect(withStack(frames, () => mod.resolvePathFromCaller("./x.json"))).toBe(path.join(repoRoot, "src", "x.json"));
	});
});
