type Props = {
  isTalking: boolean;
};

export default function BunnyMouth({ isTalking }: Props) {
  if (isTalking) {
    return <div className="face-mouth face-mouth--talking" />;
  }

  return (
    <div className="face-smile">
      <div className="face-smile-left" />
      <div className="face-smile-right" />
    </div>
  );
}