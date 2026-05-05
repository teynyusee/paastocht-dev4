import { io } from "socket.io-client";
import { SOCKET_URL } from "./constants";

export const socket = io(SOCKET_URL, {
  transports: ["polling", "websocket"],
});

socket.on("connect", () => {
  console.log("Socket connected:", socket.id, "URL:", SOCKET_URL);
});

socket.on("connect_error", (error) => {
  console.error("Socket connect error:", error.message);
});

socket.on("disconnect", (reason) => {
  console.warn("Socket disconnected:", reason);
});