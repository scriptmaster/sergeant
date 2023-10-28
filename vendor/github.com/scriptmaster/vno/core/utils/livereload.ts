export const liveReloadScript = `
// ===========================\n
// LIVE RELOADING\n
// Create WebSocket connection.
const socket = new WebSocket("ws://localhost:8080");

const reloadWindow = () => {
  window.location.reload();
};

// Connection opened
socket.addEventListener("open", function (event) {
  socket.send("[LiveReload client connected]");
});

// Listen for messages
socket.addEventListener("message", function (event) {
  socket.send("[LiveReload reloading...]");
  if (event.data === 'reload window') {
    reloadWindow();
  }
});

// ===========================\n
`;
