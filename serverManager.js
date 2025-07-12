import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";

let currentServerProcess = null;
let childProcesses = [];

function getChildPids(parentPid) {
  if (process.platform !== "win32") return [];
  try {
    const stdout = execSync(
      `wmic process where (ParentProcessId=${parentPid}) get ProcessId`,
      { encoding: "utf8" }
    );
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d+$/.test(line))
      .map(Number);
  } catch {
    return [];
  }
}

function getAllChildPids(pid) {
  const directChildren = getChildPids(pid);
  let all = [...directChildren];
  for (const child of directChildren) {
    all = all.concat(getAllChildPids(child));
  }
  return all;
}

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
  // Fetch and save all child PIDs
  serverInstance._childPids = getAllChildPids(proc.pid);
  console.log("childPids", serverInstance._childPids);
  childProcesses.push(proc);
  return proc;
}

function killProcessTree(pid) {
  if (process.platform === "win32") {
    // Use taskkill to kill process tree
    try {
      execSync(`taskkill /PID ${pid} /T /F`);
      console.log(`Killed process tree (PID: ${pid})`);
    } catch (err) {
      console.error(`Failed to kill process tree: ${err}`);
    }
  } else {
    // On Unix, kill process group
    try {
      process.kill(-pid);
      console.log(`Killed process group (PID: ${pid})`);
    } catch (err) {
      console.error(`Failed to kill process group: ${err}`);
    }
  }
}

export function killServer(serverInstance) {
  // Kill all child processes of the server process
  if (serverInstance && Array.isArray(serverInstance._childPids)) {
    for (const pid of serverInstance._childPids) {
      killProcessTree(pid);
    }
  }
  // Kill main server process
  if (serverInstance && serverInstance._process && serverInstance._pid) {
    killProcessTree(serverInstance._pid);
    serverInstance._process = null;
    serverInstance._pid = null;
    serverInstance._childPids = [];
  }
  childProcesses = [];
  currentServerProcess = null;
}
