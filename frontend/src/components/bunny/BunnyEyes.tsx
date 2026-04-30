import type { Offset } from "./BunnyFace";

type BunnyEyesProps = {
  offset: Offset;
  blink: boolean;
};

export default function BunnyEyes({ offset, blink }: BunnyEyesProps) {
  return (
    <div className="face-eyes-row">
      <Eye offset={offset} blink={blink} />
      <Eye offset={offset} blink={blink} />
    </div>
  );
}

function Eye({ offset, blink }: BunnyEyesProps) {
  return (
    <div
      className="face-eye-white"
      style={{
        height: blink ? 12 : 130,
        transition: "height 120ms ease",
      }}
    >
      {!blink && (
        <div
          className="face-pupil"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          }}
        >
          <div className="face-shine face-shine--big" />
          <div className="face-shine face-shine--small" />
        </div>
      )}
    </div>
  );
}