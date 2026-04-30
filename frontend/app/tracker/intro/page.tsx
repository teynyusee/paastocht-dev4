"use client";

import { useRouter } from "next/navigation";
import scriptData from "@/src/data/data.json";
import VisualTextPlayer from "@/src/components/tracker/VisualTextPlayer";
import { socket } from "@/src/lib/socket";
import { useEffect } from "react";

export default function IntroPage() {
  const router = useRouter();
  
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
    
    <div className="bg__eggs intro-page">
      <VisualTextPlayer
        data={scriptData.intro}
        onComplete={() => router.push("/tracker/game")}
      />
    </div>
  );
}