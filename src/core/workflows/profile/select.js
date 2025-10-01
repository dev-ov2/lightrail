const inquirer = require("inquirer");
const { loadProfiles, saveProfiles } = require("./utils.js");
const { withScreen } = require("../../utils.js");
const { createProfile } = require("./create.js");

const selectProfile = async (game) => {
  let profiles = loadProfiles();
  // Only show profiles matching the selected game
  let filteredProfiles = profiles.filter((p) => p.game === game);
  let profileChoices = filteredProfiles.map((cfg, idx) => ({
    name: cfg.name,
    value: idx,
  }));
  profileChoices.push({ name: "Create new server profile", value: "new" });
  profileChoices.push({ name: "← Back", value: "back" });
  const { profileIdx } = await withScreen("Select Profile", async () =>
    inquirer.prompt([
      {
        type: "list",
        name: "profileIdx",
        message: "Select server profile:",
        choices: profileChoices,
      },
    ])
  );

  if (profileIdx === "back") return null;

  let profile;
  if (profileIdx === "new") {
    profile = await createProfile(game, profiles, false);
  } else {
    profile = filteredProfiles[profileIdx];
    if (!profile.game) profile.game = game; // Ensure game is set

    if (!profile.appId) {
      profile.appId = getAppId(game);
      saveProfiles(profiles);
    }
  }

  return { profile, profiles };
};

module.exports = { selectProfile };
