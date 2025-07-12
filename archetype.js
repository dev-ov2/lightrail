import fs from "fs";
import path from "path";
const CONFIG_FILE = path.join(process.cwd(), "server-configs.json");

export function loadArchetypes() {
  if (!fs.existsSync(CONFIG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return [];
  }
}

export function saveArchetypes(archetypes) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(archetypes, null, 2));
}
