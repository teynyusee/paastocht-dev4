import { io } from "socket.io-client";
import { SOCKET_URL } from "./constants";

export const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on("connect", () => {
  console.info("Socket connected:", socket.id, "URL:", SOCKET_URL);
});

socket.on("connect_error", (error) => {

  console.warn("Socket connect warning:", error.message, "URL:", SOCKET_URL);
});

socket.on("disconnect", (reason) => {
  console.warn("Socket disconnected:", reason);
});