import chalk from "chalk";
import { showLandingScreen, setConsoleTitle } from "./utils.js";
import { killServer } from "./serverManager.js";
import { killSoulmaskServer } from "../games/soulmask.js";
import { killPalworldServer } from "../games/palworld.js";

let childProcesses = [];

export function registerChildProcess(
  proc,
  profile = null,
  serverName = null,
  timeoutFn = null
) {
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
    setTimeout(timeoutFn, 1000);
  });
  // Set console title to show profile and server name if provided
  if (profile && serverName) {
    setConsoleTitle("", profile, serverName);
  }
}

export function scanChildProcesses() {
  // Scan for new child processes every 10 seconds
  setInterval(() => {
    childProcesses = childProcesses.filter((cp) => !cp.killed);
  }, 10000);
}

export default { scanChildProcesses, registerChildProcess };
