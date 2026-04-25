"use client";

import { useRouter } from "next/navigation";
import scriptData from "@/src/data/data.json";
import AudioPlayer from "@/src/components/tracker/AudioPlayer";

export default function IntroPage() {
  const router = useRouter();

  return (
    <div className="bg__eggs intro-page">
      <AudioPlayer
        data={scriptData.intro}
        onComplete={() => router.push("/tracker/game")}
      />
    </div>
  );
}