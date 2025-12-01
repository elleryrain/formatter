import path from "node:path";
import fs from "node:fs";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  indentBy: "    ",
});

const FILES_DIR = path.join(__dirname, "../files");

const files = fs
  .readdirSync(FILES_DIR)
  .filter((f) => f.toLowerCase().endsWith(".xml"));

console.log(`Найдено файлов: ${files.length}`);

let processed = 0;
let changed = 0;

for (const file of files) {
  const filePath = path.join(FILES_DIR, file);
  const xmlContent = fs.readFileSync(filePath, "utf-8");

  try {
    const json = parser.parse(xmlContent);

    const archetypes = json?.CMapTypes?.archetypes;
    if (!archetypes?.Item) {
      processed++;
      continue;
    }

    const items = Array.isArray(archetypes.Item)
      ? archetypes.Item
      : [archetypes.Item];

    let fileModified = false;

    for (const item of items) {
      // type может быть и атрибутом, и элементом (на всякий случай)
      const typeValue = item["@_type"] || item.type;
      if (typeValue !== "CBaseArchetypeDef") continue;

      // 1) читаем name либо из атрибута, либо из тега
      const nameValue =
        (typeof item["@_name"] === "string" && item["@_name"].trim()) ||
        (typeof item.name === "string" && item.name.trim()) ||
        "";

      if (!nameValue) continue;

      // 2) читаем textureDictionary: сначала атрибут, потом тег
      let textureAttr =
        typeof item["@_textureDictionary"] === "string"
          ? item["@_textureDictionary"]
          : null;

      let textureTag =
        typeof item.textureDictionary === "string"
          ? item.textureDictionary
          : null;

      const currentTexture = (textureAttr || textureTag || "").trim();

      if (currentTexture === nameValue) continue;

      // 3) Обновляем в том формате, который уже есть

      if (textureAttr !== null) {
        // формат через атрибут
        item["@_textureDictionary"] = nameValue;
      } else if (textureTag !== null) {
        // формат через тег <textureDictionary>value</textureDictionary>
        item.textureDictionary = nameValue;
      } else if (item["@_name"]) {
        // нет textureDictionary вообще, но name — атрибут
        item["@_textureDictionary"] = nameValue;
      } else {
        // нет textureDictionary, но name — тег
        item.textureDictionary = nameValue;
      }

      fileModified = true;
      changed++;
    }

    if (fileModified) {
      const newXml = builder.build(json);
      fs.writeFileSync(filePath, newXml, "utf-8");
    }

    processed++;
  } catch (err) {
    console.error(`Ошибка при обработке файла ${file}:`, err);
  }
}

console.log("Готово!");
console.log(`Обработано файлов: ${processed}`);
console.log(`Заменено значений textureDictionary: ${changed}`);
