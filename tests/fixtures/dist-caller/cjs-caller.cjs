// Loads the BUILT CommonJS entry from a directory outside dist/ and resolves relative paths,
// which wisp must resolve against this file, not against dist/index.cjs or dist/index.mjs.
"use strict";

const wisp = require("../../../dist/index.cjs");

const sync = wisp.wispSync("./caller-data.json");
const up = wisp.wispSync("../nested/ok.json");

Promise.all([wisp("./caller-data.json"), wisp.wisp("./caller-data.json")]).then(([first, second]) => {
	process.stdout.write(JSON.stringify({ sync, up, async: first, sameObject: first === second }));
});
