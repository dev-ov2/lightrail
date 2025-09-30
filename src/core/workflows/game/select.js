import inquirer from "inquirer";
import { withScreen, GAMES } from "../../utils.js";

export const selectGame = async () => {
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

export default { selectGame };
