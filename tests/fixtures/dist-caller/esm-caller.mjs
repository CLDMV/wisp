// Loads the BUILT ESM entry from a directory outside dist/ and resolves relative paths,
// which wisp must resolve against this file, not against dist/index.mjs.
import wispDefault, { wisp, wispSync } from "../../../dist/index.mjs";

const sync = wispSync("./caller-data.json");
const up = wispSync("../nested/ok.json");
const first = await wisp("./caller-data.json");
const second = await wispDefault("./caller-data.json");

process.stdout.write(JSON.stringify({ sync, up, async: first, sameObject: first === second }));
