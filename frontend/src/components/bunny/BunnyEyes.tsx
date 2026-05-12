import type { CSSProperties } from "react";
import type { Offset } from "./BunnyFace";

type BunnyEyesProps = {
  offset: Offset;
  blink: boolean;
};

export default function BunnyEyes({ offset, blink }: BunnyEyesProps) {
  const pupilStyle: CSSProperties = {
    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
  };

  return (
    <div className={`face-eyes-row ${blink ? "is-blinking" : ""}`}>
      <div className="face-eye">
        <div className="face-eye-white">
          <div className="face-pupil" style={pupilStyle} />
          <div className="face-eyelid face-eyelid--top" />
          <div className="face-eyelid face-eyelid--bottom" />
        </div>

        <div className="face-sleep-line" />
      </div>

      <div className="face-eye">
        <div className="face-eye-white">
          <div className="face-pupil" style={pupilStyle} />
          <div className="face-eyelid face-eyelid--top" />
          <div className="face-eyelid face-eyelid--bottom" />
        </div>

        <div className="face-sleep-line" />
      </div>
    </div>
  );
}