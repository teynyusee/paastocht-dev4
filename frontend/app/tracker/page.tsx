"use client";

import { useEffect, useState } from "react";
import { getGameState } from "@/src/lib/api";
import { socket } from "@/src/lib/socket";

export default function TrackerPage() {
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    // eerste load
    getGameState().then(setState);

    // 🔥 realtime updates
    socket.on("game:update", (newState) => {
      setState(newState);
    });

    return () => {
      socket.off("game:update");
    };
  }, []);

  if (!state) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-yellow-100 p-6">
      <button
  onClick={async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reset`, {
  method: "POST",
});
  }}
  className="mt-6 p-3 bg-red-500 text-white rounded"
>
  Reset Game
</button>
      <h1 className="text-3xl font-bold mb-4">🐣 Egg Tracker</h1>

      <p className="mb-4">
        Found: {state.foundEggs.length} / {state.totalEggs}
      </p>

      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: state.totalEggs }).map((_, i) => {
          const eggId = `egg-${i + 1}`;
          const found = state.foundEggs.includes(eggId);

          return (
            <div
              key={eggId}
              className={`p-6 rounded-xl text-center ${
                found ? "bg-green-400" : "bg-gray-300"
              }`}
            >
              🥚 {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}