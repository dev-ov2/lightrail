import { startASAServer, killASAServer } from "../games/asa.js";

export function startServer(profile, serverInstance) {
  // For now, only ASA is supported. Later, add game type switch.
  return startASAServer(profile, serverInstance);
}

export function killServer(serverInstance) {
  // For now, only ASA is supported. Later, add game type switch.
  killASAServer(serverInstance);
}

export default { startServer, killServer };
