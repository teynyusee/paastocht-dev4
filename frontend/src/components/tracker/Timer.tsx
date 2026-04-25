"use client";

import { useEffect, useMemo, useState } from "react";
import "./Timer.css";

export default function Timer({ duration, onTimeUp }: { duration: number, onTimeUp?: () => void }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          if (onTimeUp) onTimeUp(); 
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, onTimeUp]);

  const progress = timeLeft / duration;

  let color = "#00ff00";
  if (progress <= 2 / 3) color = "#00FFAE";
  if (progress <= 1 / 3) color = "#ffa500";

  const size = 1000;
  const strokeWidth = 16;
  const padding = strokeWidth / 2;

  const path = useMemo(() => {
    const topMiddleX = size / 2;
    const top = padding;
    const right = size - padding;
    const bottom = size - padding;
    const left = padding;

    return `
      M ${topMiddleX} ${top}
      L ${left} ${top}
      L ${left} ${bottom}
      L ${right} ${bottom}
      L ${right} ${top}
      L ${topMiddleX} ${top}
    `;
  }, [size, padding]);

  // 🔥 beter dan vaste 4000 → exact berekenen
  const pathLength = useMemo(() => {
    const side = size - padding * 2;
    return side * 4;
  }, [size, padding]);

  const offset = pathLength * (1 - progress);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="timer-border">
      <svg
        className="timer-border__svg"
        viewBox={`0 0 ${size} ${size}`}
        preserveAspectRatio="none"
      >
        {/* background */}
        <path
          d={path}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={strokeWidth}
        />

        {/* active */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={pathLength}
          strokeDashoffset={offset}
        />
      </svg>

      <div className="timer-border__text">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </div>
    </div>
  );
}