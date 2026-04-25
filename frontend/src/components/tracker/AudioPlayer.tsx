"use client";

import { useEffect, useRef, useState } from "react";
import "./AudioPlayer.css";

function AudioPlayer({ 
  data,
  onComplete,
}: {
  data: {
    audio: string;
    subtitles: { text: string; time: number }[];
  };
  onComplete: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [currentText, setCurrentText] = useState("");

  useEffect(() => {
    if (!data) return;

    const audio = new Audio(data.audio);
    audioRef.current = audio;

    // 🔊 audio starten
    audio.play().catch((err) => {
      console.warn("Audio kon niet starten:", err);
    });

    // 🕒 subtitles sync
    intervalRef.current = setInterval(() => {
      const audioEl = audioRef.current;
      if (!audioEl) return;

      const currentTime = audioEl.currentTime;

      const currentSubtitle = [...data.subtitles]
        .reverse()
        .find((s) => currentTime >= s.time);

      if (currentSubtitle) {
        setCurrentText(currentSubtitle.text);
      }
    }, 100);

    // 🎬 einde audio
    audio.onended = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      onComplete && onComplete();
    };

    return () => {
      audio.pause();
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [data, onComplete]);

  return (
    <div className="audio-player">
      <p className="audio-player__text">{currentText}</p>
    </div>
  );
}

export default AudioPlayer;