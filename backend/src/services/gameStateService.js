let gameState = {
  totalEggs: 6,
  foundEggs: [],
  lastScannedEgg: null,
};

function getGameState() {
  return gameState;
}

function markEggFound(eggId) {
  if (!gameState.foundEggs.includes(eggId)) {
    gameState.foundEggs.push(eggId);
    gameState.lastScannedEgg = eggId;
  }
  return gameState;
}

function resetGame() {
  gameState = {
    totalEggs: 6,
    foundEggs: [],
    lastScannedEgg: null,
  };
  return gameState;
}

module.exports = {
  getGameState,
  markEggFound,
  resetGame,
};