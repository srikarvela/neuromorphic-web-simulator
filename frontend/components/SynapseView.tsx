type Props = {
  weight: number;
};

export function SynapseView({ weight }: Props) {
  return (
    <div
      style={{
        width: `${Math.min(weight * 40, 300)}px`,
        height: "10px",
        background: "linear-gradient(90deg, #00ffcc, #00ffaa)",
        transition: "width 0.05s",
        borderRadius: "4px"
      }}
    />
  );
}