const { withScreen } = require("../../utils.js");
const { loadProfiles, saveProfiles } = require("./utils.js");
const { promptForASAConfig } = require("../../../games/asa.js");
const { promptForSoulmaskConfig } = require("../../../games/soulmask.js");
const { promptForPalworldConfig } = require("../../../games/palworld.js");

const createProfile = async (game, profiles, profile) => {
  if (!profile) {
    const profile = await withScreen("Create Profile", async () => {
      if (game === "Ark: Survival Ascended") return promptForASAConfig();
      if (game === "Soulmask") return promptForSoulmaskConfig();
      if (game === "Palworld") return promptForPalworldConfig();
    });
    if (!profile) return;

    profile.game = game; // Assign game to profile
    profiles.push(profile);
    saveProfiles(profiles);
    return profile;
  } else {
    let profileIdx = profiles.findIndex((p) => p.name === profile.name);
    let updated = await withScreen("Update Profile", async () => {
      if (game === "Ark: Survival Ascended") return promptForASAConfig(profile);
      if (game === "Soulmask") return promptForSoulmaskConfig(profile);
      if (game === "Palworld") return promptForPalworldConfig(profile);
    });
    if (game === "Ark: Survival Ascended" && updated) updated.appid = "2430930";
    if (game === "Soulmask" && updated) updated.appid = "3017310";
    if (game === "Palworld" && updated) updated.appid = "2394010";
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
