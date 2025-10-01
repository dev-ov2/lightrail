import fs from "fs";
import path from "path";
import { getConfigDir, ensureDir } from "../../platform.js";

const CONFIG_DIR = ensureDir(getConfigDir());
const SERVERS_FILE = path.join(CONFIG_DIR, "servers.json");

export function loadServers() {
  if (!fs.existsSync(SERVERS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SERVERS_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function saveServers(servers) {
  fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers, null, 2));
}
