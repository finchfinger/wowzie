type FavoriteButtonProps = {
  isFavorite: boolean;
  onClick: () => void;
};

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-3 right-3 z-10 rounded-full bg-white/90 p-2 shadow ring-1 ring-black/10"
    >
      <span className="text-xl">
        {isFavorite ? "💜" : "🤍"}
      </span>
    </button>
  );
};
