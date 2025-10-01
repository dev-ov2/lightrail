const chalk = require("chalk");
const { showLandingScreen, setConsoleTitle } = require("./utils.js");
const { killServer } = require("./serverManager.js");
const { killSoulmaskServer } = require("../games/soulmask.js");
const { killPalworldServer } = require("../games/palworld.js");

let childProcesses = [];
function scanChildProcesses() {
  // Scan for new child processes every 10 seconds
  setInterval(() => {
    childProcesses = childProcesses.filter((cp) => !cp.killed);
    // Optionally, scan for new children here (custom logic if needed)
  }, 10000);
}

function registerChildProcess(
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
    setTimeout(() => main(), 1000);
  });
  // Set console title to show profile and server name if provided
  if (profile && serverName) {
    setConsoleTitle("", profile, serverName);
  }
}

module.exports = {
  scanChildProcesses,
  registerChildProcess,
};
