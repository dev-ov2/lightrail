#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { withScreen } = require("./utils.js");
const { selectGame } = require("./workflows/game/select.js");
const { selectProfile } = require("./workflows/profile/select.js");
const { selectInstance } = require("./workflows/instance/select.js");
const { start } = require("./workflows/run.js");

// For pkg compatibility, use process.cwd() as __dirname
// const __dirname = process.cwd();
const lightrail = chalk.rgb(96, 255, 255).bold("Lightrail");

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../..", "package.json"))
);

const CONFIG_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME,
  "Documents",
  "lightrail"
);
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}
const PROFILES_FILE = path.join(CONFIG_DIR, "server-profiles.json");

let childProcesses = [];
function scanChildProcesses() {
  // Scan for new child processes every 10 seconds
  setInterval(() => {
    childProcesses = childProcesses.filter((cp) => !cp.killed);
    // Optionally, scan for new children here (custom logic if needed)
  }, 10000);
}

// function registerChildProcess(proc, profile = null, serverName = null) {
//   childProcesses.push(proc);
//   let output = "";
//   if (proc.stdout) {
//     proc.stdout.on("data", (data) => {
//       output += data.toString();
//     });
//   }
//   if (proc.stderr) {
//     proc.stderr.on("data", (data) => {
//       output += data.toString();
//     });
//   }
//   proc.on("exit", (code, signal) => {
//     console.clear();
//     showLandingScreen();
//     console.log(
//       chalk.redBright(
//         `Child process exited (code: ${code}, signal: ${signal}). Killing server and restarting CLI...`
//       )
//     );
//     if (output) {
//       console.log(chalk.yellowBright("Process output (stdout/stderr):"));
//       console.log(output);
//     }
//     // Game-specific kill logic
//     if (profile && profile.game === "Soulmask") {
//       if (typeof killSoulmaskServer === "function") {
//         killSoulmaskServer(profile);
//       }
//     } else if (profile && profile.game === "Palworld") {
//       if (typeof killPalworldServer === "function") {
//         killPalworldServer(proc._serverInstance || {});
//       }
//     } else {
//       killServer();
//     }
//     setTimeout(() => main(), 1000);
//   });
//   // Set console title to show profile and server name if provided
//   if (profile && serverName) {
//     setConsoleTitle("", profile, serverName);
//   }
// }

async function main() {
  await withScreen("Landing", async () => {});

  // Select game
  const game = await selectGame();

  // Select profile
  const profileInfo = await selectProfile(game);
  if (profileInfo === null) {
    return main();
  }

  // Select instance
  const serverInstance = await selectInstance(game, profileInfo);
  if (serverInstance === null) {
    return main();
  }

  await start(game, profileInfo.profile, serverInstance, () => {
    main();
  });
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
