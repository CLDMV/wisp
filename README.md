# @cldmv/wisp

A Node.js module for version-agnostic JSON importing, providing transparent support for modern and legacy import syntaxes with automatic fallbacks.

## Overview

`@cldmv/wisp` allows you to load JSON files in Node.js without worrying about version-specific import syntax. It automatically tries the most modern import methods first and falls back to reliable file system operations.

## Node.js Version Support

| Node Version | `import ... with { type: 'json' }` | `import ... assert { type: 'json' }` | Fallback |
| ------------ | ---------------------------------- | ------------------------------------ | -------- |
| ≥ 22.10      | ✅                                 | ✅                                   | ✅       |
| ≥ 20.10      | ✅                                 | ✅                                   | ✅       |
| ≥ 18.20      | ✅                                 | ✅                                   | ✅       |
| ≥ 16.14      | ❌                                 | ✅                                   | ✅       |
| < 16.14      | ❌                                 | ❌                                   | ✅       |

## Installation

```bash
npm install @cldmv/wisp
```

## Usage

### ESM (Modern)

```javascript
import { wisp, wispSync } from "@cldmv/wisp";

// Asynchronous loading
const config = await wisp("./config.json");

// Synchronous loading
const data = wispSync("./data.json");
```

### CJS (CommonJS)

```javascript
const { wisp, wispSync } = require("@cldmv/wisp");

// Asynchronous loading
wisp("./config.json").then((config) => {
	console.log(config);
});

// Synchronous loading
const data = wispSync("./data.json");
```

## API Reference

### `wisp(input, options?)`

Asynchronously loads JSON from a file.

#### Parameters

- `input` (string | URL): Path or URL to the JSON file
- `options` (object, optional):
  - `base` (string | URL, optional): Base URL for resolving relative paths. Defaults to the caller's file URL.
  - `validate` (function, optional): Validation function called with the parsed JSON. Throws if validation fails.
  - `reviver` (function, optional): Reviver function passed to `JSON.parse`.

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
- `options` (object, optional): Same as `wisp` options.

#### Returns

`Promise<*>`: The parsed JSON value.

#### Example

```javascript
import { wispSync } from "@cldmv/wisp";

const data = wispSync("./config.json", {
	validate: (json) => {
		if (!json.version) throw new Error("Version required");
	}
});
```

## Options

| Option     | Type       | Description                                                              |
| ---------- | ---------- | ------------------------------------------------------------------------ |
| `base`     | string/URL | Base URL for relative path resolution. Defaults to caller's file URL.    |
| `validate` | function   | Validation function. Receives parsed JSON, should throw on invalid data. |
| `reviver`  | function   | JSON.parse reviver function for custom parsing.                          |

## Path Resolution

`@cldmv/wisp` uses caller-aware path resolution:

- Relative paths are resolved relative to the file that calls `wisp` or `wispSync`
- Absolute paths and URLs are used as-is
- The `base` option overrides the default caller-based resolution

## Fallback Order

The module attempts to load JSON in this order:

1. `import(url, { with: { type: 'json' } })` (Node ≥ 18.20/20.10/22)
2. `import(url, { assert: { type: 'json' } })` (Node ≥ 16.14)
3. `fs.readFile` / `fs.readFileSync` (all supported Node versions)

This ensures maximum compatibility across Node.js versions.

## Error Handling

Validation errors are prefixed with `@cldmv/wisp:` for easy identification:

```javascript
try {
	await wisp("./invalid.json", {
		validate: () => {
			throw new Error("Custom validation failed");
		}
	});
} catch (error) {
	console.log(error.message); // "@cldmv/wisp: Custom validation failed"
}
```

## License

MIT © CLDMV Inc.
