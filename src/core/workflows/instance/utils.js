import fs from "fs";
import path from "path";

const CONFIG_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME,
  "Documents",
  "lightrail"
);
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}
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
