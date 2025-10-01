#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { withScreen, getBaseDir } from "./utils.js";
import { getConfigDir, ensureDir } from "./platform.js";
import { selectGame } from "./workflows/game/select.js";
import { selectProfile } from "./workflows/profile/select.js";
import { selectInstance } from "./workflows/instance/select.js";
import { start } from "./workflows/run.js";

const lightrail = chalk.rgb(96, 255, 255).bold("Lightrail");

// Derive __dirname equivalent in ESM safely on Windows
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine config directory cross-platform
const CONFIG_DIR = ensureDir(getConfigDir());

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
