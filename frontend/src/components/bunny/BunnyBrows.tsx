import type { CSSProperties } from "react";
import type { Offset } from "./BunnyFace";

type BunnyBrowsProps = {
  offset: Offset;
};

export default function BunnyBrows({ offset }: BunnyBrowsProps) {
  const style = {
    "--brow-x": `${offset.x * 0.08}px`,
    "--brow-y": `${offset.y * 0.42}px`,
    "--brow-tilt": `${offset.y * 0.08}deg`,
  } as CSSProperties;

  return (
    <div className="face-brows-row" style={style}>
      <div className="face-brow face-brow--left" />
      <div className="face-brow face-brow--right" />
    </div>
  );
}