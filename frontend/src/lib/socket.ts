import { io } from "socket.io-client";

export const socket = io("http://192.168.129.219:5001", {
  transports: ["websocket", "polling"],
});