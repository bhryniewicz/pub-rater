import { PubLine } from "@/assets/icons";

type RatingBreakdownItem = {
  star: number;
  count: number;
};

type Props = {
  items: RatingBreakdownItem[];
};

export function RatingBreakdown({ items }: Props) {
  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="space-y-1.5">
      {items.map(({ star, count }) => (
        <div key={star} className="flex items-center gap-2">
          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground w-5 shrink-0">
            {star}
            <PubLine size={10} className="text-muted-foreground" />
          </span>
          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}
