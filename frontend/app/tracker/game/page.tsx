"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import EggGrid from "@/src/components/tracker/EggGrid";
import Timer from "@/src/components/tracker/Timer";

import scriptData from "@/src/data/data.json";
import { getGameState } from "@/src/lib/api";
import { socket } from "@/src/lib/socket";

type GameState = {
  phase?: string;
  totalEggs: number;
  foundEggs: string[];
};

export default function GamePage() {
  const [eggs, setEggs] = useState(0);
  const router = useRouter();

  const hasEnded = useRef(false);

  const goToEndPage = useCallback(() => {
    if (hasEnded.current) return;

    hasEnded.current = true;

    router.push("/tracker/end");
  }, [router]);

  const handleFakeEggFound = () => {
    socket.emit("test:egg-found");
  };

  useEffect(() => {
    const handleReset = () => {
      window.location.replace("/tracker");
    };

    const handleGoEnd = () => {
      goToEndPage();
    };

    socket.on("tracker:reset", handleReset);
    socket.on("tracker:go-end", handleGoEnd);

    return () => {
      socket.off("tracker:reset", handleReset);
      socket.off("tracker:go-end", handleGoEnd);
    };
  }, [goToEndPage]);

  useEffect(() => {
    getGameState().then((state: GameState) => {
      setEggs(state.foundEggs.length);

      if (state.phase === "readyToEnd" || state.phase === "end") {
        goToEndPage();
      }
    });

    const handleUpdate = (state: GameState) => {
      setEggs(state.foundEggs.length);

      if (state.phase === "readyToEnd") {
        goToEndPage();
      }
    };

    socket.on("game:update", handleUpdate);

    return () => {
      socket.off("game:update", handleUpdate);
    };
  }, [goToEndPage]);

  return (
    <div className="bg__grass game-page">
      <Timer
        duration={scriptData.settings.timerDuration}
        onTimeUp={goToEndPage}
      />

      <EggGrid count={eggs} max={scriptData.settings.maxEggs} />

      <div className="test-egg-controls">
        <button type="button" onClick={handleFakeEggFound}>
          Test ei gevonden
        </button>
      </div>
    </div>
  );
}