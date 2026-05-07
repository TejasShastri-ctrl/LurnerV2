import app from "./app.js";
import http from "http";
import dotenv from "dotenv";
import { initSocket } from "./socket.js";

dotenv.config();

/**
 * Server Entry Point
 */

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

server.listen(PORT, () => {
    console.log("-----------------------------------------");
    console.log(`🚀 Lurner Server running at: http://localhost:${PORT}`);
    console.log(`📡 Real-time Engine (Socket.io) initialized`);
    console.log(`📂 Modular Architecture initialized`);
    console.log("-----------------------------------------");
});
