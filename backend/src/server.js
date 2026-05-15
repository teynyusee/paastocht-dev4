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

const pendingEggs = new Set();

// =======================
// TIMERS / FLAGS
// =======================

const activeTimers = new Set();

let lastEggSequenceActive = false;
let endAudioAlreadyPlayed = false;

// =======================
// AUDIO SETTINGS
// =======================

const scanEffectAudio = {
  src: "/audio/magical-spark.mp3",
};

// Whoosh duurt ongeveer 2 seconden.
// Wordt gebruikt zodat de end-page niet te vroeg springt.
const scanEffectFullDurationMs = 2300;

// Random scan voice start iets later dan de whoosh.
// Lager = sneller. Hoger = meer afstand tussen whoosh en stem.
const scanVoiceStartDelayMs = 650;

const endAudio = {
  src: "/audio/eindboodschap.mp3",
  text: "Wauw! Het paasfeest is gered!",
  mouthMs: 13000,
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

// =======================
// TIMER HELPERS
// =======================

function scheduleTimer(callback, delayMs) {
  const timer = setTimeout(() => {
    activeTimers.delete(timer);
    callback();
  }, delayMs);

  activeTimers.add(timer);
  return timer;
}

function clearAllTimers() {
  for (const timer of activeTimers) {
    clearTimeout(timer);
  }

  activeTimers.clear();
}

// =======================
// SHUFFLE BAG AUDIO
// Hierdoor krijg je niet altijd dezelfde random scan-audio.
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

// =======================
// AUDIO EMITS
// =======================

function emitScanSfxAudio() {
  console.log("SFX whoosh playing:", scanEffectAudio.src);

  // Apart kanaal: beweegt mond niet en stopt voice niet.
  io.emit("face:sfx", scanEffectAudio);
}

function emitScanVoiceAudio(audio) {
  if (!audio) return null;

  console.log("Scan voice playing:", audio.src);

  // Voice kanaal: beweegt mond wel.
  io.emit("face:audio", audio);

  return audio;
}

function emitEndAudio() {
  if (endAudioAlreadyPlayed) {
    return;
  }

  endAudioAlreadyPlayed = true;
  lastEggSequenceActive = false;

  gameState = {
    ...gameState,
    phase: "end",
  };

  console.log("End audio playing:", endAudio.src);

  io.emit("game:update", gameState);
  io.emit("face:audio", endAudio);
}

// =======================
// END PAGE ROUTING
// =======================

function tellTrackerToGoEnd() {
  lastEggSequenceActive = false;

  gameState = {
    ...gameState,
    phase: "readyToEnd",
  };

  console.log("Tracker may now go to end page");

  io.emit("game:update", gameState);
  io.emit("tracker:go-end");
}

// =======================
// SHARED SCAN LOGIC
// Wordt gebruikt door:
// - echte Arduino scan via POST /api/scan
// - testknop via socket test:egg-found
// =======================

function handleEggScan(eggId) {
  if (!eggId || eggId === "unknown") {
    return {
      ok: false,
      error: "Invalid eggId",
      isNewEgg: false,
      isLastEgg: false,
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
      isLastEgg: false,
      state: gameState,
    };
  }

  if (gameState.foundEggs.length >= gameState.totalEggs) {
    return {
      ok: true,
      isNewEgg: false,
      isLastEgg: true,
      state: gameState,
    };
  }

  pendingEggs.add(eggId);

  // 1. Ei meteen registreren
  gameState = {
    ...gameState,
    phase: "game",
    foundEggs: [...gameState.foundEggs, eggId],
  };

  const isLastEgg = gameState.foundEggs.length >= gameState.totalEggs;

  if (isLastEgg) {
    lastEggSequenceActive = true;
  }

  console.log("Egg registered:", eggId);
  console.log("Egg count:", gameState.foundEggs.length, "/", gameState.totalEggs);
  console.log("Is last egg:", isLastEgg);

  // 2. Tracker meteen updaten, ei verschijnt direct
  io.emit("game:update", gameState);

  // 3. Whoosh meteen starten
  emitScanSfxAudio();

  // 4. Random scan voice al kiezen, maar iets later afspelen
  const scanVoiceAudio = getNextScanVoiceAudio();

  scheduleTimer(() => {
    emitScanVoiceAudio(scanVoiceAudio);
  }, scanVoiceStartDelayMs);

  // 5. Pending verwijderen na korte tijd
  scheduleTimer(() => {
    pendingEggs.delete(eggId);
  }, 800);

  // 6. Laatste ei:
  // wachten tot whoosh én scan voice klaar zijn,
  // daarna pas naar /tracker/end.
  if (isLastEgg) {
    const scanVoiceDurationMs = scanVoiceAudio?.mouthMs ?? 2500;

    const waitBeforeEndPageMs =
      Math.max(
        scanEffectFullDurationMs,
        scanVoiceStartDelayMs + scanVoiceDurationMs,
      ) + 300;

    console.log("Laatste ei. End pagina in:", waitBeforeEndPageMs, "ms");

    scheduleTimer(() => {
      tellTrackerToGoEnd();
    }, waitBeforeEndPageMs);
  }

  return {
    ok: true,
    isNewEgg: true,
    isLastEgg,
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
  clearAllTimers();

  gameState = {
    phase: "intro",
    totalEggs: 4,
    foundEggs: [],
  };

  pendingEggs.clear();
  scanAudioBag = [];
  lastEggSequenceActive = false;
  endAudioAlreadyPlayed = false;

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
    isLastEgg: result.isLastEgg,
    state: result.state,
  });
});

app.post("/api/end", (req, res) => {
  // Deze endpoint mag alleen door de end pagina getriggerd worden.
  // Als hij te vroeg wordt aangeroepen, speelt hij nog niets.
  if (lastEggSequenceActive) {
    console.log("End requested too early. Waiting for last scan sequence.");

    return res.json({
      ok: true,
      waitingForLastScanSequence: true,
      state: gameState,
    });
  }

  emitEndAudio();

  res.json({
    ok: true,
    state: gameState,
  });
});

app.post("/api/reset", (req, res) => {
  clearAllTimers();

  gameState = {
    phase: "idle",
    totalEggs: 4,
    foundEggs: [],
  };

  pendingEggs.clear();
  scanAudioBag = [];
  lastEggSequenceActive = false;
  endAudioAlreadyPlayed = false;

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