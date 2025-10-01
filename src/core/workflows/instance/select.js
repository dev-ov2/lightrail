const inquirer = require("inquirer");
const { withScreen } = require("../../utils.js");
const { loadServers } = require("./utils.js");
const { createInstance } = require("./create.js");
const { createProfile } = require("../profile/create.js");

const selectInstance = async (game, profileInfo) => {
  const { profile, profiles } = profileInfo;

  let serversData = loadServers();
  if (!serversData[game]) serversData[game] = [];
  let profileServers = serversData[game].find(
    (s) => s.profile === profile.name
  );
  if (!profileServers) {
    profileServers = { profile: profile.name, servers: [] };
    serversData[game].push(profileServers);
  }
  let serverChoices = profileServers.servers.map((srv, idx) => ({
    name: srv.serverName ? `${srv.serverName}` : `Instance ${idx + 1}`,
    value: idx,
  }));
  serverChoices.push(new inquirer.Separator());
  serverChoices.push({ name: "Create new server instance", value: "new" });
  serverChoices.push({
    name: "Modify server instance",
    value: "modify_instance",
  });
  serverChoices.push(new inquirer.Separator());
  serverChoices.push({
    name: `Update server profile (${profile.name})`,
    value: "update_profile",
  });
  serverChoices.push({ name: "← Back", value: "back" });
  const { serverIdx } = await withScreen("Select Server Instance", async () =>
    inquirer.prompt([
      {
        type: "list",
        name: "serverIdx",
        message: `Select server instance for profile '${profile.name}':`,
        choices: serverChoices,
        pageSize: 10,
      },
    ])
  );

  if (serverIdx === "back") return null;
  if (serverIdx === "new") {
    return createInstance(game, profileServers, serversData, false);
  }
  if (serverIdx === "modify_instance") {
    return createInstance(game, profileServers, serversData, true);
  }
  if (serverIdx === "update_profile") {
    await createProfile(game, profiles, profile);
    return null;
  } else {
    serverInstance = profileServers.servers[serverIdx];
    await withScreen("Server Instance Selected", async () => {});
    // Prompt for update after selection
    const { updateNow } = await inquirer.prompt([
      {
        type: "confirm",
        name: "updateNow",
        message: "Update server right now?",
        default: false,
      },
    ]);
    serverInstance.updateNow = updateNow;
    return serverInstance;
  }
};

module.exports = { selectInstance };
