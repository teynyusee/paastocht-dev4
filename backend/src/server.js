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

// =======================
// GAME STATE
// =======================

let gameState = {
  phase: "idle",
  totalEggs: 4,
  foundEggs: [],
};

// Eieren die al gescand zijn, maar nog wachten tot de whoosh klaar is.
// Dit voorkomt dubbele scans tijdens de delay.
const pendingEggs = new Set();

// =======================
// AUDIO SETTINGS
// =======================

const scanEffectAudio = {
  src: "/audio/magical-spark.mp3",
  text: "",
  mouthMs: 0,
};

// magical-spark duurt ongeveer 2 seconden.
// 2200ms zorgt dat hij volledig kan uitspelen.
const scanEffectDelayMs = 2200;

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

// =======================
// SHUFFLE BAG AUDIO
// Hierdoor krijg je niet 3 keer hetzelfde geluid na elkaar.
// Eerst worden alle scan-audio's 1 keer gebruikt in random volgorde.
// Daarna begint een nieuwe random volgorde.
// =======================

let scanAudioBag = [];

function refillScanAudioBag() {
  scanAudioBag = [...scanAudios];

  for (let i = scanAudioBag.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    [scanAudioBag[i], scanAudioBag[randomIndex]] = [
      scanAudioBag[randomIndex],
      scanAudioBag[i],
    ];
  }
}

function getNextScanVoiceAudio() {
  if (scanAudioBag.length === 0) {
    refillScanAudioBag();
  }

  return scanAudioBag.pop();
}

function emitScanVoiceAudio() {
  const audio = getNextScanVoiceAudio();

  if (!audio) return;

  io.emit("face:audio", audio);
}

// =======================
// SHARED SCAN LOGIC
// Deze functie wordt gebruikt door:
// - echte Arduino scan via POST /api/scan
// - testknop via socket test:egg-found
// =======================

function handleEggScan(eggId) {
  if (!eggId || eggId === "unknown") {
    return {
      ok: false,
      error: "Invalid eggId",
      isNewEgg: false,
      queued: false,
      state: gameState,
    };
  }

  const isAlreadyFound = gameState.foundEggs.includes(eggId);
  const isAlreadyPending = pendingEggs.has(eggId);

  if (isAlreadyFound || isAlreadyPending) {
    io.emit("game:update", gameState);

    return {
      ok: true,
      isNewEgg: false,
      queued: false,
      state: gameState,
    };
  }

  if (gameState.foundEggs.length >= gameState.totalEggs) {
    return {
      ok: true,
      isNewEgg: false,
      queued: false,
      state: gameState,
    };
  }

  pendingEggs.add(eggId);

  // 1. Ei meteen toevoegen
  gameState = {
    ...gameState,
    phase: "game",
    foundEggs: [...gameState.foundEggs, eggId],
  };

  // 2. Tracker/iPad meteen updaten, dus ei verschijnt direct
  io.emit("game:update", gameState);

  // 3. Whoosh speelt tegelijk met het verschijnen van het ei
  io.emit("face:audio", scanEffectAudio);

  // 4. Na de volledige whoosh pas random stemgeluid
  setTimeout(() => {
    pendingEggs.delete(eggId);
    emitScanVoiceAudio();
  }, scanEffectDelayMs);

  return {
    ok: true,
    isNewEgg: true,
    queued: true,
    state: gameState,
  };
}

// =======================
// REST API
// =======================

app.get("/api/state", (req, res) => {
  res.json(gameState);
});

app.post("/api/start", (req, res) => {
  gameState = {
    phase: "intro",
    totalEggs: 4,
    foundEggs: [],
  };

  pendingEggs.clear();
  scanAudioBag = [];

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

  console.log("Real egg scanned:", eggId);

  const result = handleEggScan(eggId);

  if (!result.ok) {
    return res.status(400).json({
      error: result.error,
      state: result.state,
    });
  }

  res.json({
    ok: true,
    isNewEgg: result.isNewEgg,
    queued: result.queued,
    state: result.state,
  });
});

app.post("/api/end", (req, res) => {
  gameState = {
    ...gameState,
    phase: "end",
  };

  io.emit("game:update", gameState);

  io.emit("face:audio", {
    src: "/audio/eindboodschap.mp3",
    text: "Wauw! Het paasfeest is gered!",
    mouthMs: 13000,
  });

  res.json({
    ok: true,
    state: gameState,
  });
});

app.post("/api/reset", (req, res) => {
  gameState = {
    phase: "idle",
    totalEggs: 4,
    foundEggs: [],
  };

  pendingEggs.clear();
  scanAudioBag = [];

  io.emit("game:update", gameState);
  io.emit("face:idle");
  io.emit("tracker:reset");

  res.json(gameState);
});

// =======================
// SOCKET.IO
// =======================

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.emit("game:update", gameState);

  // Testknop op tracker.
  // Werkt exact zoals een echte Arduino scan:
  // whoosh -> wachten -> ei toevoegen -> tracker update -> random stem
  socket.on("test:egg-found", () => {
    if (gameState.foundEggs.length >= gameState.totalEggs) {
      console.log("Test egg ignored: max eggs already found");
      return;
    }

    const fakeEggId = `test-${Date.now()}`;

    console.log("Test egg scanned:", fakeEggId);

    handleEggScan(fakeEggId);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// =======================
// START SERVER
// =======================

server.listen(5001, "0.0.0.0", () => {
  console.log("Local backend running on http://0.0.0.0:5001");
});