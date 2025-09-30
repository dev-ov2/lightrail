import chalk from "chalk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../package.json"), "utf8")
);

const GAMES = ["Ark: Survival Ascended", "Soulmask", "Palworld"].sort();

const lightrail = chalk.rgb(96, 255, 255).bold("Lightrail");

export function showLandingScreen() {
  // Gradient from rgb(96,255,255) to rgb(255,128,255)
  const gradientStart = [96, 255, 255];
  const gradientEnd = [255, 128, 255];
  const asciiArtLines = [
    " ----- ---   ----   ---- ----     ----      -",
    "     ---- ---     ------- ---- ---    ----- --",
    " -----     -------     ----- ------      --",
    "     __ _       _     _             _ _ ",
    "    / /(_) __ _| |__ | |_ _ __ __ _(_) |",
    "   / / | |/ _` | '_ \\| __| '__/ _` | | |",
    "  / /__| | (_| | | | | |_| | | (_| | | |",
    "  \\____/_|\\_,  |_| |_|\\__|_|  \\__,_|_|_|",
    "          |___/                         ",
    " ----- ---   ----   ---- ----     ----      -",
    "     ---- ---     ------- ---- ---    ----- --",
    " -----     -------     ----- ------      --",
  ];
  function interpolateColor(start, end, factor) {
    return start.map((v, i) => Math.round(v + (end[i] - v) * factor));
  }
  asciiArtLines.forEach((line, idx) => {
    const factor = idx / (asciiArtLines.length - 1);
    const [r, g, b] = interpolateColor(gradientStart, gradientEnd, factor);
    console.log(chalk.rgb(r, g, b).bold(line));
  });
  console.log(chalk.cyanBright.bold(`${lightrail} CLI v${pkg.version}`));
  console.log(
    chalk.cyanBright.bold(
      "═════════════════════════════════════════════════════════════════════════════════"
    )
  );
  console.log(
    chalk.yellowBright.bold(
      "Welcome to " + lightrail + " - A Server Manager CLI tool!"
    )
  );
  console.log(
    chalk.greenBright.bold("\n" + " Why use anything else...? " + "\n")
  );
  console.log(
    chalk.cyanBright(
      "───────────────────────────────────────────────────────────────────────────────"
    )
  );
  console.log(
    chalk.whiteBright(
      chalk.bold("Tip:") +
        " Use arrow keys to navigate, and Ctrl+C to exit at any time."
    )
  );
  console.log(
    chalk.cyanBright(
      "───────────────────────────────────────────────────────────────────────────────\n"
    )
  );
}

export function setConsoleTitle(state, profile = null, serverName = null) {
  let title = state;
  if (profile && serverName) {
    title = `${profile} · ${serverName}`;
    process.stdout.write(`\x1b]0;${title}\x07`);
    return;
  }
  // Replace all '-' with '|'
  title = title.replace(/-/g, "|");
  if (process.platform === "win32") {
    process.stdout.write(`\x1b]0;Lightrail | ${title}\x07`);
  }
}

export function clearScreen() {
  process.stdout.write("\x1Bc");
  // console.clear();
  showLandingScreen();
}

export function withScreen(title, fn) {
  setConsoleTitle(title);
  clearScreen();
  return fn();
}

export { GAMES };
