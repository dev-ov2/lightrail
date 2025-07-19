const { startASAServer, killASAServer } = require("./asa.js");

function startServer(profile, serverInstance) {
  // For now, only ASA is supported. Later, add game type switch.
  return startASAServer(profile, serverInstance);
}

function killServer(serverInstance) {
  // For now, only ASA is supported. Later, add game type switch.
  killASAServer(serverInstance);
}

module.exports = { startServer, killServer };
