require("dotenv").config();
const http = require("http");
const app = require("./app");

const { Server } = require("socket.io");

const PORT = process.env.PORT || 5001;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// 👉 socket connect
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

// 👉 export zodat we die kunnen gebruiken
app.set("io", io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});