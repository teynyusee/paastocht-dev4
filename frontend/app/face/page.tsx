"use client";

import { useEffect, useState } from "react";
import { socket } from "@/src/lib/socket";
import { getGameState } from "@/src/lib/api";

export default function FacePage() {
  const [message, setMessage] = useState("Welkom! 🐰");

  useEffect(() => {
    getGameState().then(updateMessage);

    socket.on("game:update", (state) => {
      updateMessage(state);
    });

    return () => {
      socket.off("game:update");
    };
  }, []);

  function updateMessage(state: any) {
    if (state.foundEggs.length === 0) {
      setMessage("Zoek de eitjes! 🐣");
    } else if (state.foundEggs.length < state.totalEggs) {
      setMessage(`Goed bezig! ${state.foundEggs.length} gevonden!`);
    } else {
      setMessage("🎉 Alles gevonden! Goed gedaan!");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-pink-100">
      <div className="text-6xl mb-6">🐰</div>
      <div className="text-2xl font-semibold">{message}</div>
    </div>
  );
}