#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { withScreen, getBaseDir } from "./utils.js";
import { selectGame } from "./workflows/game/select.js";
import { selectProfile } from "./workflows/profile/select.js";
import { selectInstance } from "./workflows/instance/select.js";
import { start } from "./workflows/run.js";

const lightrail = chalk.rgb(96, 255, 255).bold("Lightrail");

// Derive __dirname equivalent in ESM safely on Windows
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store configs in user Documents unless packaged; when packaged allow relative 'config' dir fallback
let CONFIG_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME || getBaseDir(),
  "Documents",
  "lightrail"
);
// Fallback for single-executable (SEA) scenario: if Documents path not writable
if (!fs.existsSync(CONFIG_DIR)) {
  CONFIG_DIR = path.join(getBaseDir(), "config");
}
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

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
