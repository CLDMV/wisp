// Loads the package by name through its ESM entry and resolves relative paths, which wisp
// must resolve against this file. Run with `--conditions=wisp-dev` the name resolves to
// src/index.mjs; without it, to the built dist/index.mjs. `entry` reports which one loaded.
import path from "node:path";
import { fileURLToPath } from "node:url";
import wispDefault, { wisp, wispSync } from "@cldmv/wisp";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const entry = path.relative(repoRoot, fileURLToPath(import.meta.resolve("@cldmv/wisp"))).split(path.sep).join("/");
const sync = wispSync("./caller-data.json");
const up = wispSync("../nested/ok.json");
const [first, second] = await Promise.all([wisp("./caller-data.json"), wispDefault("./caller-data.json")]);

process.stdout.write(JSON.stringify({ entry, sync, up, async: first, sameObject: first === second }));
