const inquirer = require("inquirer");
const { withScreen } = require("../../utils.js");

const { promptForASAServerInstance } = require("../../../games/asa.js");
const {
  promptForSoulmaskServerInstance,
} = require("../../../games/soulmask.js");
const {
  promptForPalworldServerInstance,
} = require("../../../games/palworld.js");
const { saveServers } = require("./utils.js");

const createInstance = async (
  game,
  profileServers,
  serversData,
  hasInstance
) => {
  let serverInstance;
  if (!hasInstance) {
    // create new
    serverInstance = await withScreen("Create Server Instance", async () => {
      if (game === "Ark: Survival Ascended")
        return promptForASAServerInstance();
      if (game === "Soulmask") return promptForSoulmaskServerInstance();
      if (game === "Palworld") return promptForPalworldServerInstance();
    });
    profileServers.servers.push(serverInstance);
    saveServers(serversData);
    return serverInstance;
  } else {
    // modify existing
    const modChoices = profileServers.servers.map((srv, idx) => ({
      name: srv.serverName ? `${srv.serverName}` : `Instance ${idx + 1}`,
      value: idx,
    }));
    const { modIdx } = await inquirer.prompt([
      {
        type: "list",
        name: "modIdx",
        message: "Select server instance to modify:",
        choices: modChoices,
      },
    ]);
    const prevInstance = profileServers.servers[modIdx];
    // Pass previous instance as defaults/config to prompt function
    let updatedInstance = await withScreen(
      "Modify Server Instance",
      async () => {
        if (game === "Ark: Survival Ascended")
          return promptForASAServerInstance(prevInstance);
        if (game === "Soulmask")
          return promptForSoulmaskServerInstance(prevInstance);
        if (game === "Palworld")
          return promptForPalworldServerInstance(prevInstance);
      }
    );
    if (updatedInstance) {
      profileServers.servers[modIdx] = updatedInstance;
      saveServers(serversData);

      serverInstance = updatedInstance;
      return serverInstance;
    }

    return prevInstance; // No changes made
  }
};

module.exports = { createInstance };
