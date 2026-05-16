type DividerProps = {
  variant?: "solid" | "dotted";
};

export function Divider({ variant = "solid" }: DividerProps) {
  return (
    <hr style={{
      border: "none",
      borderBottom: variant === "dotted"
        ? "1px dotted rgba(0,0,0,0.18)"
        : "1px solid rgba(0,0,0,0.1)",
      margin: 0,
    }} />
  );
}
