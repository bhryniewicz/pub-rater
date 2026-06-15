"use client";

import { PlaceTypeIcon, PLACE_TYPE_FORM_LIST } from "@/features/places/place-type";

type Props = {
  value: string | undefined;
  onChange: (value: string) => void;
  labels?: Partial<Record<string, string>>;
};

export function PlaceTypeToggle({ value, onChange, labels }: Props) {
  return (
    <div className="flex gap-2">
      {PLACE_TYPE_FORM_LIST.map((item) => {
        const label = labels?.[item.value] ?? item.label;
        const selected = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`flex flex-1 flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              selected
                ? "border-primary bg-primary/10 text-foreground"
                : "border-input bg-transparent text-muted-foreground hover:border-ring hover:text-foreground"
            }`}
          >
            <PlaceTypeIcon placeType={item.value} size={18} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
