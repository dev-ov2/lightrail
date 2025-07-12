#!/usr/bin/env node
import inquirer from "inquirer";
import { loadArchetypes, saveArchetypes } from "./archetype.js";
import { startServer, killServer } from "./serverManager.js";
import { scheduleRestart } from "./scheduler.js";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import isAdmin from "is-admin";
import sudo from "sudo-prompt";
import { spawn } from "child_process";
const pkg = JSON.parse(
  fs.readFileSync(new URL("./package.json", import.meta.url))
);

const SERVERS_FILE = path.join(process.cwd(), "servers.json");

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

async function promptForConfig(game, defaults = {}) {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Configuration name:",
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
    { type: "input", name: "worldName", message: "World Name:" },
    { type: "input", name: "Port", message: "Port:" },
    { type: "input", name: "RCONPort", message: "RCON Port:" },
  ]);
  return answers;
}

export async function main() {
  // Flashy landing page
  console.clear();
  console.log(
    chalk.bold(
      `\n ----- ---   ----   ---- ----     ----      -` +
        `\n     ---- ---     ------- ---- ---    ----- --` +
        `\n -----     -------     ----- ------      --` +
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
    chalk.greenBright.bold(
      "\n" + " Something something CLI is best something... " + "\n"
    )
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

  const games = ["Ark: Survival Ascended"];
  const { game } = await inquirer.prompt([
    {
      type: "list",
      name: "game",
      message: "Select game:",
      choices: games,
      default: games[0],
    },
  ]);

  let archetypes = loadArchetypes();
  let archetypeChoices = archetypes.map((cfg, idx) => ({
    name: cfg.name,
    value: idx,
  }));
  archetypeChoices.push({ name: "Create new server type", value: "new" });
  const { archetypeIdx } = await inquirer.prompt([
    {
      type: "list",
      name: "archetypeIdx",
      message: "Select server type (archetype):",
      choices: archetypeChoices,
    },
  ]);

  let archetype;
  if (archetypeIdx === "new") {
    archetype = await promptForConfig(game);
    if (!archetype) return;
    archetypes.push(archetype);
    saveArchetypes(archetypes);
    console.log("New server type saved.");
  } else {
    archetype = archetypes[archetypeIdx];
    if (game === "Ark: Survival Ascended" && !archetype.appid) {
      archetype.appid = "2430930";
      saveArchetypes(archetypes);
    }
  }

  let serversData = loadServers();
  if (!serversData[game]) serversData[game] = [];
  let archetypeServers = serversData[game].find(
    (s) => s.archetype === archetype.name
  );
  if (!archetypeServers) {
    archetypeServers = { archetype: archetype.name, servers: [] };
    serversData[game].push(archetypeServers);
  }
  let serverChoices = archetypeServers.servers.map((srv, idx) => ({
    name: `${srv.worldName} (Port: ${srv.Port}, RCON: ${srv.RCONPort})`,
    value: idx,
  }));
  serverChoices.push(new inquirer.Separator());
  serverChoices.push({ name: "Create new server instance", value: "new" });
  serverChoices.push(new inquirer.Separator());
  serverChoices.push({
    name: `Update archetype (${archetype.name})`,
    value: "update_archetype",
  });
  const { serverIdx } = await inquirer.prompt([
    {
      type: "list",
      name: "serverIdx",
      message: `Select server instance for archetype '${archetype.name}':`,
      choices: serverChoices,
      pageSize: 10,
    },
  ]);

  let serverInstance;
  if (serverIdx === "new") {
    console.log(
      "\n------------------------------\nCreating new server instance\n------------------------------"
    );
    serverInstance = await promptForServerInstance();
    archetypeServers.servers.push(serverInstance);
    saveServers(serversData);
    console.log("New server instance saved.");
  } else if (serverIdx === "update_archetype") {
    console.log(
      "\n------------------------------\nUpdating archetype\n------------------------------"
    );
    const updated = await promptForConfig(game, archetype);
    if (!updated) return;
    if (game === "Ark: Survival Ascended") updated.appid = "2430930";
    archetypes[archetypeIdx] = updated;
    saveArchetypes(archetypes);
    console.log("Archetype updated.");
    return main();
  } else {
    serverInstance = archetypeServers.servers[serverIdx];
  }

  if (
    !serverInstance.worldName ||
    !serverInstance.Port ||
    !serverInstance.RCONPort
  ) {
    console.error("ERROR: You must provide all three arguments!");
    process.exit(1);
  }

  // Check for admin rights (Windows only)
  if (!(await isAdmin())) {
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
  console.log("Running with administrator privileges...");

  // Start server and schedule restart if needed
  startServer(archetype, serverInstance);
  console.log("serverInstance", serverInstance);
  if (archetype.restartTime) {
    scheduleRestart(
      archetype,
      serverInstance,
      archetype.restartTime,
      archetype.updateBeforeRestart
    );
    console.log(
      `Restart scheduled for ${archetype.restartTime} (update: ${
        archetype.updateBeforeRestart ? "yes" : "no"
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
