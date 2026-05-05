"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./AudioPlayer.css";

type Subtitle = {
  text: string;
  time: number;
};

type TextData = {
  subtitles: Subtitle[];
};

type Props = {
  data: TextData;
  onComplete: () => void;
};

export default function VisualTextPlayer({ data, onComplete }: Props) {
  const [currentText, setCurrentText] = useState(data.subtitles[0]?.text ?? "");
  const completedRef = useRef(false);

  const duration = useMemo(() => {
    const last = data.subtitles[data.subtitles.length - 1];
    return ((last?.time ?? 0) + 3) * 1000;
  }, [data.subtitles]);

  useEffect(() => {
    completedRef.current = false;

    const timers = data.subtitles.map((subtitle) =>
      window.setTimeout(() => {
        setCurrentText(subtitle.text);
      }, subtitle.time * 1000),
    );

    const endTimer = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete();
    }, duration);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(endTimer);
    };
  }, [data.subtitles, duration, onComplete]);

  return (
    <div className="audio-player">
      <p className="audio-player__subtitle text">{currentText}</p>
    </div>
  );
}