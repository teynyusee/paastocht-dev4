type Props = {
  isTalking: boolean;
};

export default function BunnyMouth({ isTalking }: Props) {
  return (
    <div className="face-mouth-wrapper">
      <div className={isTalking ? "talk-mouth is-talking" : "talk-mouth"} />
    </div>
  );
}