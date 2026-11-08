/**
 *
 *	@Project: @cldmv/wisp
 *	@Filename: /tests/resolve.test.vitest.mjs
 *	@Date: 2026-11-07T21:34:17-08:00 (1794116057)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-11-07T21:34:27-08:00 (1794116067)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * The tests import "@cldmv/wisp" by name, so the wisp-dev condition decides what they run against: src/ for `npm test`,
 * the build in dist/ for `npm run test:dist` (`--mode=dist`). This checks the name resolved to that tree.
 */
import { describe, it, expect } from "vitest";
import * as pkg from "@cldmv/wisp";

// This suite runs through Node's native import() (no Vite module runner), so import.meta.env is undefined; Vitest sets process.env.MODE instead.
const dist = process.env.MODE === "dist";

describe("the @cldmv/wisp import", () => {
	it(`resolves to ${dist ? "dist/" : "src/"}`, async () => {
		const expected = dist ? await import("../dist/index.mjs") : await import("../src/index.mjs");
		expect(pkg.wisp).toBe(expected.wisp);
		expect(pkg.wispSync).toBe(expected.wispSync);
		expect(pkg.default).toBe(expected.default);
	});
});
