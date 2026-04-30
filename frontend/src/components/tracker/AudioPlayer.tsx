"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./AudioPlayer.css";

type Subtitle = {
  text: string;
  time: number;
};

type AudioData = {
  audio: string;
  subtitles: Subtitle[];
};

type Props = {
  data: AudioData;
  onComplete: () => void;
};

export default function AudioPlayer({ data, onComplete }: Props) {
  const [currentText, setCurrentText] = useState(data.subtitles[0]?.text ?? "");
  const completedRef = useRef(false);

  const fallbackDuration = useMemo(() => {
    const last = data.subtitles[data.subtitles.length - 1];
    return ((last?.time ?? 0) + 3) * 1000;
  }, [data.subtitles]);

  useEffect(() => {
    completedRef.current = false;

    const audio = new Audio(data.audio);

    const complete = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete();
    };

    const subtitleTimers = data.subtitles.map((subtitle) =>
      window.setTimeout(() => {
        setCurrentText(subtitle.text);
      }, subtitle.time * 1000),
    );

    const fallbackTimer = window.setTimeout(() => {
      complete();
    }, fallbackDuration);

    audio.onended = complete;

    audio.play().catch(() => {
      // iPad kan audio blokkeren, maar subtitles + flow blijven werken.
    });

    return () => {
      subtitleTimers.forEach(clearTimeout);
      window.clearTimeout(fallbackTimer);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [data.audio, data.subtitles, fallbackDuration, onComplete]);

  return (
    <div className="audio-player">
      <p className="audio-player__subtitle">{currentText}</p>
    </div>
  );
}