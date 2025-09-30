import inquirer from "inquirer";
import { loadProfiles, saveProfiles } from "./utils.js";
import { withScreen } from "../../utils.js";
import { createProfile } from "./create.js";

export const selectProfile = async (game) => {
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
    if (game === "Ark: Survival Ascended" && !profile.appid) {
      profile.appid = "2430930";
      saveProfiles(profiles);
    }
    if (game === "Soulmask" && !profile.appid) {
      profile.appid = "3017310";
      saveProfiles(profiles);
    }
    if (game === "Palworld" && !profile.appid) {
      profile.appid = "2394010";
      saveProfiles(profiles);
    }
  }

  return { profile, profiles };
};

export default { selectProfile };
