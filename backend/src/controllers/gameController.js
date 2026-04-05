const {
  getGameState,
  markEggFound,
  resetGame,
} = require("../services/gameStateService");

exports.getState = (req, res) => {
  res.json(getGameState());
};

exports.scanEgg = (req, res) => {
  const { eggId } = req.body;

  if (!eggId) {
    return res.status(400).json({ error: "eggId is required" });
  }

  const updated = markEggFound(eggId);

  // 🔥 realtime push
  const io = req.app.get("io");
  io.emit("game:update", updated);

  res.json(updated);
};

exports.reset = (req, res) => {
  const reset = resetGame();

  const io = req.app.get("io");
  io.emit("game:update", reset);

  res.json(reset);
};