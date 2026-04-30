const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

let gameState = {
  totalEggs: 4,
  foundEggs: [],
};

const scanAudios = [
  {
    src: "/audio/een-erbij.mp3",
    text: "Yes! Nog eentje erbij!",
    mouthMs: 2500,
  },
  {
    src: "/audio/goed-bezig.mp3",
    text: "Nog eentje gevonden!",
    mouthMs: 2500,
  },
  {
    src: "/audio/goed-gevonden.mp3",
    text: "Wauw, goed bezig!",
    mouthMs: 2500,
  },
  {
    src: "/audio/slim-gevonden.mp3",
    text: "Slim gevonden!",
    mouthMs: 2500,
  },
  {
    src: "/audio/super-gedaan.mp3",
    text: "Super gedaan!",
    mouthMs: 2500,
  },
];

app.get("/api/state", (req, res) => {
  res.json(gameState);
});

app.post("/api/start", (req, res) => {
  gameState = {
    phase: "intro",
    totalEggs: 4,
    foundEggs: [],
  };

  io.emit("game:update", gameState);
  io.emit("tracker:start");

  io.emit("face:audio", {
    src: "/audio/intro.mp3",
    text: "Hallo daar! Ik ben het paaskonijn.",
    mouthMs: 18000,
  });

  res.json(gameState);
});

app.post("/api/scan", (req, res) => {
  const { eggId } = req.body;

  console.log("Scanned:", eggId);

  if (!eggId || eggId === "unknown") {
    return res.status(400).json({
      error: "Invalid eggId",
      state: gameState,
    });
  }

  const isNewEgg = !gameState.foundEggs.includes(eggId);

  if (isNewEgg) {
    gameState.foundEggs.push(eggId);
  }

  io.emit("game:update", gameState);

  if (isNewEgg) {
    const randomAudio =
      scanAudios[Math.floor(Math.random() * scanAudios.length)];

    io.emit("face:audio", randomAudio);
  }

  res.json(gameState);
});

app.post("/api/end", (req, res) => {
  io.emit("face:audio", {
    src: "/audio/eindboodschap.mp3",
    text: "Wauw! Het paasfeest is gered!",
    mouthMs: 13000,
  });

  res.json({ ok: true });
});

app.post("/api/reset", (req, res) => {
  gameState = {
    phase: "idle",
    totalEggs: 4,
    foundEggs: [],
  };

  io.emit("game:update", gameState);
  io.emit("face:idle");
  io.emit("tracker:reset");

  res.json(gameState);
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.emit("game:update", gameState);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(5001, "0.0.0.0", () => {
  console.log("Local backend running on http://0.0.0.0:5001");
});