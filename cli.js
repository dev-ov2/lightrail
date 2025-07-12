#!/usr/bin/env node
import inquirer from "inquirer";
import { startServer, killServer } from "./serverManager.js";
import { scheduleRestart } from "./scheduler.js";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import isAdmin from "is-admin";
import sudo from "sudo-prompt";
import { spawn, execSync } from "child_process";
const pkg = JSON.parse(
  fs.readFileSync(new URL("./package.json", import.meta.url))
);

const CONFIG_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME,
  "Documents",
  "lightrail"
);
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}
const SERVERS_FILE = path.join(CONFIG_DIR, "servers.json");
const PROFILES_FILE = path.join(CONFIG_DIR, "server-profiles.json");

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

import { loadProfiles, saveProfiles } from "./archetype.js";

async function promptForConfig(game, defaults = {}) {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Profile name:",
      default: defaults.name || "Lightrail Server",
    },
    {
      type: "input",
      name: "dir",
      message: "Server install directory:",
      default: defaults.dir || "C:/lightrail/ark",
    },
    {
      type: "input",
      name: "clusterDir",
      message: "Cluster directory (optional):",
      default: defaults.clusterDir || "",
    },
    {
      type: "input",
      name: "mods",
      message: "Mods (optional, ex: '21854,22852'):",
      default: defaults.mods || "",
    },
    {
      type: "input",
      name: "steamcmd",
      message: "SteamCMD executable path:",
      default: defaults.steamcmd || "C:/steamcmd/steamcmd.exe",
    },
    {
      type: "input",
      name: "adminPassword",
      message: "Server admin password:",
      default: defaults.adminPassword || "lightrail",
    },
    {
      type: "input",
      name: "clusterID",
      message: "Cluster ID (default 'lightrail'):",
      default: defaults.clusterID || "lightrail",
    },
    {
      type: "input",
      name: "restartTime",
      message: "Restart time (HH:mm, optional):",
      default: defaults.restartTime || "",
    },
    {
      type: "confirm",
      name: "updateBeforeRestart",
      message: "Update server before restart?",
      default: defaults.updateBeforeRestart ?? true,
    },
  ]);
  if (!answers) return null;
  if (game === "Ark: Survival Ascended") answers.appid = "2430930";
  return answers;
}

async function promptForServerInstance() {
  const answers = await inquirer.prompt([
    { type: "input", name: "serverName", message: "Server Name:" },
    { type: "input", name: "worldName", message: "World Name:" },
    { type: "input", name: "Port", message: "Port:" },
    { type: "input", name: "RCONPort", message: "RCON Port:" },
    {
      type: "confirm",
      name: "updateNow",
      message: "Update server right now?",
      default: false,
    },
  ]);
  return answers;
}

function showLandingScreen() {
  console.log(
    chalk.bold(
      `\n ----- ---   ----   ---- ----     ----      -` +
        `\n     ---- ---     ------- ---- ---    ----- --` +
        `\n -----     -------     ----- ------      --` +
        `\n     __ _       _     _             _ _ ` +
        `\n    / /(_) __ _| |__ | |_ _ __ __ _(_) |` +
        `\n   / / | |/ _\` | '_ \\| __| \'__/ _\` | | |` +
        `\n  / /__| | (_| | | | | |_| | | (_| | | |` +
        `\n  \\____/_|\\_,  |_| |_|\\__|_|  \\__,_|_|_|` +
        `\n          |___/                         ` +
        `\n ----- ---   ----   ---- ----     ----      -` +
        `\n     ---- ---     ------- ---- ---    ----- --` +
        `\n -----     -------     ----- ------      --`
    )
  );
  console.log(chalk.cyanBright.bold(`Lightrail CLI v${pkg.version}`));
  console.log(
    chalk.cyanBright.bold(
      "═════════════════════════════════════════════════════════════════════════════════"
    )
  );
  console.log(
    chalk.yellowBright.bold(
      "Welcome to " +
        chalk.magentaBright.bold("Lightrail") +
        " - A Server Manager CLI tool!"
    )
  );
  console.log(
    chalk.greenBright.bold("\n" + " Why use anything else...? " + "\n")
  );
  console.log(
    chalk.cyanBright(
      "───────────────────────────────────────────────────────────────────────────────"
    )
  );
  console.log(
    chalk.whiteBright(
      chalk.bold("Tip:") +
        " Use arrow keys to navigate, and Ctrl+C to exit at any time."
    )
  );
  console.log(
    chalk.cyanBright(
      "───────────────────────────────────────────────────────────────────────────────\n"
    )
  );
}

let childProcesses = [];
function scanChildProcesses() {
  // Scan for new child processes every 10 seconds
  setInterval(() => {
    childProcesses = childProcesses.filter((cp) => !cp.killed);
    // Optionally, scan for new children here (custom logic if needed)
  }, 10000);
}

function registerChildProcess(proc, profile = null, serverName = null) {
  childProcesses.push(proc);
  proc.on("exit", () => {
    console.clear();
    showLandingScreen();
    console.log(
      chalk.redBright(
        "Child process exited. Killing server and restarting CLI..."
      )
    );
    killServer();
    setTimeout(() => main(), 1000);
  });
  // Set console title to show profile and server name if provided
  if (profile && serverName) {
    setConsoleTitle("", profile, serverName);
  }
}

function setConsoleTitle(state, profile = null, serverName = null) {
  let title = state;
  if (profile && serverName) {
    title = `${profile} · ${serverName}`;
    process.stdout.write(`\x1b]0;${title}\x07`);
    return;
  }
  // Replace all '-' with '|'
  title = title.replace(/-/g, "|");
  if (process.platform === "win32") {
    process.stdout.write(`\x1b]0;Lightrail | ${title}\x07`);
  }
}

export async function main() {
  // Always clear and redraw landing screen before each prompt
  setConsoleTitle("Landing");
  console.clear();
  showLandingScreen();

  const games = ["Ark: Survival Ascended"];
  setConsoleTitle("Select Game");
  const { game } = await inquirer.prompt([
    {
      type: "list",
      name: "game",
      message: "Select game:",
      choices: games,
      default: games[0],
    },
  ]);

  setConsoleTitle("Select Profile");
  console.clear();
  showLandingScreen();

  let profiles = loadProfiles();
  let profileChoices = profiles.map((cfg, idx) => ({
    name: cfg.name,
    value: idx,
  }));
  profileChoices.push({ name: "Create new server profile", value: "new" });
  const { profileIdx } = await inquirer.prompt([
    {
      type: "list",
      name: "profileIdx",
      message: "Select server profile:",
      choices: profileChoices,
    },
  ]);

  setConsoleTitle("Select Server Instance");
  console.clear();
  showLandingScreen();

  let profile;
  if (profileIdx === "new") {
    setConsoleTitle("Create Profile");
    profile = await promptForConfig(game);
    if (!profile) return;
    profiles.push(profile);
    saveProfiles(profiles);
    setConsoleTitle("Profile Saved");
    console.clear();
    showLandingScreen();
    console.log("New server profile saved.");
  } else {
    profile = profiles[profileIdx];
    if (game === "Ark: Survival Ascended" && !profile.appid) {
      profile.appid = "2430930";
      saveProfiles(profiles);
    }
  }

  let serversData = loadServers();
  if (!serversData[game]) serversData[game] = [];
  let profileServers = serversData[game].find(
    (s) => s.profile === profile.name
  );
  if (!profileServers) {
    profileServers = { profile: profile.name, servers: [] };
    serversData[game].push(profileServers);
  }
  let serverChoices = profileServers.servers.map((srv, idx) => ({
    name: `${srv.worldName} (Port: ${srv.Port}, RCON: ${srv.RCONPort})`,
    value: idx,
  }));
  serverChoices.push(new inquirer.Separator());
  serverChoices.push({ name: "Create new server instance", value: "new" });
  serverChoices.push(new inquirer.Separator());
  serverChoices.push({
    name: `Update server profile (${profile.name})`,
    value: "update_profile",
  });
  setConsoleTitle("Select Server Instance");
  console.clear();
  showLandingScreen();
  const { serverIdx } = await inquirer.prompt([
    {
      type: "list",
      name: "serverIdx",
      message: `Select server instance for profile '${profile.name}':`,
      choices: serverChoices,
      pageSize: 10,
    },
  ]);

  let serverInstance;
  if (serverIdx === "new") {
    setConsoleTitle("Create Server Instance");
    console.clear();
    showLandingScreen();
    console.log("Creating new server instance");
    serverInstance = await promptForServerInstance();
    profileServers.servers.push(serverInstance);
    saveServers(serversData);
    setConsoleTitle("Server Instance Saved");
    console.clear();
    showLandingScreen();
    console.log("New server instance saved.");
  } else if (serverIdx === "update_profile") {
    setConsoleTitle("Update Profile");
    console.clear();
    showLandingScreen();
    console.log("Updating server profile");
    const updated = await promptForConfig(game, profile);
    if (!updated) return;
    if (game === "Ark: Survival Ascended") updated.appid = "2430930";
    profiles[profileIdx] = updated;
    saveProfiles(profiles);
    setConsoleTitle("Profile Updated");
    console.clear();
    showLandingScreen();
    console.log("Server profile updated.");
    return main();
  } else {
    serverInstance = profileServers.servers[serverIdx];
    setConsoleTitle("Server Instance Selected");
    console.clear();
    showLandingScreen();
    // Prompt for update after selection
    const { updateNow } = await inquirer.prompt([
      {
        type: "confirm",
        name: "updateNow",
        message: "Update server right now?",
        default: false,
      },
    ]);
    serverInstance.updateNow = updateNow;
  }

  if (
    !serverInstance.worldName ||
    !serverInstance.Port ||
    !serverInstance.RCONPort
  ) {
    setConsoleTitle("Error");
    console.clear();
    showLandingScreen();
    console.error("ERROR: You must provide all three arguments!");
    process.exit(1);
  }

  // Check for admin rights (Windows only)
  setConsoleTitle("Admin Check");
  if (!(await isAdmin())) {
    setConsoleTitle("Requesting Admin");
    console.clear();
    showLandingScreen();
    console.log(
      chalk.yellowBright(
        "Administrator privileges required. Attempting to relaunch as administrator..."
      )
    );
    const scriptPath = process.argv[1];
    const args = process.argv.slice(2).join(" ");
    sudo.exec(
      `node "${scriptPath}" ${args}`,
      { name: "Lightrail" },
      (error, stdout, stderr) => {
        if (error) {
          setConsoleTitle("Admin Relaunch Failed");
          console.clear();
          showLandingScreen();
          console.error(
            chalk.redBright("Failed to restart as administrator:"),
            error
          );
          process.exit(1);
        }
        process.exit(0);
      }
    );
    return;
  }
  setConsoleTitle("Running as Admin");
  console.clear();
  showLandingScreen();
  console.log("Running with administrator privileges...");

  // Update server with SteamCMD if selected
  if (serverInstance.updateNow) {
    setConsoleTitle("Updating Server");
    console.clear();
    showLandingScreen();
    // Run SteamCMD update before starting server

    try {
      const steamcmdArgs = [
        "+force_install_dir",
        path.join(profile.dir, serverInstance.worldName),
        "+login",
        "anonymous",
        "+app_update",
        profile.appid,
        "validate",
        "+quit",
      ];
      console.log("Updating server with SteamCMD...");
      const steamcmdProc = spawn(profile.steamcmd, steamcmdArgs, {
        stdio: "inherit",
      });
      registerChildProcess(steamcmdProc);
      await new Promise((resolve, reject) => {
        steamcmdProc.on("close", (code) => {
          if (code === 0) {
            setConsoleTitle("SteamCMD Success");
            console.log("Success.");
            resolve();
          } else {
            setConsoleTitle("SteamCMD Failed");
            console.log("Failed.");
            reject(new Error("SteamCMD update failed."));
          }
        });
      });
    } catch (err) {
      setConsoleTitle("SteamCMD Error");
      console.log("Failed.");
      console.error("SteamCMD update failed:", err.message);
    }
  }

  // Start server and schedule restart if needed
  setConsoleTitle("Starting Server", profile.name, serverInstance.serverName);
  console.clear();
  showLandingScreen();
  const serverProc = startServer(profile, serverInstance);
  registerChildProcess(serverProc);
  scanChildProcesses();
  if (profile.restartTime) {
    setConsoleTitle(
      "Scheduled Restart",
      profile.name,
      serverInstance.serverName
    );
    scheduleRestart(
      profile,
      serverInstance,
      profile.restartTime,
      profile.updateBeforeRestart
    );
    console.clear();
    showLandingScreen();
    console.log(
      `Restart scheduled for ${profile.restartTime} (update: ${
        profile.updateBeforeRestart ? "yes" : "no"
      })`
    );
  }
}

try {
  await main();
} catch (err) {
  if (err && err.name === "ExitPromptError") {
    console.log("\nPrompt cancelled by user (Ctrl+C). Exiting...");
    process.exit(0);
  }
  throw err;
}
