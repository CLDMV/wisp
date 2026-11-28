// Loads the BUILT CommonJS entry from a directory outside dist/ and resolves relative paths,
// which wisp must resolve against this file, not against dist/index.cjs or dist/index.mjs.
"use strict";

const { wisp, wispSync } = require("../../../dist/index.cjs");

const sync = wispSync("./caller-data.json");
const up = wispSync("../nested/ok.json");

Promise.all([wisp("./caller-data.json"), require("../../../dist/index.cjs").default("./caller-data.json")]).then(([first, second]) => {
	process.stdout.write(JSON.stringify({ sync, up, async: first, sameObject: first === second }));
});
