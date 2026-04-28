"use client";

import { useRouter } from "next/navigation";
import scriptData from "@/src/data/data.json";
import AudioPlayer from "@/src/components/tracker/AudioPlayer";

export default function EndPage() {
  const router = useRouter();

  return (
    <div className="bg__eggs end-page">
      <AudioPlayer
        data={scriptData.end}
        onComplete={() => router.push("/tracker")}
      />
    </div>
  );
}