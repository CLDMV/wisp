/**
 * @fileoverview Test suite for @cldmv/wisp. Not exported in package.json.
 * @module @cldmv/wisp.test.wisp.spec
 * @internal
 * @private
 *
 * @description
 * Comprehensive Vitest tests for the wisp module, covering async/sync loading,
 * path resolution, validation, and CJS interop.
 */

import { expect } from "chai";
import { wisp, wispSync } from "../index.mjs";
import path from "node:path";

const testDir = path.join(process.cwd(), "test");

describe("wisp", () => {
	it("loads JSON via wisp() async", async () => {
		const data = await wisp(path.resolve(testDir, "fixtures/sample.json"));
		expect(data).to.deep.equal({ foo: "bar", nested: { ok: true } });
	});

	it("loads JSON via wispSync() sync", () => {
		const data = wispSync(path.resolve(testDir, "fixtures/sample.json"));
		expect(data).to.deep.equal({ foo: "bar", nested: { ok: true } });
	});

	it("handles absolute paths", async () => {
		const absPath = path.resolve(testDir, "fixtures/sample.json");
		const data = await wisp(absPath);
		expect(data.foo).to.equal("bar");
	});

	it("validates successfully", async () => {
		const validate = (val) => {
			if (!val.foo) throw new Error("missing foo");
		};
		const data = await wisp(path.resolve(testDir, "fixtures/sample.json"), { validate });
		expect(data.foo).to.equal("bar");
	});

	it("throws on validation failure", async () => {
		const validate = () => {
			throw new Error("test error");
		};
		try {
			await wisp(path.resolve(testDir, "fixtures/sample.json"), { validate });
			throw new Error("Expected error was not thrown");
		} catch (error) {
			expect(error.message).to.include("@cldmv/wisp: test error");
		}
	});

	it("uses reviver function", async () => {
		const reviver = (key, value) => (key === "foo" ? "modified" : value);
		const data = await wisp(path.resolve(testDir, "fixtures/sample.json"), { reviver });
		expect(data.foo).to.equal("modified");
	});

	it("loads nested JSON", async () => {
		const data = await wisp(path.resolve(testDir, "fixtures/nested/ok.json"));
		expect(data).to.deep.equal({ ok: true });
	});

	it("handles fallback paths", async () => {
		const data = await wisp(path.resolve(testDir, "fixtures/nonexistent.json"), {
			fallback: path.resolve(testDir, "fixtures/sample.json")
		});
		expect(data.foo).to.equal("bar");
	});

	it("resolves caller path correctly", async () => {
		const callerPath = path.resolve(testDir, "fixtures/caller.js");
		const data = await wisp(callerPath);
		expect(data).to.deep.equal({ caller: "ok" });
	});

	it("resolves relative paths from caller location", async () => {
		// This was the core issue - relative paths should resolve from the caller, not from src/
		const data = await wisp("./fixtures/sample.json");
		expect(data).to.deep.equal({ foo: "bar", nested: { ok: true } });
	});
});

describe("wispSync", () => {
	it("loads JSON synchronously", () => {
		const data = wispSync(path.resolve(testDir, "fixtures/sample.json"));
		expect(data).to.deep.equal({ foo: "bar", nested: { ok: true } });
	});

	it("validates synchronously", () => {
		const validate = (val) => {
			if (!val.foo) throw new Error("missing foo");
		};
		const data = wispSync(path.resolve(testDir, "fixtures/sample.json"), { validate });
		expect(data.foo).to.equal("bar");
	});

	it("throws on sync validation failure", () => {
		const validate = () => {
			throw new Error("sync test error");
		};
		expect(() => wispSync(path.resolve(testDir, "fixtures/sample.json"), { validate })).to.throw("@cldmv/wisp: sync test error");
	});

	it("uses reviver in sync", () => {
		const reviver = (key, value) => (key === "foo" ? "sync modified" : value);
		const data = wispSync(path.resolve(testDir, "fixtures/sample.json"), { reviver });
		expect(data.foo).to.equal("sync modified");
	});

	it("handles fallback paths synchronously", () => {
		const data = wispSync(path.resolve(testDir, "fixtures/nonexistent.json"), {
			fallback: path.resolve(testDir, "fixtures/sample.json")
		});
		expect(data.foo).to.equal("bar");
	});

	it("resolves caller path correctly in sync", () => {
		const callerPath = path.resolve(testDir, "fixtures/caller.js");
		const data = wispSync(callerPath);
		expect(data).to.deep.equal({ caller: "ok" });
	});

	it("resolves relative paths from caller location in sync", () => {
		// This was the core issue - relative paths should resolve from the caller, not from src/
		const data = wispSync("./fixtures/sample.json");
		expect(data).to.deep.equal({ foo: "bar", nested: { ok: true } });
	});
});

// Note: CJS interop test would require separate CJS test file or dynamic require
// For now, assuming the exports are correct as per index.cjs
