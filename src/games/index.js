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
const {
  ARK,
  ARK_APPID,
  SOULMASK,
  SOULMASK_APPID,
  PALWORLD,
  PALWORLD_APPID,
} = require("../constants.js");

const GAMES = [ARK, SOULMASK, PALWORLD].sort();

const getAppId = (game) => {
  switch (game) {
    case ARK:
      return ARK_APPID;
    case SOULMASK:
      return SOULMASK_APPID;
    case PALWORLD:
      return PALWORLD_APPID;
    default:
      return null;
  }
};

const promptForProfile = (game, prevConfig) => {
  switch (game) {
    case ARK:
      return promptForASAConfig(prevConfig);
    case SOULMASK:
      return promptForSoulmaskConfig(prevConfig);
    case PALWORLD:
      return promptForPalworldConfig(prevConfig);
    default:
      throw new Error(`Unsupported game: ${game}`);
  }
};

const promptForServerInstance = (game, prevInstance) => {
  switch (game) {
    case ARK:
      return promptForASAServerInstance(prevInstance);
    case SOULMASK:
      return promptForSoulmaskServerInstance(prevInstance);
    case PALWORLD:
      return promptForPalworldServerInstance(prevInstance);
    default:
      throw new Error(`Unsupported game: ${game}`);
  }
};

const startGameServer = async (game, profile, serverInstance) => {
  switch (game) {
    case ARK:
      return startASAServer(profile, serverInstance);
    case SOULMASK:
      return startSoulmaskServer(profile, serverInstance);
    case PALWORLD:
      return startPalworldServer(profile, serverInstance);
    default:
      throw new Error(`Unsupported game: ${game}`);
  }
};

module.exports = {
  ARK,
  SOULMASK,
  PALWORLD,
  GAMES,
  getAppId,
  promptForProfile,
  promptForServerInstance,
  startGameServer,
};
