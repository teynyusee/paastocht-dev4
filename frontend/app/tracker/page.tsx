"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getGameState } from "@/src/lib/api";
import { socket } from "@/src/lib/socket";

import "./StartPage.css";

type GameState = {
  phase?: "idle" | "intro" | "game" | "end";
  totalEggs: number;
  foundEggs: string[];
};

export default function StartPage() {
  const router = useRouter();

  useEffect(() => {
    socket.connect();

    const checkState = async () => {
      const state: GameState = await getGameState();

      if (state.phase === "intro") {
        router.replace("/tracker/intro");
      }

      if (state.phase === "game") {
        router.replace("/tracker/game");
      }

      if (state.phase === "end") {
        router.replace("/tracker/end");
      }
    };

    checkState();

    const handleStart = () => {
      router.replace("/tracker/intro");
    };

    const handleUpdate = (state: GameState) => {
      if (state.phase === "intro") {
        router.replace("/tracker/intro");
      }
    };

    socket.on("tracker:start", handleStart);
    socket.on("game:update", handleUpdate);

    return () => {
      socket.off("tracker:start", handleStart);
      socket.off("game:update", handleUpdate);
    };
  }, [router]);

  useEffect(() => {
  const handleReset = () => {
    window.location.replace("/tracker");
  };

  socket.on("tracker:reset", handleReset);

  return () => {
    socket.off("tracker:reset", handleReset);
  };
}, []);

  return (
    <div className="bg__eggs start-page">
      <div className="start-page__panel">
        <h1>Paaszoektocht</h1>
        <p>Wacht tot het paaskonijn het spel start...</p>
      </div>
    </div>
  );
}