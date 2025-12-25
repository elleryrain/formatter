import fs from "node:fs";
import path from "node:path";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function usage(): never {
  console.error(`
Usage:
  npx ts-node rewrite-ymap.ts --file <file.xml> --archetype <existingArchetypeName> --flags <value> --lodDist <value> [--out <out.xml>]

Meaning:
  --archetype  used as FILTER: only objects with archetypeName == this will be updated.
  --flags      new value for flags/@value (inside matched objects)
  --lodDist    new value for lodDist/@value (inside matched objects)
`);
  process.exit(1);
}

const file = getArg("--file");
const out = getArg("--out");
const archetypeFilter = getArg("--archetype");
const flagsValue = getArg("--flags");
const lodDistValue = getArg("--lodDist");

if (!file || !archetypeFilter || !flagsValue || !lodDistValue) usage();

const inPath = path.resolve(process.cwd(), "files", file);
const outPath = path.resolve(process.cwd(), "files", out ?? file);

if (!fs.existsSync(inPath)) {
  console.error(`File not found: ${inPath}`);
  process.exit(2);
}

const xml = fs.readFileSync(inPath, "utf8");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
});

let data: any;
try {
  data = parser.parse(xml);
} catch (e) {
  console.error("XML parse error:", e);
  process.exit(3);
}

let matchedObjects = 0;
let flagsChanged = 0;
let lodDistChanged = 0;

function setAttrValue(tag: any, newVal: string): void {
  // <flags /> может быть {}, "" или вообще отсутствовать — приводим к объекту
  if (tag == null) return;
  if (typeof tag !== "object") return;
  tag["@_value"] = newVal;
}

function updateInsideMatchedObject(obj: any): void {
  if (!obj || typeof obj !== "object") return;

  // flags
  if (obj.flags !== undefined) {
    if (Array.isArray(obj.flags)) {
      for (let i = 0; i < obj.flags.length; i++) {
        const v = obj.flags[i];
        if (v && typeof v === "object") obj.flags[i]["@_value"] = flagsValue;
        else obj.flags[i] = { "@_value": flagsValue };
        flagsChanged++;
      }
    } else if (obj.flags && typeof obj.flags === "object") {
      obj.flags["@_value"] = flagsValue;
      flagsChanged++;
    } else {
      obj.flags = { "@_value": flagsValue };
      flagsChanged++;
    }
  }

  // lodDist
  if (obj.lodDist !== undefined) {
    if (Array.isArray(obj.lodDist)) {
      for (let i = 0; i < obj.lodDist.length; i++) {
        const v = obj.lodDist[i];
        if (v && typeof v === "object")
          obj.lodDist[i]["@_value"] = lodDistValue;
        else obj.lodDist[i] = { "@_value": lodDistValue };
        lodDistChanged++;
      }
    } else if (obj.lodDist && typeof obj.lodDist === "object") {
      obj.lodDist["@_value"] = lodDistValue;
      lodDistChanged++;
    } else {
      obj.lodDist = { "@_value": lodDistValue };
      lodDistChanged++;
    }
  }
}

/**
 * Ищем по всему дереву объект(ы), у которых archetypeName === archetypeFilter.
 * ВАЖНО: archetypeName НЕ меняем, только используем как фильтр.
 */
function walk(node: any): void {
  if (node == null) return;

  if (Array.isArray(node)) {
    node.forEach(walk);
    return;
  }

  if (typeof node !== "object") return;

  // Проверяем "текущий объект" на совпадение archetypeName
  if (node.archetypeName === archetypeFilter) {
    matchedObjects++;
    updateInsideMatchedObject(node);
    // всё равно можно пройти глубже, если flags/lodDist вложены глубже (на всякий)
    // но archetypeName при этом не трогаем
  }

  // Рекурсивный обход всех полей
  for (const key of Object.keys(node)) {
    walk(node[key]);
  }
}

walk(data);

const outXml = builder.build(data);
fs.writeFileSync(outPath, outXml, "utf8");

console.log("✔ Done");
console.log(
  `Matched objects (archetypeName == "${archetypeFilter}"): ${matchedObjects}`
);
console.log(`flags @value updated: ${flagsChanged} => "${flagsValue}"`);
console.log(`lodDist @value updated: ${lodDistChanged} => "${lodDistValue}"`);
console.log(`Output: ${outPath}`);
