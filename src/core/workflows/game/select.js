const inquirer = require("inquirer");
const { withScreen } = require("../../utils.js");
const { GAMES } = require("../../../games/index.js");

const selectGame = async () => {
  const { game } = await withScreen("Select Game", async () =>
    inquirer.prompt([
      {
        type: "list",
        name: "game",
        message: "Select game:",
        choices: GAMES,
        default: GAMES[0],
      },
    ])
  );
  return game;
};

module.exports = { selectGame };
