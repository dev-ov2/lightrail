import fs from "fs";
import path from "path";
import os from "os";

// Determine platform with optional override via env var LIGHTRAIL_PLATFORM
// Accepted overrides: 'windows', 'linux'
export function getPlatform() {
  const override = (process.env.LIGHTRAIL_PLATFORM || "").toLowerCase();
  if (override === "windows") return "windows";
  if (override === "linux") return "linux";
  return process.platform === "win32" ? "windows" : "linux"; // treat others as linux-like for path purposes
}

export function isWindows() {
  return getPlatform() === "windows";
}

export function isLinux() {
  return getPlatform() === "linux";
}

// Config directory: Windows => %USERPROFILE%/Documents/lightrail
// Linux => $XDG_CONFIG_HOME/lightrail or ~/.config/lightrail
export function getConfigDir() {
  if (isWindows()) {
    const base = process.env.USERPROFILE || os.homedir();
    return path.join(base, "Documents", "lightrail");
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.trim() ? xdg : path.join(os.homedir(), ".config");
  return path.join(base, "lightrail");
}

// Map short game keys used internally to folder names
// ark => ark, palworld => palworld, soulmask => soulmask, minecraft => minecraft
export function getDefaultGameDir(gameKey) {
  const home = os.homedir();
  if (isWindows()) {
    // Keep prior convention on Windows C:/lightrail/<game>
    // If USERPROFILE drive differs from C:, still use that drive root.
    const driveRoot = (process.env.SYSTEMDRIVE || "C:") + "/";
    return path.join(driveRoot, "lightrail", gameKey);
  }
  // Linux: use ~/lightrail/<game>
  return path.join(home, "lightrail", gameKey);
}

export function getDefaultSteamCmdPath() {
  if (isWindows()) {
    return "C:/steamcmd/steamcmd.exe";
  }
  // Common install paths on Debian/Ubuntu: /usr/games/steamcmd (package) else /usr/bin/steamcmd
  if (fs.existsSync("/usr/games/steamcmd")) return "/usr/games/steamcmd";
  if (fs.existsSync("/usr/bin/steamcmd")) return "/usr/bin/steamcmd";
  return "steamcmd"; // rely on PATH
}

export function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export default {
  getPlatform,
  isWindows,
  isLinux,
  getConfigDir,
  getDefaultGameDir,
  getDefaultSteamCmdPath,
  ensureDir,
};
