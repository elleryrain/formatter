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
  console.log("file_name: ", file);
  const filePath = path.join(FILES_DIR, file);
  console.log(`Обрабатываю ${filePath}`);

  const xmlContent = fs.readFileSync(filePath, "utf-8");

  const json = parser.parse(xmlContent);

  if (json.Drawable?.Name) {
    json.Drawable.Name = (json.Drawable.Name as string).replace(/\.model$/, "");
  }

  const newXml = builder.build(json);

  const newFileName = file.replace(/\.model(?=\.ydr\.xml$)/, "");
  const newFilePath = path.join(FILES_DIR, newFileName);

  if (file.includes(".model")) {
    fs.unlinkSync(filePath);
    console.log(`Удалён старый файл: ${file}`);
  }

  fs.writeFileSync(newFilePath, newXml, "utf-8");
  console.log(`Создан новый файл: ${newFileName}`);
}
