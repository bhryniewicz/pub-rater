import { PubLine } from "@/assets/icons";

interface BeerRatingProps {
  rating: number;
  count?: number | null;
}

export function BeerRating({ rating, count }: BeerRatingProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const full = rating >= i + 1;
          const half = !full && rating >= i + 0.5;
          if (half) {
            return (
              <span
                key={i}
                className="relative inline-flex items-center justify-center w-[14px] h-[14px]"
              >
                <PubLine size={14} className="text-muted-foreground" />
                <span
                  className="absolute top-0 left-0 bottom-0 overflow-hidden"
                  style={{ width: "50%" }}
                >
                  <PubLine size={14} className="text-primary" />
                </span>
              </span>
            );
          }
          return (
            <span
              key={i}
              className="inline-flex items-center justify-center w-[14px] h-[14px]"
            >
              {full ? (
                <PubLine size={14} className="text-primary" />
              ) : (
                <PubLine size={14} className="text-muted-foreground" />
              )}
            </span>
          );
        })}
      </div>
      <span className="text-xs font-semibold text-foreground font-sans">
        {rating.toFixed(1)}
      </span>
      {count != null && (
        <span className="text-xs text-muted-foreground font-sans">
          ({count} reviews)
        </span>
      )}
    </div>
  );
}
