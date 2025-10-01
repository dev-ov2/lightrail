#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { withScreen } = require("./utils.js");
const { withScreen, getBaseDir } = require("./utils.js");
const { getConfigDir, ensureDir } = require("./platform.js");
const { selectGame } = require("./workflows/game/select.js");
const { selectProfile } = require("./workflows/profile/select.js");
const { selectInstance } = require("./workflows/instance/select.js");
const { start } = require("./workflows/run.js");

const lightrail = chalk.rgb(96, 255, 255).bold("Lightrail");

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
