"use client";

import { useCallback, useEffect, useRef } from "react";

import scriptData from "@/src/data/data.json";
import VisualTextPlayer from "@/src/components/tracker/VisualTextPlayer";
import { endGameAudio, resetGame } from "@/src/lib/api";
import { socket } from "@/src/lib/socket";

export default function EndPage() {
  const hasStartedEndAudio = useRef(false);

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
    if (hasStartedEndAudio.current) return;
    hasStartedEndAudio.current = true;

    endGameAudio().catch((error) => {
      console.warn("End audio kon niet gestart worden:", error);
    });
  }, []);

  const handleEndComplete = useCallback(async () => {
    try {
      await resetGame();
    } catch (error) {
      console.error("Reset mislukt:", error);
    }

    window.location.replace("/tracker");
  }, []);

  return (
    <div className="bg__eggs end-page">
      <VisualTextPlayer data={scriptData.end} onComplete={handleEndComplete} />
    </div>
  );
}