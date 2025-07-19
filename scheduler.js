const { setInterval } = require("timers");
const { startServer, killServer } = require("./serverManager.js");
const { execSync } = require("child_process");

function scheduleRestart(
  profile,
  serverInstance,
  restartTime,
  updateBeforeRestart
) {
  function getNextRestartMs() {
    const now = new Date();
    const [h, m] = restartTime.split(":").map(Number);
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next - now;
  }

  function restartFlow() {
    console.log("Restarting server...");
    killServer(serverInstance);
    if (updateBeforeRestart) {
      try {
        const steamcmdArgs = [
          "+force_install_dir",
          profile.dir,
          "+login",
          "anonymous",
          "+app_update",
          profile.appid,
          "validate",
          "+quit",
        ];
        process.stdout.write("Updating server with SteamCMD... ");
        execSync(`"${profile.steamcmd}" ${steamcmdArgs.join(" ")}`);
        console.log("Success.");
      } catch (err) {
        console.log("Failed.");
        console.error("SteamCMD update failed:", err.message);
      }
    }
    // Kill and restart server
    serverInstance._process = startServer(profile, serverInstance);
    serverInstance._pid = serverInstance._process.pid;
  }

  setTimeout(() => {
    restartFlow();
    setInterval(restartFlow, 24 * 60 * 60 * 1000); // Repeat every 24h
  }, getNextRestartMs());
}
module.exports = { scheduleRestart };
