const { withScreen } = require("../../utils.js");
const { loadProfiles, saveProfiles } = require("./utils.js");
const { getAppId, promptForProfile } = require("../../../games/index.js");
const { promptForASAConfig } = require("../../../games/asa.js");
const { promptForSoulmaskConfig } = require("../../../games/soulmask.js");
const { promptForPalworldConfig } = require("../../../games/palworld.js");

const createProfile = async (game, profiles, profile) => {
  if (!profile) {
    const profile = await withScreen("Create Profile", async () =>
      promptForProfile(game)
    );
    if (!profile) return;

    profile.game = game; // Assign game to profile
    profiles.push(profile);
    saveProfiles(profiles);
    return profile;
  } else {
    let profileIdx = profiles.findIndex((p) => p.name === profile.name);
    let updated = await withScreen("Update Profile", async () =>
      promptForProfile(game, profile)
    );
    updated.appId = getAppId(game);
    if (updated) updated.game = game; // Ensure game is set on update
    if (!updated) return;
    profiles[profileIdx] = updated;
    saveProfiles(profiles);
    await withScreen("Profile Updated", async () => {
      console.log("Server profile updated.");
    });
    return updated;
  }
};

module.exports = { createProfile };
