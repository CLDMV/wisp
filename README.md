# @cldmv/wisp

**@cldmv/wisp** loads JSON files in Node.js without caring which JSON import syntax the running Node.js version understands. It tries the modern `import ... with { type: "json" }` form first, falls back to the legacy `assert` form, and finally reads and parses the file itself, so the same call works from Node.js 16 through the current release.

Relative paths resolve from the file that calls wisp, not from wisp's own location, so `wispSync("./config.json")` means what it looks like it means from anywhere in your project — including from packages that depend on wisp.

> _Load JSON the same way on every Node.js version — quietly, like a wisp._

[![npm version]][npm_version_url] [![npm downloads]][npm_downloads_url] [![GitHub downloads]][github_downloads_url] [![Last commit]][last_commit_url] [![npm last update]][npm_last_update_url]

[![Contributors]][contributors_url] [![Sponsor shinrai]][sponsor_url]

---

## ✨ What's New

### Latest: v1.0.7 (October 2026)

- **`require()` works in bundles and fails clearly on older Node.js** — `index.cjs` now loads the ESM entry with a plain `require("./index.mjs")` instead of `createRequire(__filename)`, so `require("@cldmv/wisp")` survives esbuild and webpack bundling. On Node.js versions without synchronous `require(esm)`, where `require()` never worked, it now throws an `ERR_REQUIRE_ESM` error that names the supported versions (`^20.19.0` or `>=22.12.0`) and points to `import()` ([#30](https://github.com/CLDMV/wisp/pull/30)).
- **A failed validation throws instead of loading the fallback** — `fallback` is now used only when the primary file cannot be read or parsed; a `validate` rejection is reported as an error, and a fallback that also fails no longer loops forever ([#35](https://github.com/CLDMV/wisp/pull/35)). On the `import()` paths, a `validate` rejection now throws the validation error once instead of `Unsupported type`, and `reviver` / `validate` on a module without a default export receive a plain-object copy of its exports instead of failing ([#41](https://github.com/CLDMV/wisp/pull/41)). The package is also relicensed under Apache-2.0 ([#34](https://github.com/CLDMV/wisp/pull/34)).
- **Built package in `dist/`** — the published package is now bundled with tsup into `dist/index.mjs`, with `dist/index.cjs` as a thin `require()` wrapper, and ships only `dist/`, `types/`, `README.md` and `LICENSE`. `import` and `require()` of `@cldmv/wisp` work exactly as before; code that loaded the old root `index.mjs` / `index.cjs` or `src/` files by path must use the package specifier ([#40](https://github.com/CLDMV/wisp/pull/40)). The test suite now runs on `@cldmv/vitest-runner` with 100% coverage ([#37](https://github.com/CLDMV/wisp/pull/37)).
- [View full v1.0.7 Changelog](https://github.com/CLDMV/wisp/blob/master/docs/changelog/v1/v1.0.7.md)

### Recent Releases

- **v1.0.6** (October 2026) — Uniform file headers via `@cldmv/fix-headers`, a CI fix and a development-dependency security update; no runtime change ([Changelog](https://github.com/CLDMV/wisp/blob/master/docs/changelog/v1/v1.0.6.md))
- **v1.0.5** (October 2026) — First npm release since v1.0.1; TypeScript 6, chai 6 and `@types/node` 26 for development, v4 workflow syncs; no runtime change ([Changelog](https://github.com/CLDMV/wisp/blob/master/docs/changelog/v1/v1.0.5.md))
- **v1.0.4** (September 2026) — Thrown errors now carry the original error as `cause`; ESLint wired up; mocha 12 ([Changelog](https://github.com/CLDMV/wisp/blob/master/docs/changelog/v1/v1.0.4.md))
- **v1.0.3** (August 2026) — Development-dependency security update (`picomatch`); no runtime change ([Changelog](https://github.com/CLDMV/wisp/blob/master/docs/changelog/v1/v1.0.3.md))

📚 **For complete version history and detailed release notes, see the [docs/changelog/](https://github.com/CLDMV/wisp/tree/master/docs/changelog/) folder.**

---

## 🚀 Key Features

- **Version-agnostic JSON imports** — `with`, then `assert`, then a file-system read; whichever the running Node.js supports.
- **Caller-aware paths** — relative paths resolve from the calling file; `base` overrides it.
- **Async and sync** — `wisp()` returns a promise, `wispSync()` returns the value directly.
- **Validation and revivers** — `validate` rejects bad data, `reviver` is passed to `JSON.parse`.
- **Fallback files** — `fallback` names a second file to try when the first cannot be loaded.
- **ESM and CommonJS** — `import` and `require()` entry points, with TypeScript declarations included.
- **Zero runtime dependencies.**

### Node.js Version Support

| Node Version | `import ... with { type: 'json' }` | `import ... assert { type: 'json' }` | Fallback |
| ------------ | ---------------------------------- | ------------------------------------ | -------- |
| ≥ 22.10      | ✅                                 | ✅                                   | ✅       |
| ≥ 20.10      | ✅                                 | ✅                                   | ✅       |
| ≥ 18.20      | ✅                                 | ✅                                   | ✅       |
| ≥ 16.14      | ❌                                 | ✅                                   | ✅       |
| < 16.14      | ❌                                 | ❌                                   | ✅       |

---

## 📦 Installation

### Requirements

- **Node.js 16 or higher** for `import` (ESM).
- **`require()` needs Node.js ^20.19.0 or >=22.12.0** (synchronous `require(esm)`). On older Node.js versions, load the package with `import()` instead.

### Install

```bash
npm install @cldmv/wisp
```

---

## 🚀 Quick Start

### ESM

```javascript
import { wisp, wispSync } from "@cldmv/wisp";

// Asynchronous loading
const config = await wisp("./config.json");

// Synchronous loading
const data = wispSync("./data.json");
```

### CommonJS

```javascript
const { wisp, wispSync } = require("@cldmv/wisp");

// Asynchronous loading
wisp("./config.json").then((config) => {
	console.log(config);
});

// Synchronous loading
const data = wispSync("./data.json");
```

---

## 📖 API Reference

### `wisp(input, options?)`

Asynchronously loads JSON from a file.

#### Parameters

- `input` (string | URL): Path or URL to the JSON file
- `options` (object, optional):
  - `base` (string | URL, optional): Base URL for resolving relative paths. Defaults to the caller's file URL.
  - `validate` (function, optional): Validation function called with the parsed JSON. Throws if validation fails.
  - `reviver` (function, optional): Reviver function passed to `JSON.parse`. For a module loaded through `import()` that has no default export, `reviver` and `validate` receive a plain-object copy of its exports.
  - `type` (string, optional): Import attribute type used for the `import()` attempts. Defaults to `"json"`; the file-system fallback only runs for `"json"`.
  - `fallback` (string | URL, optional): A second file to load when `input` cannot be read or parsed. A `validate` failure on `input` throws rather than falling back.

#### Returns

`Promise<*>`: The parsed JSON value.

#### Example

```javascript
import { wisp } from "@cldmv/wisp";

const data = await wisp("./config.json", {
	validate: (json) => {
		if (!json.requiredField) throw new Error("Missing required field");
	},
	reviver: (key, value) => (key === "date" ? new Date(value) : value)
});
```

### `wispSync(input, options?)`

Synchronously loads JSON from a file.

#### Parameters

- `input` (string | URL): Path or URL to the JSON file
- `options` (object, optional): Same as `wisp` options, except `type` (the file is always read and parsed as JSON).

#### Returns

`*`: The parsed JSON value.

#### Example

```javascript
import { wispSync } from "@cldmv/wisp";

const data = wispSync("./config.json", {
	validate: (json) => {
		if (!json.version) throw new Error("Version required");
	}
});
```

---

## ⚙️ Options

| Option     | Type       | Description                                                                                                                               |
| ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `base`     | string/URL | Base URL for relative path resolution. Defaults to caller's file URL.                                                                     |
| `validate` | function   | Validation function. Receives parsed JSON, should throw on invalid data.                                                                  |
| `reviver`  | function   | JSON.parse reviver function for custom parsing.                                                                                           |
| `type`     | string     | Import attribute type for `wisp()`'s `import()` attempts. Defaults to `"json"`.                                                           |
| `fallback` | string/URL | File to load instead when `input` cannot be read or parsed (missing, unreadable, or not valid JSON). A `validate` failure throws instead. |

---

## 🧭 Path Resolution

`@cldmv/wisp` uses caller-aware path resolution:

- Relative paths are resolved relative to the file that calls `wisp` or `wispSync`
- Absolute paths and URLs are used as-is
- The `base` option overrides the default caller-based resolution

---

## 🔁 Fallback Order

The module attempts to load JSON in this order:

1. `import(url, { with: { type: 'json' } })` (Node ≥ 18.20/20.10/22)
2. `import(url, { assert: { type: 'json' } })` (Node ≥ 16.14)
3. `fs.readFile` / `fs.readFileSync` (all supported Node versions)

This ensures maximum compatibility across Node.js versions. `wispSync` always uses `fs.readFileSync`.

---

## 🛡 Error Handling

Errors thrown by wisp are prefixed with `@cldmv/wisp:` for easy identification, and carry the underlying error as `error.cause`. A validation failure is reported as part of the load error:

```javascript
try {
	await wisp("./invalid.json", {
		validate: () => {
			throw new Error("Custom validation failed");
		}
	});
} catch (error) {
	console.log(error.message); // "@cldmv/wisp: Failed to load JSON file at file:///…/invalid.json: @cldmv/wisp: Custom validation failed"
}
```

---

## 📚 Documentation

- **[Changelog](https://github.com/CLDMV/wisp/tree/master/docs/changelog/)** — release notes for every version
- **[Bug reports and fixes](https://github.com/CLDMV/wisp/blob/master/BUGS.md)** — write-ups of notable bugs and how they were fixed

[![CodeFactor]][codefactor_url] [![OpenSSF Scorecard]][ossf_scorecard_url] [![npms.io score]][npms_url] [![npm unpacked size]][npm_size_url] [![Repo size]][repo_size_url]

---

## 🤝 Contributing

Contributions are welcome — open an [issue](https://github.com/CLDMV/wisp/issues) or a pull request.

[![Contributors]][contributors_url] [![Sponsor shinrai]][sponsor_url]

---

## 🔗 Links

- **npm**: [@cldmv/wisp](https://www.npmjs.com/package/@cldmv/wisp)
- **GitHub**: [CLDMV/wisp](https://github.com/CLDMV/wisp)
- **Issues**: [GitHub Issues](https://github.com/CLDMV/wisp/issues)
- **Changelog**: [docs/changelog/](https://github.com/CLDMV/wisp/tree/master/docs/changelog/)

---

## 📄 License

[![GitHub license]][github_license_url] [![npm license]][npm_license_url]

Apache-2.0 © CLDMV Inc. See [LICENSE](https://github.com/CLDMV/wisp/blob/master/LICENSE) for the full text.

[npm version]: https://img.shields.io/npm/v/%40cldmv%2Fwisp.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_version_url]: https://www.npmjs.com/package/@cldmv/wisp
[last commit]: https://img.shields.io/github/last-commit/CLDMV/wisp?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[last_commit_url]: https://github.com/CLDMV/wisp/commits
[npm last update]: https://img.shields.io/npm/last-update/%40cldmv%2Fwisp?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_last_update_url]: https://www.npmjs.com/package/@cldmv/wisp
[codefactor]: https://img.shields.io/codefactor/grade/github/CLDMV/wisp?style=for-the-badge&logo=codefactor&logoColor=white&labelColor=F44A6A
[codefactor_url]: https://www.codefactor.io/repository/github/cldmv/wisp
[openssf scorecard]: https://img.shields.io/ossf-scorecard/github.com/CLDMV/wisp?style=for-the-badge&label=OpenSSF%20Scorecard
[ossf_scorecard_url]: https://scorecard.dev/viewer/?uri=github.com/CLDMV/wisp
[npms.io score]: https://img.shields.io/npms-io/final-score/%40cldmv%2Fwisp?style=for-the-badge&logo=npms&logoColor=white&labelColor=0B5D57
[npms_url]: https://npms.io/search?q=%40cldmv%2Fwisp
[npm downloads]: https://img.shields.io/npm/dm/%40cldmv%2Fwisp.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_downloads_url]: https://www.npmjs.com/package/@cldmv/wisp
[github downloads]: https://img.shields.io/github/downloads/CLDMV/wisp/total?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[github_downloads_url]: https://github.com/CLDMV/wisp/releases
[npm unpacked size]: https://img.shields.io/npm/unpacked-size/%40cldmv%2Fwisp.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_size_url]: https://www.npmjs.com/package/@cldmv/wisp
[repo size]: https://img.shields.io/github/repo-size/CLDMV/wisp?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[repo_size_url]: https://github.com/CLDMV/wisp
[github license]: https://img.shields.io/github/license/CLDMV/wisp.svg?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[github_license_url]: https://github.com/CLDMV/wisp/blob/HEAD/LICENSE
[npm license]: https://img.shields.io/npm/l/%40cldmv%2Fwisp.svg?style=for-the-badge&logo=npm&logoColor=white&labelColor=CB3837
[npm_license_url]: https://www.npmjs.com/package/@cldmv/wisp
[contributors]: https://img.shields.io/github/contributors/CLDMV/wisp.svg?style=for-the-badge&logo=github&logoColor=white&labelColor=181717
[contributors_url]: https://github.com/CLDMV/wisp/graphs/contributors
[sponsor shinrai]: https://img.shields.io/github/sponsors/shinrai?style=for-the-badge&logo=githubsponsors&logoColor=white&labelColor=EA4AAA&label=Sponsor
[sponsor_url]: https://github.com/sponsors/shinrai
