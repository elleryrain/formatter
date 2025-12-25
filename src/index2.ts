import fs from "node:fs";
import path from "node:path";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

type AnyObj = Record<string, any>;

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function usageAndExit(): never {
  console.error(`
Usage:
  yarn rewrite-ymap --file <path.xml> --name <newName> --flags <newFlagsValue> --lodDist <newLodDistValue> [--out <out.xml>]

Examples:
  yarn rewrite-ymap --file uralsk_houses.ymap.xml --name HouseA --flags 123 --lodDist 150
  yarn rewrite-ymap --file uralsk_houses.ymap.xml --name Same --flags Same --lodDist Same
`);
  process.exit(1);
}

const file = getArg("--file");
const out = getArg("--out");
const newName = getArg("--name");
const newFlags = getArg("--flags");
const newLodDist = getArg("--lodDist");

if (!file || !newName || !newFlags || !newLodDist) usageAndExit();

const inPath = path.resolve(process.cwd(), "files", file);
const outPath = path.resolve(process.cwd(), "files", out ?? file);

if (!fs.existsSync(inPath)) {
  console.error(`File not found: ${inPath}`);
  process.exit(2);
}

const xmlText = fs.readFileSync(inPath, "utf8");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",

  allowBooleanAttributes: true,

  processEntities: true,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  suppressEmptyNode: false,
  format: true,
});

let obj: any;
try {
  obj = parser.parse(xmlText);
} catch (e: any) {
  console.error("XML parse error:", e?.message ?? e);
  process.exit(3);
}

let nameChanged = 0;
let flagsChanged = 0;
let lodDistChanged = 0;

function walk(node: any): void {
  if (node == null) return;

  if (Array.isArray(node)) {
    for (const item of node) walk(item);
    return;
  }

  if (typeof node !== "object") return;

  for (const key of Object.keys(node)) {
    const val = node[key];

    if (key === "name") {
      node[key] = newName;
      nameChanged++;
      continue;
    }

    if (key === "flags") {
      if (Array.isArray(val)) {
        for (const v of val) {
          if (v && typeof v === "object") {
            v["@_value"] = newFlags;
            flagsChanged++;
          }
          walk(v);
        }
      } else if (val && typeof val === "object") {
        val["@_value"] = newFlags;
        flagsChanged++;
        walk(val);
      } else {
        node[key] = { "@_value": newFlags };
        flagsChanged++;
      }
      continue;
    }

    if (key === "lodDist") {
      if (Array.isArray(val)) {
        for (const v of val) {
          if (v && typeof v === "object") {
            v["@_value"] = newLodDist;
            lodDistChanged++;
          }
          walk(v);
        }
      } else if (val && typeof val === "object") {
        val["@_value"] = newLodDist;
        lodDistChanged++;
        walk(val);
      } else {
        node[key] = { "@_value": newLodDist };
        lodDistChanged++;
      }
      continue;
    }

    walk(val);
  }
}

walk(obj);

const outXml = builder.build(obj);
fs.writeFileSync(outPath, outXml, "utf8");

console.log("Done.");
console.log(`Input:  ${inPath}`);
console.log(`Output: ${outPath}`);
console.log(`<name> updated: ${nameChanged} => "${newName}"`);
console.log(`<flags @value> updated: ${flagsChanged} => "${newFlags}"`);
console.log(`<lodDist @value> updated: ${lodDistChanged} => "${newLodDist}"`);
