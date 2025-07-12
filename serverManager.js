import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";

let currentServerProcess = null;

export function startServer(archetype, serverInstance) {
  const dir = path.join(archetype.dir, serverInstance.worldName);
  const clusterDir = archetype.clusterDir;
  const mods = archetype.mods;
  const symlinkPath = path.join(
    dir,
    "ShooterGame",
    "Binaries",
    "Win64",
    "PlayersJoinNoCheckList.txt"
  );
  const clusterSymlinkSrc = path.join(clusterDir, "PlayersJoinNoCheckList.txt");

  // Delete symlink if exists
  try {
    if (fs.existsSync(symlinkPath)) {
      fs.unlinkSync(symlinkPath);
      console.log("Deleted symlink:", symlinkPath);
    }
  } catch (err) {
    console.warn("Could not delete symlink:", err.message);
  }

  // Run SteamCMD
  try {
    // const steamcmdArgs = [
    //   "+force_install_dir", dir,
    //   "+login", "anonymous",
    //   "+app_update", archetype.appid,
    //   "validate",
    //   "+quit"
    // ];
    // console.log("Authenticating with Steam...");
    // execSync(`"${archetype.steamcmd}" ${steamcmdArgs.join(" ")}`, { stdio: "inherit" });
  } catch (err) {
    console.error("SteamCMD failed:", err.message);
    process.exit(1);
  }

  // Create symlink
  try {
    fs.symlinkSync(clusterSymlinkSrc, symlinkPath, "file");
    console.log("Created symlink:", symlinkPath, "->", clusterSymlinkSrc);
  } catch (err) {
    console.warn("Could not create symlink:", err.message);
  }

  // Build command line
  const commandLine = `${serverInstance.worldName}?listen?Port=${serverInstance.Port}?RCONEnabled=True?RCONPort=${serverInstance.RCONPort}?ServerAdminPassword=${archetype.adminPassword}`;
  const serverExe = path.join(
    dir,
    "ShooterGame",
    "Binaries",
    "Win64",
    "ArkAscendedServer.exe"
  );
  const args = [
    commandLine,
    `-clusterID=${archetype.clusterID}`,
    `-ClusterDirOverride=\"${archetype.clusterOverride || ""}\"`,
    "-NoTransferFromFiltering",
    "-PreventHibernation",
    "-ForceRespawnDinos",
    `-mods=\"${mods}\"`,
  ];

  // Start server
  console.log("Starting Ark server...");
  const proc = spawn(serverExe, args, { stdio: "inherit", shell: true });
  currentServerProcess = proc;
  serverInstance._process = proc;
  serverInstance._pid = proc.pid;
  return proc;
}

export function killServer(serverInstance) {
  if (serverInstance && serverInstance._process && serverInstance._pid) {
    try {
      process.kill(serverInstance._pid);
      console.log(`Killed server process (PID: ${serverInstance._pid})`);
    } catch (err) {
      console.error(`Failed to kill server process: ${err}`);
    }
    serverInstance._process = null;
    serverInstance._pid = null;
    currentServerProcess = null;
  } else if (currentServerProcess) {
    try {
      process.kill(currentServerProcess.pid);
      console.log(`Killed server process (PID: ${currentServerProcess.pid})`);
    } catch (err) {
      console.error(`Failed to kill server process: ${err}`);
    }
    currentServerProcess = null;
  }
}
