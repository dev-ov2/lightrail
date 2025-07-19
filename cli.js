#!/usr/bin/env node
const inquirer = require("inquirer");
const { startServer, killServer } = require("./serverManager.js");
const { scheduleRestart } = require("./scheduler.js");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const sudo = require("sudo-prompt");
const { loadProfiles, saveProfiles } = require("./archetype.js");
const { promptForASAConfig, promptForASAServerInstance } = require("./asa.js");
const {
  promptForSoulmaskConfig,
  promptForSoulmaskServerInstance,
  startSoulmaskServer,
  killSoulmaskServer,
} = require("./soulmask.js");
const {
  promptForPalworldConfig,
  promptForPalworldServerInstance,
  startPalworldServer,
  killPalworldServer,
} = require("./palworld.js");
const { spawn, execSync } = require("child_process");
// For pkg compatibility, use process.cwd() as __dirname
// const __dirname = process.cwd();
const lightrail = chalk.rgb(96, 255, 255).bold("Lightrail");

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json")));

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

function showLandingScreen() {
  // Gradient from rgb(96,255,255) to rgb(255,128,255)
  const gradientStart = [96, 255, 255];
  const gradientEnd = [255, 128, 255];
  const asciiArtLines = [
    " ----- ---   ----   ---- ----     ----      -",
    "     ---- ---     ------- ---- ---    ----- --",
    " -----     -------     ----- ------      --",
    "     __ _       _     _             _ _ ",
    "    / /(_) __ _| |__ | |_ _ __ __ _(_) |",
    "   / / | |/ _` | '_ \\| __| '__/ _` | | |",
    "  / /__| | (_| | | | | |_| | | (_| | | |",
    "  \\____/_|\\_,  |_| |_|\\__|_|  \\__,_|_|_|",
    "          |___/                         ",
    " ----- ---   ----   ---- ----     ----      -",
    "     ---- ---     ------- ---- ---    ----- --",
    " -----     -------     ----- ------      --",
  ];
  function interpolateColor(start, end, factor) {
    return start.map((v, i) => Math.round(v + (end[i] - v) * factor));
  }
  asciiArtLines.forEach((line, idx) => {
    const factor = idx / (asciiArtLines.length - 1);
    const [r, g, b] = interpolateColor(gradientStart, gradientEnd, factor);
    console.log(chalk.rgb(r, g, b).bold(line));
  });
  console.log(chalk.cyanBright.bold(`${lightrail} CLI v${pkg.version}`));
  console.log(
    chalk.cyanBright.bold(
      "═════════════════════════════════════════════════════════════════════════════════"
    )
  );
  console.log(
    chalk.yellowBright.bold(
      "Welcome to " + lightrail + " - A Server Manager CLI tool!"
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
  let output = "";
  if (proc.stdout) {
    proc.stdout.on("data", (data) => {
      output += data.toString();
    });
  }
  if (proc.stderr) {
    proc.stderr.on("data", (data) => {
      output += data.toString();
    });
  }
  proc.on("exit", (code, signal) => {
    console.clear();
    showLandingScreen();
    console.log(
      chalk.redBright(
        `Child process exited (code: ${code}, signal: ${signal}). Killing server and restarting CLI...`
      )
    );
    if (output) {
      console.log(chalk.yellowBright("Process output (stdout/stderr):"));
      console.log(output);
    }
    // Game-specific kill logic
    if (profile && profile.game === "Soulmask") {
      if (typeof killSoulmaskServer === "function") {
        killSoulmaskServer(profile);
      }
    } else if (profile && profile.game === "Palworld") {
      if (typeof killPalworldServer === "function") {
        killPalworldServer(proc._serverInstance || {});
      }
    } else {
      killServer();
    }
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

function clearScreen() {
  process.stdout.write("\x1Bc");
  // console.clear();
  showLandingScreen();
}

function withScreen(title, fn) {
  setConsoleTitle(title);
  clearScreen();
  return fn();
}

async function main() {
  await withScreen("Landing", async () => {});

  const games = ["Ark: Survival Ascended", "Soulmask", "Palworld"].sort();
  const { game } = await withScreen("Select Game", async () =>
    inquirer.prompt([
      {
        type: "list",
        name: "game",
        message: "Select game:",
        choices: games,
        default: games[0],
      },
    ])
  );

  let profiles = loadProfiles();
  // Only show profiles matching the selected game
  let filteredProfiles = profiles.filter((p) => p.game === game);
  let profileChoices = filteredProfiles.map((cfg, idx) => ({
    name: cfg.name,
    value: idx,
  }));
  profileChoices.push({ name: "Create new server profile", value: "new" });
  profileChoices.push({ name: "← Back", value: "back" });
  const { profileIdx } = await withScreen("Select Profile", async () =>
    inquirer.prompt([
      {
        type: "list",
        name: "profileIdx",
        message: "Select server profile:",
        choices: profileChoices,
      },
    ])
  );
  if (profileIdx === "back") {
    return main(); // Go back to game selection
  }
  // Use filteredProfiles for selection
  let profile;
  if (profileIdx === "new") {
    profile = await withScreen("Create Profile", async () => {
      if (game === "Ark: Survival Ascended") return promptForASAConfig();
      if (game === "Soulmask") return promptForSoulmaskConfig();
      if (game === "Palworld") return promptForPalworldConfig();
    });
    if (!profile) return;
    profile.game = game; // Assign game to profile
    profiles.push(profile);
    saveProfiles(profiles);
    await withScreen("Profile Saved", async () => {
      console.log("New server profile saved.");
    });
  } else {
    profile = filteredProfiles[profileIdx];
    if (!profile.game) profile.game = game; // Ensure game is set
    if (game === "Ark: Survival Ascended" && !profile.appid) {
      profile.appid = "2430930";
      saveProfiles(profiles);
    }
    if (game === "Soulmask" && !profile.appid) {
      profile.appid = "3017310";
      saveProfiles(profiles);
    }
    if (game === "Palworld" && !profile.appid) {
      profile.appid = "2394010";
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
    name: srv.serverName ? `${srv.serverName}` : `Instance ${idx + 1}`,
    value: idx,
  }));
  serverChoices.push(new inquirer.Separator());
  serverChoices.push({ name: "Create new server instance", value: "new" });
  serverChoices.push({
    name: "Modify server instance",
    value: "modify_instance",
  });
  serverChoices.push(new inquirer.Separator());
  serverChoices.push({
    name: `Update server profile (${profile.name})`,
    value: "update_profile",
  });
  serverChoices.push({ name: "← Back", value: "back" });
  const { serverIdx } = await withScreen("Select Server Instance", async () =>
    inquirer.prompt([
      {
        type: "list",
        name: "serverIdx",
        message: `Select server instance for profile '${profile.name}':`,
        choices: serverChoices,
        pageSize: 10,
      },
    ])
  );
  if (serverIdx === "back") {
    return main(); // Go back to profile selection
  }

  let serverInstance;
  if (serverIdx === "new") {
    serverInstance = await withScreen("Create Server Instance", async () => {
      if (game === "Ark: Survival Ascended")
        return promptForASAServerInstance();
      if (game === "Soulmask") return promptForSoulmaskServerInstance();
      if (game === "Palworld") return promptForPalworldServerInstance();
    });
    profileServers.servers.push(serverInstance);
    saveServers(serversData);
    await withScreen("Server Instance Saved", async () => {
      console.log("New server instance saved.");
    });
  } else if (serverIdx === "modify_instance") {
    // Select which instance to modify
    const modChoices = profileServers.servers.map((srv, idx) => ({
      name: srv.serverName ? `${srv.serverName}` : `Instance ${idx + 1}`,
      value: idx,
    }));
    const { modIdx } = await inquirer.prompt([
      {
        type: "list",
        name: "modIdx",
        message: "Select server instance to modify:",
        choices: modChoices,
      },
    ]);
    const prevInstance = profileServers.servers[modIdx];
    // Pass previous instance as defaults/config to prompt function
    let updatedInstance = await withScreen(
      "Modify Server Instance",
      async () => {
        if (game === "Ark: Survival Ascended")
          return promptForASAServerInstance(prevInstance);
        if (game === "Soulmask")
          return promptForSoulmaskServerInstance(prevInstance);
        if (game === "Palworld")
          return promptForPalworldServerInstance(prevInstance);
      }
    );
    if (updatedInstance) {
      profileServers.servers[modIdx] = updatedInstance;
      saveServers(serversData);
      await withScreen("Server Instance Updated", async () => {
        console.log("Server instance updated.");
      });
    }
    return main();
  } else if (serverIdx === "update_profile") {
    let updated = await withScreen("Update Profile", async () => {
      if (game === "Ark: Survival Ascended") return promptForASAConfig(profile);
      if (game === "Soulmask") return promptForSoulmaskConfig(profile);
      if (game === "Palworld") return promptForPalworldConfig(profile);
    });
    if (game === "Ark: Survival Ascended" && updated) updated.appid = "2430930";
    if (game === "Soulmask" && updated) updated.appid = "3017310";
    if (game === "Palworld" && updated) updated.appid = "2394010";
    if (updated) updated.game = game; // Ensure game is set on update
    if (!updated) return;
    profiles[profileIdx] = updated;
    saveProfiles(profiles);
    await withScreen("Profile Updated", async () => {
      console.log("Server profile updated.");
    });
    return main();
  } else {
    serverInstance = profileServers.servers[serverIdx];
    await withScreen("Server Instance Selected", async () => {});
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

  // await withScreen("Admin Check", async () => {});
  // if (!(await isAdmin())) {
  //   await withScreen("Requesting Admin", async () => {
  //     console.log(
  //       chalk.yellowBright(
  //         "Administrator privileges required. Attempting to relaunch as administrator..."
  //       )
  //     );
  //   });
  //   const scriptPath = process.argv[1];
  //   const args = process.argv.slice(2).join(" ");
  //   sudo.exec(
  //     `node "${scriptPath}" ${args}`,
  //     { name: "Lightrail" },
  //     (error, stdout, stderr) => {
  //       if (error) {
  //         withScreen("Admin Relaunch Failed", async () => {
  //           console.error(
  //             chalk.redBright("Failed to restart as administrator:"),
  //             error
  //           );
  //         });
  //         process.exit(1);
  //       }
  //       process.exit(0);
  //     }
  //   );
  //   return;
  // }
  // await withScreen("Running as Admin", async () => {
  //   console.log("Running with administrator privileges...");
  // });

  // Ensure server directory exists before update
  let serverDir =
    game === "Ark: Survival Ascended"
      ? path.join(profile.dir, serverInstance.worldName)
      : game === "Soulmask"
        ? path.join(profile.dir, serverInstance.id)
        : path.join(profile.dir, serverInstance.id); // Palworld
  if (!fs.existsSync(serverDir)) {
    fs.mkdirSync(serverDir, { recursive: true });
  }

  console.log("serverInstance", serverInstance);

  // Update server with SteamCMD if selected
  if (serverInstance.updateNow) {
    await withScreen("Updating Server", async () => {
      try {
        const steamcmdArgs = [
          "+force_install_dir",
          serverDir,
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
        await withScreen("SteamCMD Error", async () => {
          console.error("SteamCMD update failed:", err.message);
        });
      }
    });
  }

  await withScreen(
    `Starting Server${profile.name ? ` | ${profile.name}` : ""}${
      serverInstance.serverName ? ` · ${serverInstance.serverName}` : ""
    }`,
    async () => {
      console.log("serverInstance", serverInstance);
      console.log("profile", profile);
    }
  );

  let serverProc;
  if (game === "Ark: Survival Ascended") {
    serverProc = startServer(profile, serverInstance);
    registerChildProcess(serverProc, profile, serverInstance.serverName);
  } else if (game === "Soulmask") {
    proc = startSoulmaskServer(profile, serverInstance);
    serverProc = proc;
    registerChildProcess(serverProc, profile, serverInstance.serverName);
  } else if (game === "Palworld") {
    serverProc = startPalworldServer(profile, serverInstance);
    registerChildProcess(serverProc, profile, serverInstance.serverName);
  }
  scanChildProcesses();
  let startTime = new Date();

  // Show active server info screen with live uptime
  await withScreen("Active Server Info", async () => {
    // Print static info and record lines
    const staticLines = [];
    staticLines.push(chalk.greenBright.bold("Active Server:"));
    staticLines.push(chalk.cyanBright(`Name: ${serverInstance.serverName}`));
    staticLines.push(chalk.cyanBright(`PID: ${serverProc.pid}`));
    staticLines.push(
      chalk.cyanBright(`Started: ${startTime.toLocaleString()}`)
    );
    if (profile.restartTime) {
      staticLines.push(
        chalk.cyanBright(`Restart Time: ${profile.restartTime}`)
      );
    }
    staticLines.forEach((line) => console.log(line));

const readline = require("readline"); 
   // Uptime line index
    const uptimeLineIdx = staticLines.length;
    // Print uptime line
    const printUptime = () => {
      const now = new Date();
      const uptimeMs = now - startTime;
      const uptimeSec = Math.floor(uptimeMs / 1000);
      const uptimeMin = Math.floor(uptimeSec / 60);
      const uptimeHr = Math.floor(uptimeMin / 60);
      const uptimeStr = `${uptimeHr > 0 ? uptimeHr + "h " : ""}${uptimeMin % 60}m ${uptimeSec % 60}s`;
      return chalk.cyanBright(`Uptime: ${uptimeStr}`);
    };
    console.log(printUptime());
    // Print instructions
    console.log(
      chalk.yellowBright(
        "Please follow server instructions to shut down the server."
      )
    );
    console.log(
      chalk.yellowBright("This window will refresh when the server exits.")
    );

    // Total lines printed after uptime line
    const totalLines = staticLines.length + 1 + 2; // static + uptime + 2 instructions

    function updateUptime() {
      // Move cursor to uptime line
      readline.moveCursor(
        process.stdout,
        0,
        -(totalLines - uptimeLineIdx)
      );
      readline.clearLine(process.stdout, 0);
      process.stdout.write(printUptime() + "\n");
      // Move cursor back to end
      readline.moveCursor(
        process.stdout,
        0,
        totalLines - uptimeLineIdx - 1
      );
    }
    const interval = setInterval(updateUptime, 1000);
    await new Promise((resolve) => {
      serverProc.on("exit", () => {
        clearInterval(interval);
        resolve();
      });
    });
  });
  if (profile.restartTime) {
    await withScreen("Scheduled Restart", async () => {
      // On scheduled restart, update if requested
      if (profile.updateBeforeRestart) {
        try {
          const steamcmdArgs = [
            "+force_install_dir",
            serverDir,
            "+login",
            "anonymous",
            "+app_update",
            profile.appid,
            "validate",
            "+quit",
          ];
          console.log("Updating server with SteamCMD before restart...");
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
          await withScreen("SteamCMD Error", async () => {
            console.error(
              "SteamCMD update failed before restart:",
              err.message
            );
          });
        }
      }
      scheduleRestart(
        profile,
        serverInstance,
        profile.restartTime,
        profile.updateBeforeRestart
      );
      console.log(
        `Restart scheduled for ${profile.restartTime} (update: ${
          profile.updateBeforeRestart ? "yes" : "no"
        })`
      );
    });
  }
}

process.on("uncaughtException", (error) => {
  if (error instanceof Error && error.name === "ExitPromptError") {
    const orange = chalk.rgb(255, 128, 0);
    console.log(
      orange(
        "\n\n───────────────────────────────────────────────────────────────────────────────"
      )
    );

    console.log(
      chalk
        .rgb(255, 255, 96)
        .bold("Thank you for using " + lightrail + ". See you again soon!")
    );
    console.log(
      orange(
        "───────────────────────────────────────────────────────────────────────────────\n"
      )
    );
    process.exit(0);
  } else {
    throw error;
  }
});

main();
