type IconProps = {
  name: string;
  size?: number;
  className?: string;
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  className,
}) => {
  return (
    <span
      className={`material-symbols-rounded leading-none ${className ?? ""}`}
      style={{
        fontSize: size,
        fontVariationSettings: `
          "FILL" 0,
          "wght" 400,
          "GRAD" 0,
          "opsz" ${size}
        `,
      }}
      aria-hidden
    >
      {name}
    </span>
  );
};
