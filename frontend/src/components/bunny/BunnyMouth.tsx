type Props = {
  isTalking: boolean;
  mode: "sleeping" | "waking" | "awake";
};

export default function BunnyMouth({ isTalking, mode }: Props) {
  const talkingClass = mode === "awake" && isTalking ? "is-talking" : "";

  return (
    <div className="face-mouth-wrapper">
      <div className={`face-mouth is-${mode} ${talkingClass}`}>
        <div className="face-mouth-shell">
          <div className="face-mouth-tooth" />
          <div className="face-mouth-tongue" />
        </div>
      </div>
    </div>
  );
}