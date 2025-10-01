# Lightrail

Lightrail is an **ESM (ECMAScript Modules)** Node.js CLI for launching and managing dedicated game servers (Ark: Survival Ascended, Soulmask, Palworld, Minecraft\* WIP). It originated from a Windows batch workflow and is now a cross‑platform interactive tool. Single‑file executables are produced using **Node.js Native Single Executable Applications (SEA)**.

## Features

- Select from multiple server configurations
- Input world name, port, and RCON port
- Handles symlinks, SteamCMD updates, and server launch

## Getting Started (Source)

1. Install dependencies:
   ```powershell
   pnpm install
   ```
2. Run the CLI (auto-installed via the `bin` field):
   ```powershell
   lightrail
   ```
   Or directly:
   ```powershell
   node src/core/cli.js
   ```

## Single Executable Builds (Node SEA)

We leverage the official Node.js SEA tooling (see: https://nodejs.org/api/single-executable-applications.html). Snapshot support is enabled, so the JavaScript source for the CLI is embedded directly inside the binary—no need to distribute the `src/` directory alongside the executable.

Prerequisites:

```bash
pnpm install
```

1. Prepare (optional hook, currently no-op):

```bash
pnpm run sea:prepare
```

2. Generate snapshot blob (embeds the CLI entry via `useSnapshot: true`):

```bash
pnpm run sea:blob
```

This creates `sea-prep.blob` using `sea-config.json`.

3. Build Windows executable (from Windows environment with Node 20+):

```powershell
pnpm run sea:build:win
```

4. Build Linux executable (from Linux environment):

```bash
pnpm run sea:build:linux
```

Artifacts appear in `build/` (e.g. `Lightrail.exe`, `Lightrail-linux`).

### Runtime Paths & Defaults

Snapshot embedding means only runtime data (profiles, servers, logs, SteamCMD downloads, etc.) is written to user directories—source files are not required at runtime.

Platform behavior:

| Aspect                  | Windows                             | Linux                                                       |
| ----------------------- | ----------------------------------- | ----------------------------------------------------------- |
| Config dir              | `%USERPROFILE%/Documents/lightrail` | `$XDG_CONFIG_HOME/lightrail` or `~/.config/lightrail`       |
| Game installs (default) | `C:/lightrail/<game>`               | `~/lightrail/<game>`                                        |
| SteamCMD detection      | `C:/steamcmd/steamcmd.exe`          | `/usr/games/steamcmd`, `/usr/bin/steamcmd`, else `steamcmd` |

Override platform detection with: `LIGHTRAIL_PLATFORM=windows` or `LIGHTRAIL_PLATFORM=linux`.

### Linux Notes

Ensure `steamcmd` is installed and accessible. Example installation on Ubuntu:

```bash
sudo apt update
sudo apt install -y steamcmd
```

If `steamcmd` installs to `/usr/games/steamcmd` or `/usr/bin/steamcmd`, it will be auto‑detected. Otherwise specify a custom path during profile creation.

Grant execute permission to the built binary if needed:

```bash
chmod +x build/Lightrail-linux
```

Run it:

```bash
./build/Lightrail-linux
```

### Optional systemd Service (Headless)

Create a service file `/etc/systemd/system/lightrail.service`:

```ini
[Unit]
Description=Lightrail Game Server Manager
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/lightrail
ExecStart=/opt/lightrail/Lightrail-linux
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
User=steam
Group=steam
Environment=NODE_NO_WARNINGS=1

[Install]
WantedBy=multi-user.target
```

Reload and enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lightrail
```

Stop:

```bash
sudo systemctl stop lightrail
```

View logs:

```bash
journalctl -u lightrail -f
```

## ESM Only

This project uses native ESM (`"type": "module"`). If embedding code, always use `import` syntax.

## Customization

Use the interactive menus to:

- Create and update profiles per game (stores JSON under user Documents or local `config/`).
- Create multiple server instances per profile.
- Opt into updates and scheduled restarts.

## Roadmap / Possible Improvements

- Add macOS & Linux arm64 build targets.
- Add config export/import.
- Improve logging persistence.

## Troubleshooting

| Issue                    | Tip                                                                 |
| ------------------------ | ------------------------------------------------------------------- |
| Binary can’t find config | Ensure write permissions to your config directory.                  |
| SteamCMD fails           | Run SteamCMD manually once, verify path and network.                |
| Colors missing           | Some minimal terminals may not support ANSI; try a different shell. |
| Wrong platform defaults  | Export `LIGHTRAIL_PLATFORM=linux` (or windows) to force detection.  |

## License

MIT
