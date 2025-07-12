import { setInterval } from "timers";
import { startServer, killServer } from "./serverManager.js";
import { execSync } from "child_process";

export function scheduleRestart(
  archetype,
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
          archetype.dir,
          "+login",
          "anonymous",
          "+app_update",
          archetype.appid,
          "validate",
          "+quit",
        ];
        execSync(`"${archetype.steamcmd}" ${steamcmdArgs.join(" ")}`, {
          stdio: "inherit",
        });
      } catch (err) {
        console.error("SteamCMD update failed:", err.message);
      }
    }
    // Kill and restart server
    serverInstance._process = startServer(archetype, serverInstance);
    serverInstance._pid = serverInstance._process.pid;
  }

  setTimeout(() => {
    restartFlow();
    setInterval(restartFlow, 24 * 60 * 60 * 1000); // Repeat every 24h
  }, getNextRestartMs());
}
