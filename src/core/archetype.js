const fs = require("fs");
const path = require("path");

const CONFIG_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME,
  "Documents",
  "lightrail"
);
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}
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
