import path from "node:path";
import fs from "node:fs";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

const FILES_DIR = path.join(__dirname, "../files");

const parser = new XMLParser({ ignoreAttributes: false });
const builder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
  indentBy: "    ",
});

const files = fs.readdirSync(FILES_DIR).filter((f) => f.endsWith(".xml"));

for (const file of files) {
  const filePath = path.join(FILES_DIR, file);
  console.log(`Обрабатываю ${filePath}`);

  const xmlContent = fs.readFileSync(filePath, "utf-8");
  const json = parser.parse(xmlContent);
  if (json.Drawable && json.Drawable.Name) {
    json.Drawable.Name = (json.Drawable.Name as string).replace(/\.model$/, "");
  }
  console.log(json);
  const newXml = builder.build(json);
  fs.writeFileSync(filePath, newXml, "utf-8");
  console.log(`Закончил обработку ${filePath}`);
}
