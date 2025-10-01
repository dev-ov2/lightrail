const fs = require("fs");
const path = require("path");
const { getConfigDir, ensureDir } = require("../../platform.js");

const CONFIG_DIR = ensureDir(getConfigDir());
const CONFIG_FILE = path.join(CONFIG_DIR, "server-profiles.json");

function loadProfiles() {
  if (!fs.existsSync(CONFIG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveProfiles(profiles) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(profiles, null, 2));
}
module.exports = { loadProfiles, saveProfiles };
