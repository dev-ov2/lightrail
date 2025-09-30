import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { withScreen, setConsoleTitle } from "../utils.js";
import { registerChildProcess, scanChildProcesses } from "../process.js";
import { scheduleRestart } from "../scheduler.js";
import chalk from "chalk";
import { startASAServer } from "../../games/asa.js";
import { startSoulmaskServer } from "../../games/soulmask.js";
import { startPalworldServer } from "../../games/palworld.js";

const updateServer = async (game, profile, serverInstance, timeoutFn) => {
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
      registerChildProcess(steamcmdProc, null, null, timeoutFn);
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
};

const launchServer = async (game, profile, serverInstance, timeoutFn) => {
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
    serverProc = startASAServer(profile, serverInstance);
    registerChildProcess(
      serverProc,
      profile,
      serverInstance.serverName,
      timeoutFn
    );
  } else if (game === "Soulmask") {
    serverProc = startSoulmaskServer(profile, serverInstance);
    registerChildProcess(
      serverProc,
      profile,
      serverInstance.serverName,
      timeoutFn
    );
  } else if (game === "Palworld") {
    serverProc = startPalworldServer(profile, serverInstance);
    registerChildProcess(
      serverProc,
      profile,
      serverInstance.serverName,
      timeoutFn
    );
  }
  scanChildProcesses();

  return serverProc;
};

const tick = async (serverInstance, profile, startTime, serverProc) => {
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

    const readline = await import("readline");
    // Uptime line index
    const uptimeLineIdx = staticLines.length;
    // Print uptime line
    const printUptime = () => {
      const now = new Date();
      const uptimeMs = now - startTime;
      const uptimeSec = Math.floor(uptimeMs / 1000);
      const uptimeMin = Math.floor(uptimeSec / 60);
      const uptimeHr = Math.floor(uptimeMin / 60);
      const uptimeStr = `${uptimeHr > 0 ? uptimeHr + "h " : ""}${
        uptimeMin % 60
      }m ${uptimeSec % 60}s`;
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
      readline.moveCursor(process.stdout, 0, -(totalLines - uptimeLineIdx));
      readline.clearLine(process.stdout, 0);
      process.stdout.write(printUptime() + "\n");
      // Move cursor back to end
      readline.moveCursor(process.stdout, 0, totalLines - uptimeLineIdx - 1);
    }
    const interval = setInterval(updateUptime, 1000);
    await new Promise((resolve) => {
      serverProc.on("exit", () => {
        clearInterval(interval);
        resolve();
      });
    });
  });
};

const setupRestart = async (profile, serverInstance) => {
  if (profile.restartTime) {
    await withScreen("Scheduled Restart", async () => {
      // On scheduled restart, update if requested
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
};

export const start = async (game, profile, serverInstance, timeoutFn) => {
  if (serverInstance.updateNow) {
    await updateServer(game, profile, serverInstance, timeoutFn);
  }

  const serverProc = await launchServer(
    game,
    profile,
    serverInstance,
    timeoutFn
  );
  let startTime = new Date();
  await tick(serverInstance, profile, startTime, serverProc);

  await setupRestart(profile, serverInstance);
};

export default { start };
