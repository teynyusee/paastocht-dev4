import { io } from "socket.io-client";
import { SOCKET_URL } from "./constants";

export const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
});