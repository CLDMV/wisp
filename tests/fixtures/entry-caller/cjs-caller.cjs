// Loads the package by name through its CommonJS entry and resolves relative paths, which wisp
// must resolve against this file. Run with `--conditions=wisp-dev` the name resolves to
// src/index.cjs; without it, to the built dist/index.cjs. `entry` reports which one loaded.
"use strict";

const path = require("node:path");
const wisp = require("@cldmv/wisp");

const entry = path.relative(path.resolve(__dirname, "..", "..", ".."), require.resolve("@cldmv/wisp")).split(path.sep).join("/");
const sync = wisp.wispSync("./caller-data.json");
const up = wisp.wispSync("../nested/ok.json");

Promise.all([wisp("./caller-data.json"), wisp.wisp("./caller-data.json")]).then(([first, second]) => {
	process.stdout.write(JSON.stringify({ entry, sync, up, async: first, sameObject: first === second }));
});
