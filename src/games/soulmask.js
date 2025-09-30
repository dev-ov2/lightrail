// Returns display name for Soulmask server instance
function getSoulmaskInstanceDisplayName(instance, idx) {
  if (instance.serverName && instance.serverName.trim()) {
    return instance.serverName;
  }
  if (instance.id && instance.id.trim()) {
    return instance.id;
  }
  return `Instance ${idx + 1}`;
}
import inquirer from "inquirer";
import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";
import net from "net";

async function promptForSoulmaskConfig(defaults = {}) {
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
      default: defaults.dir || "C:/lightrail/soulmask",
    },
    {
      type: "input",
      name: "steamcmd",
      message: "SteamCMD executable path:",
      default: defaults.steamcmd || "C:/steamcmd/steamcmd.exe",
    },
    {
      type: "input",
      name: "adminPassword",
      message: "Server admin password:",
      default: defaults.adminPassword || "lightrail",
    },
    {
      type: "input",
      name: "backupInterval",
      message: "Backup interval (seconds):",
      default: defaults.backupInterval || 900,
    },
    {
      type: "input",
      name: "savingInterval",
      message: "Saving interval (seconds):",
      default: defaults.savingInterval || 600,
    },
  ]);
  answers.appid = "3017310";
  return answers;
}

async function promptForSoulmaskServerInstance(defaults = {}) {
  const coreParams = [
    {
      name: "-server",
      desc: "No change needed.",
      value: false,
      required: true,
      disabled: true,
    },
    {
      name: "-SteamServerName=<name>",
      desc: "Specifies the name in the server list.",
      value: true,
      required: true,
      disabled: true,
      prompt: "Steam server name:",
    },
    {
      name: "-Port=<port>",
      desc: "Specifies the game port (UDP, required).",
      value: true,
      required: true,
      disabled: true,
      prompt: "Game port (UDP):",
    },
    {
      name: "-forcepassthrough",
      desc: "Must be specified.",
      value: false,
      required: true,
      disabled: true,
    },
  ];
  const launchParams = [
    ...coreParams,
    {
      name: "-MaxPlayers=<maxPlayers>",
      desc: "Maximum number of players.",
      value: true,
      prompt: "Max players:",
    },
    {
      name: "-backup=<interval>",
      desc: "Interval for writing DB to disk (seconds).",
      value: true,
      prompt: "Backup interval (seconds):",
    },
    {
      name: "-saving=<interval>",
      desc: "Interval for writing objects to DB (seconds).",
      value: true,
      prompt: "Saving interval (seconds):",
    },
    {
      name: "-MULTIHOME=<ip>",
      desc: "Local listening address.",
      value: true,
      prompt: "MULTIHOME IP address:",
    },
    {
      name: "-QueryPort=<queryPort>",
      desc: "Steam query port (UDP).",
      value: true,
      prompt: "Steam query port (UDP):",
    },
    {
      name: "-EchoPort=<echoPort>",
      desc: "Maintenance port (TCP).",
      value: true,
      prompt: "Maintenance port (TCP):",
    },
    {
      name: "-initbackup",
      desc: "Backs up game saves when the game starts.",
      value: false,
      default: defaults["-initbackup"] ?? false,
    },
    {
      name: "-backupinterval=<minutes>",
      desc: "How often (minutes) to auto backup world save.",
      value: true,
      prompt: "Backup interval (minutes):",
      default:
        defaults["-backupinterval=<minutes>"] ?? defaults.backupinterval ?? "",
    },
    {
      name: "-PSW=<password>",
      desc: "Server password (optional).",
      value: true,
      prompt: "Server password (optional):",
      default: defaults["-PSW=<password>"] ?? defaults.password ?? "",
    },
    {
      name: "-adminpsw=<adminpsw>",
      desc: "GM activation password.",
      value: true,
      prompt: "GM activation password:",
      default: defaults["-adminpsw=<adminpsw>"] ?? defaults.adminpsw ?? "",
    },
  ];
  const defaultParams = [
    "-server",
    "-SteamServerName=<name>",
    "-Port=<port>",
    "-forcepassthrough",
    "-log",
    "-UTF8Output",
  ];
  if (defaults.queryPort) defaultParams.push("-QueryPort=<queryPort>");
  if (defaults.echoPort) defaultParams.push("-EchoPort=<echoPort>");
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "serverName",
      message: "Steam server name:",
      default: defaults.serverName || "",
    },
    {
      type: "input",
      name: "id",
      message: "Server ID (unique, no spaces):",
      default: defaults.id || "",
    },
    {
      type: "checkbox",
      name: "launchParams",
      message: "Select Soulmask launch parameters (space to select):",
      choices: launchParams.map((p) => ({
        name: `${p.name} - ${p.desc}`,
        value: p.name,
        short: p.name,
        checked: p.required || defaultParams.includes(p.name),
        disabled: p.disabled || false,
      })),
      default: defaultParams.concat(defaults.launchParams || []),
    },
    {
      type: "input",
      name: "port",
      message: "Game port (UDP):",
      default: defaults.port || 8777,
      when: () => true,
    },
    // Prompt for values for required params
    ...launchParams
      .filter((p) => p.value)
      .map((p) => {
        return {
          type: "input",
          name: p.name,
          message: p.prompt,
          default: defaults[p.name] || p.default || "",
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
  // For each selected param, prompt for value if needed
  const paramValues = {};
  for (const param of launchParams) {
    if (
      answers.launchParams &&
      answers.launchParams.includes(param.name) &&
      param.value
    ) {
      paramValues[param.name] = answers[param.name];
    }
  }
  answers.launchParamValues = paramValues;
  return answers;
}

function startSoulmaskServer(profile, serverInstance) {
  // Use installDir and executable for launch
  const serverExe = path.join(profile.dir, serverInstance.id, "WSServer.exe");
  const args = ["Level01_Main"];
  // Always include required default params
  args.push("-server");
  args.push(`-SteamServerName=\"${serverInstance.serverName || ""}\"`);
  args.push(
    `-Port=${serverInstance["-Port=<port>"] || serverInstance.port || 8777}`
  );
  args.push("-forcepassthrough");
  args.push(`-MULTIHOME=${serverInstance["-MULTIHOME=<ip>"] || "0.0.0.0"}`);
  args.push("-log");
  args.push("-UTF8Output");

  if (Array.isArray(serverInstance.launchParams)) {
    for (const param of serverInstance.launchParams) {
      if (
        [
          "-server",
          "-SteamServerName=<name>",
          "-Port=<port>",
          "-forcepassthrough",
          "-MULTIHOME=<ip>",
          "-log",
          "-UTF8Output",
        ].includes(param)
      ) {
        continue; // already added
      }

      if (
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

  console.log("Starting Soulmask server...");
  console.log("Command:", serverExe, args.join(" "));
  const proc = spawn(serverExe, args, { stdio: "inherit", shell: true });
  serverInstance._process = proc;
  serverInstance._pid = proc.pid;
  return proc;
}

function killSoulmaskServer(profile) {
  // Use telnet to send 'quit 30' to EchoPort
  const client = net.createConnection(
    { port: profile["-EchoPort=<echoPort>"] || 18888 },
    () => {
      client.write("quit 5\n");
      client.end();
    }
  );
  client.on("error", (err) => {
    console.error("Failed to send quit command via telnet:", err.message);
  });
}

export {
  promptForSoulmaskConfig,
  promptForSoulmaskServerInstance,
  startSoulmaskServer,
  killSoulmaskServer,
  getSoulmaskInstanceDisplayName,
};
export default {
  promptForSoulmaskConfig,
  promptForSoulmaskServerInstance,
  startSoulmaskServer,
  killSoulmaskServer,
  getSoulmaskInstanceDisplayName,
};
