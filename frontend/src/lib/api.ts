import { API_URL } from "./constants";

export async function getGameState() {
  const res = await fetch(`${API_URL}/api/state`, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to fetch game state");

  return res.json();
}

export async function startGame() {
  const res = await fetch(`${API_URL}/api/start`, {
    method: "POST",
  });

  if (!res.ok) throw new Error("Failed to start game");

  return res.json();
}

export async function endGame() {
  const response = await fetch(`${API_URL}/api/end`, {
    method: "POST",
  });

  return response.json();
}

export async function resetGame() {
  const res = await fetch(`${API_URL}/api/reset`, {
    method: "POST",
  });

  if (!res.ok) throw new Error("Failed to reset game");

  return res.json();
}