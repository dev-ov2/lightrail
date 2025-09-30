import inquirer from "inquirer";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

async function promptForMinecraftConfig(defaults = {}) {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Profile name:",
      default: defaults.name || "Lightrail Minecraft Server",
    },
    {
      type: "input",
      name: "dir",
      message: "Server install directory:",
      default: defaults.dir || "C:/lightrail/minecraft",
    },
    {
      type: "input",
      name: "jarFile",
      message: "Minecraft server JAR file:",
      default: defaults.jarFile || "server.jar",
    },
    {
      type: "input",
      name: "javaPath",
      message: "Java executable path:",
      default: defaults.javaPath || "java",
    },
    {
      type: "input",
      name: "maxMemory",
      message: "Max memory (e.g. 2G, 4096M):",
      default: defaults.maxMemory || "2G",
    },
    {
      type: "input",
      name: "minMemory",
      message: "Min memory (e.g. 1G, 1024M):",
      default: defaults.minMemory || "1G",
    },
    {
      type: "input",
      name: "serverPort",
      message: "Server port:",
      default: defaults.serverPort || 25565,
    },
    {
      type: "input",
      name: "motd",
      message: "Message of the Day (MOTD):",
      default: defaults.motd || "Welcome to Lightrail Minecraft!",
    },
    {
      type: "input",
      name: "maxPlayers",
      message: "Max players:",
      default: defaults.maxPlayers || 20,
    },
    {
      type: "confirm",
      name: "onlineMode",
      message: "Enable online mode (auth with Mojang)?",
      default: defaults.onlineMode ?? true,
    },
    {
      type: "confirm",
      name: "whiteList",
      message: "Enable whitelist?",
      default: defaults.whiteList ?? false,
    },
    {
      type: "input",
      name: "levelName",
      message: "World name:",
      default: defaults.levelName || "world",
    },
    {
      type: "input",
      name: "difficulty",
      message: "Difficulty (peaceful, easy, normal, hard):",
      default: defaults.difficulty || "normal",
    },
    {
      type: "input",
      name: "gamemode",
      message: "Gamemode (survival, creative, adventure, spectator):",
      default: defaults.gamemode || "survival",
    },
    {
      type: "input",
      name: "additionalArgs",
      message: "Additional JVM/server arguments (optional):",
      default: defaults.additionalArgs || "",
    },
  ]);
  return answers;
}

async function promptForMinecraftServerInstance(defaults = {}) {
  // Common launch params for Minecraft
  const launchParams = [
    {
      name: "--nogui",
      desc: "Run server without GUI.",
      value: false,
      default: true,
    },
    {
      name: "--forceUpgrade",
      desc: "Force upgrade world to newest format.",
      value: false,
      default: false,
    },
    {
      name: "--demo",
      desc: "Run server in demo mode.",
      value: false,
      default: false,
    },
  ];

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "id",
      message: "Server ID (unique, no spaces):",
      default: defaults.id || "",
    },
    {
      type: "input",
      name: "serverName",
      message: "Server Name:",
      default: defaults.serverName || "",
    },
    {
      type: "checkbox",
      name: "launchParams",
      message: "Select Minecraft launch parameters (space to select):",
      choices: launchParams.map((p) => ({
        name: `${p.name} - ${p.desc}`,
        value: p.name,
        short: p.name,
        checked: p.default,
      })),
      default: launchParams.filter((p) => p.default).map((p) => p.name),
    },
    {
      type: "input",
      name: "serverPort",
      message: "Server port:",
      default: defaults.serverPort || 25565,
    },
    {
      type: "input",
      name: "maxPlayers",
      message: "Max players:",
      default: defaults.maxPlayers || 20,
    },
    {
      type: "input",
      name: "motd",
      message: "Message of the Day (MOTD):",
      default: defaults.motd || "Welcome to Lightrail Minecraft!",
    },
    {
      type: "input",
      name: "levelName",
      message: "World name:",
      default: defaults.levelName || "world",
    },
    {
      type: "input",
      name: "difficulty",
      message: "Difficulty (peaceful, easy, normal, hard):",
      default: defaults.difficulty || "normal",
    },
    {
      type: "input",
      name: "gamemode",
      message: "Gamemode (survival, creative, adventure, spectator):",
      default: defaults.gamemode || "survival",
    },
    {
      type: "confirm",
      name: "onlineMode",
      message: "Enable online mode (auth with Mojang)?",
      default: defaults.onlineMode ?? true,
    },
    {
      type: "confirm",
      name: "whiteList",
      message: "Enable whitelist?",
      default: defaults.whiteList ?? false,
    },
    {
      type: "input",
      name: "additionalArgs",
      message: "Additional JVM/server arguments (optional):",
      default: defaults.additionalArgs || "",
    },
  ]);
  // Collect param values
  const paramValues = {};
  for (const p of launchParams) {
    if (
      answers.launchParams &&
      answers.launchParams.includes(p.name) &&
      p.value
    ) {
      paramValues[p.name] = true;
    }
  }
  answers.launchParamValues = paramValues;
  return answers;
}

function startMinecraftServer(profile, serverInstance) {
  // Build the command
  const javaPath = profile.javaPath || "java";
  const jarFile = path.join(profile.dir, profile.jarFile || "server.jar");
  const minMem = profile.minMemory || "1G";
  const maxMem = profile.maxMemory || "2G";
  const additionalArgs =
    serverInstance.additionalArgs || profile.additionalArgs || "";
  const launchParams = Array.isArray(serverInstance.launchParams)
    ? serverInstance.launchParams
    : [];
  const args = [
    `-Xms${minMem}`,
    `-Xmx${maxMem}`,
    ...(additionalArgs ? additionalArgs.split(" ") : []),
    "-jar",
    jarFile,
    ...launchParams,
    "--port",
    serverInstance.serverPort || 25565,
    "--max-players",
    serverInstance.maxPlayers || 20,
    "--motd",
    `"${serverInstance.motd || "Welcome to Lightrail Minecraft!"}"`,
    "--level-name",
    serverInstance.levelName || "world",
    "--difficulty",
    serverInstance.difficulty || "normal",
    "--gamemode",
    serverInstance.gamemode || "survival",
    ...(serverInstance.onlineMode
      ? ["--online-mode", "true"]
      : ["--online-mode", "false"]),
    ...(serverInstance.whiteList
      ? ["--white-list", "true"]
      : ["--white-list", "false"]),
  ];

  // Ensure server directory exists
  if (!fs.existsSync(profile.dir)) {
    fs.mkdirSync(profile.dir, { recursive: true });
  }

  console.log("Starting Minecraft server...");
  console.log("Command:", javaPath, args.join(" "));
  const proc = spawn(javaPath, args, {
    cwd: profile.dir,
    stdio: "inherit",
    shell: true,
  });
  serverInstance._process = proc;
  serverInstance._pid = proc.pid;
  return proc;
}

function killMinecraftServer(serverInstance) {
  if (
    serverInstance &&
    serverInstance._process &&
    !serverInstance._process.killed
  ) {
    try {
      serverInstance._process.kill();
      console.log("Minecraft server process killed.");
    } catch (err) {
      console.error("Failed to kill Minecraft server process:", err.message);
    }
  } else {
    console.log("No active Minecraft server process found.");
  }
}

export {
  promptForMinecraftConfig,
  promptForMinecraftServerInstance,
  startMinecraftServer,
  killMinecraftServer,
};
export default {
  promptForMinecraftConfig,
  promptForMinecraftServerInstance,
  startMinecraftServer,
  killMinecraftServer,
};
