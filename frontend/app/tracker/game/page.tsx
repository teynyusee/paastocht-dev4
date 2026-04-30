"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import EggGrid from "@/src/components/tracker/EggGrid";
import Timer from "@/src/components/tracker/Timer";

import scriptData from "@/src/data/data.json";
import { getGameState } from "@/src/lib/api";
import { socket } from "@/src/lib/socket";

type GameState = {
  totalEggs: number;
  foundEggs: string[];
};

export default function GamePage() {
  const [eggs, setEggs] = useState(0);
  const router = useRouter();

  const maxEggs = scriptData.settings.maxEggs;
  const hasEnded = useRef(false);

  const endGame = useCallback(() => {
    if (hasEnded.current) return;

    hasEnded.current = true;

    setTimeout(() => {
      router.push("/tracker/end");
    }, 1500);
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

  useEffect(() => {
    getGameState().then((state: GameState) => {
      setEggs(state.foundEggs.length);
    });

    const handleUpdate = (state: GameState) => {
      setEggs(state.foundEggs.length);
    };

    socket.on("game:update", handleUpdate);

    return () => {
      socket.off("game:update", handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (eggs >= maxEggs && !hasEnded.current) {
      endGame();
    }
  }, [eggs, maxEggs, endGame]);

  return (
    <div className="bg__grass game-page">
      <Timer duration={scriptData.settings.timerDuration} onTimeUp={endGame} />
      <EggGrid count={eggs} max={maxEggs} />
    </div>
  );
}