const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const inquirer = require("inquirer");
const {
  getDefaultGameDir,
  getDefaultSteamCmdPath,
} = require("../core/platform.js");

function getChildPids(parentPid) {
  if (process.platform !== "win32") return [];
  try {
    const stdout = execSync(
      `wmic process where (ParentProcessId=${parentPid}) get ProcessId`,
      { encoding: "utf8" }
    );
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d+$/.test(line))
      .map(Number);
  } catch {
    return [];
  }
}

function getAllChildPids(pid) {
  const directChildren = getChildPids(pid);
  let all = [...directChildren];
  for (const child of directChildren) {
    all = all.concat(getAllChildPids(child));
  }
  return all;
}

function startASAServer(profile, serverInstance) {
  const dir = path.join(profile.dir, serverInstance.worldName);
  const clusterDir = profile.clusterDir;
  const mods = profile.mods;
  const symlinkPath = path.join(
    dir,
    "ShooterGame",
    "Binaries",
    "Win64",
    "PlayersJoinNoCheckList.txt"
  );
  const clusterSymlinkSrc = path.join(clusterDir, "PlayersJoinNoCheckList.txt");

  // Delete symlink if exists
  try {
    if (fs.existsSync(symlinkPath)) {
      fs.unlinkSync(symlinkPath);
      console.log("Deleted symlink:", symlinkPath);
    }
  } catch (err) {
    console.warn("Could not delete symlink:", err.message);
  }

  // Create symlink
  try {
    fs.symlinkSync(clusterSymlinkSrc, symlinkPath, "file");
    console.log("Created symlink:", symlinkPath, "->", clusterSymlinkSrc);
  } catch (err) {
    console.warn("Could not create symlink:", err.message);
  }

  // Build command line
  let commandLine = `${serverInstance.worldName}?listen?Port=${serverInstance.Port}`;
  if (serverInstance.RCONPort) {
    commandLine += `?RCONEnabled=True?RCONPort=${serverInstance.RCONPort}`;
  }
  // Use adminPassword from serverInstance if present, else fallback to profile
  commandLine += `?ServerAdminPassword=${
    serverInstance.adminPassword || profile.adminPassword
  }`;
  const serverExe = path.join(
    dir,
    "ShooterGame",
    "Binaries",
    "Win64",
    "ArkAscendedServer.exe"
  );

  // Build args from selected launchParams and their values
  let args = [commandLine];
  if (Array.isArray(serverInstance.launchParams)) {
    for (const param of serverInstance.launchParams) {
      // If param has a value, use the provided value
      if (
        serverInstance.launchParamValues &&
        serverInstance.launchParamValues[param]
      ) {
        // Insert value into param string
        // e.g. -clusterid=<CLUSTER_NAME> becomes -clusterid=actualValue
        const valueMatch = param.match(/<([^>]+)>/);
        if (valueMatch) {
          const replaced = param.replace(
            /<[^>]+>/,
            serverInstance.launchParamValues[param]
          );
          args.push(replaced);
        } else if (param.includes("=")) {
          // For params like -ServerPlatform=<plat1>[+<plat2>] or -mods=<ModId1>[,<ModId2>]
          const eqIdx = param.indexOf("=");
          args.push(
            param.substring(0, eqIdx + 1) +
              serverInstance.launchParamValues[param]
          );
        } else {
          args.push(`${param}=${serverInstance.launchParamValues[param]}`);
        }
      } else {
        args.push(param);
      }
    }
  }
  // Add -mods from profile if not already present in launchParams
  if (profile.mods && typeof profile.mods === "string" && profile.mods.trim()) {
    const modsParamPresent = Array.isArray(serverInstance.launchParams)
      ? serverInstance.launchParams.some((p) => p.startsWith("-mods"))
      : false;
    if (!modsParamPresent) {
      args.push(`-mods=${profile.mods.trim()}`);
    }
  }

  // Start server
  console.log("Starting Ark server...");
  const proc = spawn(serverExe, args, { stdio: "inherit", shell: true });
  serverInstance._process = proc;
  serverInstance._pid = proc.pid;
  // Fetch and save all child PIDs
  serverInstance._childPids = getAllChildPids(proc.pid);
  console.log("childPids", serverInstance._childPids);
  return proc;
}

function killASAProcessTree(pid) {
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /PID ${pid} /T /F`);
      console.log(`Killed process tree (PID: ${pid})`);
    } catch (err) {
      console.error(`Failed to kill process tree: ${err}`);
    }
  } else {
    try {
      process.kill(-pid);
      console.log(`Killed process group (PID: ${pid})`);
    } catch (err) {
      console.error(`Failed to kill process group: ${err}`);
    }
  }
}

function killASAServer(serverInstance) {
  if (serverInstance && Array.isArray(serverInstance._childPids)) {
    for (const pid of serverInstance._childPids) {
      killASAProcessTree(pid);
    }
  }
  if (serverInstance && serverInstance._process && serverInstance._pid) {
    killASAProcessTree(serverInstance._pid);
    serverInstance._process = null;
    serverInstance._pid = null;
    serverInstance._childPids = [];
  }
}

async function promptForASAConfig(defaults = {}) {
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
      default: defaults.dir || getDefaultGameDir("ark"),
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
      default: defaults.steamcmd || getDefaultSteamCmdPath(),
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
  answers.appid = "2430930";
  return answers;
}

async function promptForASAServerInstance(defaults = {}) {
  const coreParams = [
    {
      name: "?listen",
      desc: "Enable listen server mode (required)",
      value: false,
      required: true,
      disabled: true,
    },
    {
      name: "?Port=<port>",
      desc: "Server port (required)",
      value: true,
      required: true,
      disabled: true,
      prompt: "Port:",
    },
    {
      name: "?ServerAdminPassword=<admin_password>",
      desc: "Admin password (required)",
      value: true,
      required: true,
      disabled: true,
      prompt: "Admin password:",
    },
    {
      name: "?RCONEnabled=True",
      desc: "Enable RCON remote admin (optional)",
      value: false,
      required: false,
      prompt: "Enable RCON?",
    },
    {
      name: "?RCONPort=<rcon_port>",
      desc: "RCON port (if RCON enabled)",
      value: true,
      required: false,
      dependsOn: "?RCONEnabled=True",
      prompt: "RCON Port:",
    },
  ];
  const launchParams = [
    ...coreParams,
    {
      name: "?AltSaveDirectoryName=<savedir_name>",
      desc: "Set a custom directory name for server world-save.",
      value: true,
      prompt: "Save directory name:",
    },
    {
      name: "-AlwaysTickDedicatedSkeletalMeshes",
      desc: "Always tick dedicated skeletal meshes. May affect collisions.",
      value: false,
    },
    {
      name: "-AutoDestroyStructures",
      desc: "Enable auto destruction of old structures.",
      value: false,
    },
    {
      name: "-culture=<lang_code>",
      desc: "Override server output language (e.g. en, de, fr).",
      value: true,
      prompt: "Language code (e.g. en, de, fr):",
    },
    {
      name: "-DisableCustomCosmetics",
      desc: "Disable the Custom Cosmetic system.",
      value: false,
    },
    {
      name: "-disabledinonetrangescaling",
      desc: "Disable dynamic network replication range optimization.",
      value: false,
    },
    {
      name: "-EasterColors",
      desc: "Enable Easter colors for creature spawns.",
      value: false,
    },
    {
      name: "-exclusivejoin",
      desc: "Enable whitelist-only mode for server joins.",
      value: false,
    },
    {
      name: "-ForceAllowCaveFlyers",
      desc: "Allow flyer creatures into caves.",
      value: false,
    },
    {
      name: "-ForceRespawnDinos",
      desc: "Destroy all wild creatures on server start-up.",
      value: false,
    },
    {
      name: "-GBUsageToForceRestart=<value>",
      desc: "Restart server if memory usage exceeds limit (GB).",
      value: true,
      prompt: "Memory limit for restart (GB):",
    },
    {
      name: "-MULTIHOME",
      desc: "Enable multihoming. Specify MULTIHOME IP address.",
      value: true,
      prompt: "MULTIHOME IP address:",
    },
    {
      name: "-NoBattlEye",
      desc: "Disable BattleEye anti-cheat.",
      value: false,
    },
    {
      name: "-NoDinos",
      desc: "Prevent wild creatures from spawning.",
      value: false,
    },
    {
      name: "-NoWildBabies",
      desc: "Disable spawning of wild babies.",
      value: false,
    },
    {
      name: "-passivemods=<ModId1>[,<ModId2>[...]]",
      desc: "Disable mod functionality but still load its data.",
      value: true,
      prompt: "Passive Mod Project IDs (comma separated):",
    },
    {
      name: "-servergamelog",
      desc: "Enable server admin logs and RCON support.",
      value: false,
    },
    {
      name: "-servergamelogincludetribelogs",
      desc: "Include tribe logs in server game logs.",
      value: false,
    },
    {
      name: "-ServerRCONOutputTribeLogs",
      desc: "Include tribe logs in RCON output.",
      value: false,
    },
    {
      name: "-StasisKeepControllers",
      desc: "Keep AI controller objects in memory during stasis.",
      value: false,
    },
    {
      name: "-UseDynamicConfig",
      desc: "Enable use of dynamic config for server settings.",
      value: false,
    },
    {
      name: "-NoTransferFromFiltering",
      desc: "Prevent ARK Data usage between non-cluster servers.",
      value: false,
    },
    {
      name: "-CustomNotificationURL=<URL>",
      desc: "Set custom notification broadcast URL (HTTP only).",
      value: true,
      prompt: "Notification URL:",
    },
    {
      name: "-DisableDupeLogDeletes",
      desc: "Prevent -ForceDupeLog from taking effect.",
      value: false,
    },
    {
      name: "-ForceDupeLog",
      desc: "Force dupe logs (requires -DisableDupeLogDeletes off).",
      value: false,
    },
    {
      name: "-forceuseperfthreads",
      desc: "Force use of performance threads.",
      value: false,
    },
    {
      name: "-ignoredupeditems",
      desc: "Ignore duped items in inventory.",
      value: false,
    },
    {
      name: "-NoAI",
      desc: "Disable AI controller for creatures.",
      value: false,
    },
    {
      name: "-NoDinosExceptForcedSpawn",
      desc: "Prevent wild creatures except forced spawns.",
      value: false,
    },
    {
      name: "-NoDinosExceptStreamingSpawn",
      desc: "Prevent wild creatures except streaming spawns.",
      value: false,
    },
    {
      name: "-NoDinosExceptManualSpawn",
      desc: "Prevent wild creatures except manual spawns.",
      value: false,
    },
    {
      name: "-NoDinosExceptWaterSpawn",
      desc: "Prevent wild creatures except water spawns.",
      value: false,
    },
    {
      name: "-noperfthreads",
      desc: "Disable performance threads.",
      value: false,
    },
    {
      name: "-nosound",
      desc: "Disable sounds to improve performance.",
      value: false,
    },
    {
      name: "-onethread",
      desc: "Disable multithreading.",
      value: false,
    },
    {
      name: "-UnstasisDinoObstructionCheck",
      desc: "Prevent creatures ghosting through meshes/structures.",
      value: false,
    },
    {
      name: "-UseServerNetSpeedCheck",
      desc: "Avoid excess movement data per server tick.",
      value: false,
    },
    {
      name: "-ServerPlatform=<plat1>[+<plat2>[...]]",
      desc: "Allow server to accept specified platforms (PC, XSX, PS5, ALL).",
      value: true,
      prompt: "Platforms (e.g. PC, XSX, PS5, ALL):",
    },
  ];

  console.log("default", defaults);

  const defaultParams = [
    "?listen",
    "?Port=<port>",
    "?ServerAdminPassword=<admin_password>",
  ];
  if (defaults.RCONPort || defaults.RCONEnabled)
    defaultParams.push("?RCONEnabled=True", "?RCONPort=<rcon_port>");
  // Use a predetermined list of ASA world names
  const predefinedWorlds = [
    "TheIsland_WP",
    "ScorchedEarth_WP",
    "Aberration_WP",
    "Extinction_WP",
    "TheCenter_WP",
    "Ragnarok_WP",
    "Astraeos_WP",
    "Custom...",
  ];
  const worldSelect = await inquirer.prompt([
    {
      type: "list",
      name: "worldNameSelect",
      message: "Select world:",
      choices: predefinedWorlds,
      default:
        defaults.worldName && predefinedWorlds.includes(defaults.worldName)
          ? defaults.worldName
          : predefinedWorlds[0],
    },
  ]);
  let worldName = worldSelect.worldNameSelect;
  if (worldName === "Custom...") {
    const customWorld = await inquirer.prompt({
      type: "input",
      name: "worldName",
      message: "Enter custom world name:",
      default: defaults.worldName || "",
    });
    worldName = customWorld.worldName;
  }

  // Now prompt for the rest of the fields
  let answers = await inquirer.prompt([
    {
      type: "input",
      name: "serverName",
      message: "Server Name:",
      required: true,
    },
    // World name is selected above, do not prompt again
    // Removed duplicate prompt array
    {
      type: "checkbox",
      name: "launchParams",
      message: "Select ASA launch parameters (space to select):",
      choices: launchParams.map((p) => ({
        name: `${p.name} - ${p.desc}`,
        value: p.name,
        short: p.name,
        checked: p.required || defaultParams.includes(p.name),
        disabled: p.disabled || false,
      })),
      default: defaultParams.concat(defaults.launchParams || []),
    },
    {
      type: "input",
      name: "Port",
      message: "Port:",
      default: defaults.Port || "",
      // Always request Port, since it's required
      when: () => true,
    },
    {
      type: "confirm",
      name: "RCONEnabled",
      message: "Enable RCON remote admin?",
      default: defaults.RCONEnabled ?? false,
      when: (answers) => answers.launchParams.includes("?RCONEnabled=True"),
    },
    {
      type: "input",
      name: "RCONPort",
      message: "RCON Port:",
      default: defaults.RCONPort || "",
      when: (answers) => answers.launchParams.includes("?RCONPort=<rcon_port>"),
    },
    {
      type: "input",
      name: "adminPassword",
      message: "Admin password:",
      default: defaults.adminPassword || "lightrail",
      // Always request adminPassword, since it's required
      when: () => true,
    },
    {
      type: "confirm",
      name: "updateNow",
      message: "Update server right now?",
      default: defaults.updateNow ?? false,
    },
  ]);

  // For each selected param, prompt for value if needed
  const paramValues = {};
  for (const param of launchParams) {
    if (
      answers.launchParams &&
      answers.launchParams.includes(param.name) &&
      param.value
    ) {
      const valueAnswer = await inquirer.prompt({
        type: "input",
        name: param.name,
        message: param.prompt || `Value for ${param.name}:`,
        default:
          (defaults.launchParamValues &&
            defaults.launchParamValues[param.name]) ||
          "",
      });
      paramValues[param.name] = valueAnswer[param.name];
    }
  }
  answers.launchParamValues = paramValues;
  answers.worldName = worldName;
  return answers;
}
module.exports = {
  startASAServer,
  killASAProcessTree,
  killASAServer,
  promptForASAConfig,
  promptForASAServerInstance,
};
