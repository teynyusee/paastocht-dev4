"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import EggGrid from "@/src/components/tracker/EggGrid";
import Timer from "@/src/components/tracker/Timer";

import scriptData from "@/src/data/data.json";
import { socket } from "@/src/lib/socket";
import { getGameState } from "@/src/lib/api";

export default function GamePage() {
  const [eggs, setEggs] = useState(0);
  const router = useRouter();

  const maxEggs = scriptData.settings.maxEggs;
  const hasEnded = useRef(false);

  // switch: true = backend, false = keyboard test
  const USE_BACKEND = false;

  
  // 🔥 1 centrale functie → ALLES gebruikt deze
  const addEgg = useCallback(() => {
    let didAddEgg = false;

    setEggs((prev) => {
      if (prev >= maxEggs) return prev;
      didAddEgg = true;

      return prev + 1;
    });

    if (!didAddEgg) return;

    // 🎵 feedback sound
    new Audio("/audio/correct.mp3").play();

    const random =
      scriptData.eggScans[
        Math.floor(Math.random() * scriptData.eggScans.length)
      ];

    new Audio(random.audio).play();
  }, [maxEggs]);

  // ⌨️ 2. keyboard (TEST MODE)
  useEffect(() => {
    if (USE_BACKEND) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        addEgg();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [addEgg]);

  // 📡 3. BACKEND (READER / SOCKET)
  useEffect(() => {
    if (!USE_BACKEND) return;

    // init state ophalen bij page load
    getGameState().then((state) => {
      setEggs(state.foundEggs.length);
    });

    // live updates van backend
    const handleUpdate = (state: { foundEggs: any[] }) => {
      // backend bepaalt hoeveel eieren er zijn
      setEggs(state.foundEggs.length);
    };

    socket.on("game:update", handleUpdate);

    return () => {
      socket.off("game:update", handleUpdate);
    };
  }, []);

  // 🎯 END GAME LOGIC
  useEffect(() => {
    if (eggs === maxEggs && !hasEnded.current) {
      hasEnded.current = true;

      setTimeout(() => {
        router.push("/tracker/end");
      }, 1500);
    }
  }, [eggs, maxEggs, router]);

  return (
    <div className="bg__grass game-page">
      <Timer duration={scriptData.settings.timerDuration} />
      <EggGrid count={eggs} />
    </div>
  );
}