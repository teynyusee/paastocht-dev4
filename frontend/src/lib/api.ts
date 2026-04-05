const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export async function getGameState() {
  const res = await fetch(`${API_URL}/api/game-state`);
  return res.json();
}

export async function resetGame() {
  const res = await fetch(`${API_URL}/api/reset`, {
    method: "POST",
  });
  return res.json();
}