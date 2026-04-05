const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6000";

export async function getGameState() {
  const res = await fetch(`${API_URL}/api/game-state`);
  return res.json();
}