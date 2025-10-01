const fs = require("fs");
const path = require("path");
const { getConfigDir, ensureDir } = require("../../platform.js");

const CONFIG_DIR = ensureDir(getConfigDir());
const SERVERS_FILE = path.join(CONFIG_DIR, "servers.json");

function loadServers() {
  if (!fs.existsSync(SERVERS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SERVERS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveServers(servers) {
  fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers, null, 2));
}

module.exports = { loadServers, saveServers };
