const inquirer = require("inquirer");
const { spawn } = require("child_process");
const path = require("path");
const {
  getDefaultGameDir,
  getDefaultSteamCmdPath,
} = require("../core/platform.js");

async function promptForPalworldConfig(defaults = {}) {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Profile name:",
      default: defaults.name || "Lightrail Server",
    },
    {
      type: "input",
      name: "dir",
      message: "Server install directory:",
      default: defaults.dir || getDefaultGameDir("palworld"),
    },
    {
      type: "input",
      name: "steamcmd",
      message: "SteamCMD executable path:",
      default: defaults.steamcmd || getDefaultSteamCmdPath(),
    },
    {
      type: "input",
      name: "maxPlayers",
      message: "Max players:",
      default: defaults.maxPlayers || 32,
    },
    {
      type: "input",
      name: "publicIp",
      message: "Public IP (optional):",
      default: defaults.publicIp || "",
    },
    {
      type: "input",
      name: "publicPort",
      message: "Public port (optional):",
      default: defaults.publicPort || "",
    },
    {
      type: "input",
      name: "performanceThreads",
      message: "Number of worker threads (optional):",
      default: defaults.performanceThreads || "",
    },
    {
      type: "list",
      name: "logFormat",
      message: "Log format:",
      choices: ["text", "json"],
      default: defaults.logFormat || "text",
    },
    {
      type: "input",
      name: "backupInterval",
      message: "Backup interval (seconds, optional):",
      default: defaults.backupInterval || "",
    },
    {
      type: "input",
      name: "savingInterval",
      message: "Saving interval (seconds, optional):",
      default: defaults.savingInterval || "",
    },
  ]);
  answers.appid = "2394010";
  return answers;
}

async function promptForPalworldServerInstance(defaults = {}) {
  const launchParams = [
    {
      name: "-port=<port>",
      desc: "Change the port number used to listen to the server.",
      value: true,
      required: true,
      disabled: true,
      prompt: "Game port (UDP):",
      default: defaults.port || 8211,
    },
    {
      name: "-players=<maxPlayers>",
      desc: "Change the maximum number of participants on the server.",
      value: true,
      prompt: "Max players:",
      default: defaults.maxPlayers || 32,
    },
    {
      name: "-useperfthreads",
      desc: "Improves performance in multi-threaded CPU environments.",
      value: false,
      default: true,
    },
    {
      name: "-NoAsyncLoadingThread",
      desc: "Improves performance in multi-threaded CPU environments.",
      value: false,
      default: true,
    },
    {
      name: "-UseMultithreadForDS",
      desc: "Improves performance in multi-threaded CPU environments.",
      value: false,
      default: true,
    },
    {
      name: "-NumberOfWorkerThreadsServer=<threads>",
      desc: "Set number of worker threads for multi-threaded performance.",
      value: true,
      prompt: "Number of worker threads:",
      default: defaults.performanceThreads || "",
    },
    {
      name: "-publiclobby",
      desc: "Setup server as a community server.",
      value: false,
      default: defaults.publicLobby ?? false,
    },
    {
      name: "-publicip=<ip>",
      desc: "Manually specify the global IP address.",
      value: true,
      prompt: "Public IP (optional):",
      default: defaults.publicIp || "",
    },
    {
      name: "-publicport=<port>",
      desc: "Manually specify the network port (for community servers).",
      value: true,
      prompt: "Public port (optional):",
      default: defaults.publicPort || "",
    },
    {
      name: "-logformat=<format>",
      desc: "Change log format. Text or Json.",
      value: true,
      prompt: "Log format:",
      choices: ["text", "json"],
      default: defaults.logFormat || "text",
    },
  ];

  const defaultParams = ["-port=<port>"];
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "id",
      message: "Server ID (unique, no spaces):",
      default: defaults.id || "",
    },
    {
      type: "input",
      name: "serverName",
      message: "Server Name:",
      default: defaults.serverName || "",
    },
    {
      type: "input",
      name: "password",
      message: "Server password (optional):",
      default: defaults.password || "",
    },
    {
      type: "checkbox",
      name: "launchParams",
      message: "Select Palworld launch parameters (space to select):",
      choices: launchParams.map((p) => ({
        name: `${p.name} - ${p.desc}`,
        value: p.name,
        short: p.name,
        checked: p.required || p.default,
        disabled: p.disabled || false,
      })),
      default: defaultParams.concat(defaults.launchParams || []),
    },
    {
      type: "input",
      name: "port",
      message: "Port:",
      default: defaults.port || "",
      // Always request Port, since it's required
      when: () => true,
    },
    // Prompt for values for required params
    ...launchParams
      .filter((p) => p.value)
      .map((p) => {
        if (p.choices) {
          return {
            type: "list",
            name: p.name,
            message: p.prompt,
            choices: p.choices,
            default: p.default,
            when: (answers) => answers.launchParams.includes(p.name),
          };
        }
        return {
          type: "input",
          name: p.name,
          message: p.prompt,
          default: p.default,
          when: (answers) => answers.launchParams.includes(p.name),
        };
      }),
    {
      type: "confirm",
      name: "updateNow",
      message: "Update server on launch?",
      default: defaults.updateNow ?? false,
    },
  ]);
  // Collect param values
  const paramValues = {};
  for (const p of launchParams) {
    if (
      answers.launchParams &&
      answers.launchParams.includes(p.name) &&
      p.value
    ) {
      paramValues[p.name] = answers[p.name];
    }
  }
  answers.launchParamValues = paramValues;
  return answers;
}

function startPalworldServer(profile, serverInstance) {
  // Use installDir and executable for launch
  const serverExe = path.join(profile.dir, serverInstance.id, "PalServer.exe");
  // Build args from selected launchParams and their values
  const args = [];
  if (Array.isArray(serverInstance.launchParams)) {
    for (const param of serverInstance.launchParams) {
      // Always use port and maxPlayers from answers
      if (param === "-port=<port>") {
        args.push(`-port=${serverInstance["-port=<port>"] || 8211}`);
      } else if (param === "-players=<maxPlayers>") {
        args.push(`-players=${serverInstance["-players=<maxPlayers>"] || 32}`);
      } else if (
        serverInstance.launchParamValues &&
        serverInstance.launchParamValues[param]
      ) {
        // Insert value into param string
        const valueMatch = param.match(/<([^>]+)>/);
        if (valueMatch) {
          args.push(
            param.replace(/<[^>]+>/, serverInstance.launchParamValues[param])
          );
        } else {
          args.push(`${param}=${serverInstance.launchParamValues[param]}`);
        }
      } else {
        // For flags
        args.push(param);
      }
    }
  }
  console.log("Starting Palworld server...");
  console.log("Command:", serverExe, args.join(" "));
  const proc = spawn(serverExe, args, { stdio: "inherit", shell: true });
  serverInstance._process = proc;
  serverInstance._pid = proc.pid;
  return proc;
}

function killPalworldServer(serverInstance) {
  // Kill the process if running
  if (
    serverInstance &&
    serverInstance._process &&
    !serverInstance._process.killed
  ) {
    try {
      serverInstance._process.kill();
      console.log("Palworld server process killed.");
    } catch (err) {
      console.error("Failed to kill Palworld server process:", err.message);
    }
  } else {
    console.log("No active Palworld server process found.");
  }
}
module.exports = {
  promptForPalworldConfig,
  promptForPalworldServerInstance,
  startPalworldServer,
  killPalworldServer,
};
