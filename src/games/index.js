const {
  startASAServer,
  promptForASAServerInstance,
  promptForASAConfig,
} = require("../games/asa.js");
const {
  startSoulmaskServer,
  promptForSoulmaskServerInstance,
  promptForSoulmaskConfig,
} = require("../games/soulmask.js");
const {
  startPalworldServer,
  promptForPalworldServerInstance,
  promptForPalworldConfig,
} = require("../games/palworld.js");

const GAMES = ["Ark: Survival Ascended", "Soulmask", "Palworld"].sort();

const getAppId = (game) => {
  switch (game) {
    case "Ark: Survival Ascended":
      return "2430930";
    case "Soulmask":
      return "3017310";
    case "Palworld":
      return "2394010";
    default:
      return null;
  }
};

const promptForProfile = (game, prevConfig) => {
  switch (game) {
    case "Ark: Survival Ascended":
      return promptForASAConfig(prevConfig);
    case "Soulmask":
      return promptForSoulmaskConfig(prevConfig);
    case "Palworld":
      return promptForPalworldConfig(prevConfig);
    default:
      throw new Error(`Unsupported game: ${game}`);
  }
};

const promptForServerInstance = (game, prevInstance) => {
  switch (game) {
    case "Ark: Survival Ascended":
      return promptForASAServerInstance(prevInstance);
    case "Soulmask":
      return promptForSoulmaskServerInstance(prevInstance);
    case "Palworld":
      return promptForPalworldServerInstance(prevInstance);
    default:
      throw new Error(`Unsupported game: ${game}`);
  }
};

const startGameServer = async (game, profile, serverInstance) => {
  switch (game) {
    case "Ark: Survival Ascended":
      return startASAServer(profile, serverInstance);
    case "Soulmask":
      return startSoulmaskServer(profile, serverInstance);
    case "Palworld":
      return startPalworldServer(profile, serverInstance);
    default:
      throw new Error(`Unsupported game: ${game}`);
  }
};

module.exports = {
  GAMES,
  getAppId,
  promptForProfile,
  promptForServerInstance,
  startGameServer,
};
