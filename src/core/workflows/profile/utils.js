import fs from "fs";
import path from "path";
import { getConfigDir, ensureDir } from "../../platform.js";

const CONFIG_DIR = ensureDir(getConfigDir());
const CONFIG_FILE = path.join(CONFIG_DIR, "server-profiles.json");

export function loadProfiles() {
  if (!fs.existsSync(CONFIG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return [];
  }
}

export function saveProfiles(profiles) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(profiles, null, 2));
}
export default { loadProfiles, saveProfiles };
