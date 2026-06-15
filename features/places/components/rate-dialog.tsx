"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PubLine } from "@/assets/icons";
import { TicketLayout } from "@/components/forms/_layout/ticket-layout";

export type AdditionalInfoKey =
  | "outdoor_seating"
  | "smoking_area"
  | "great_beer_selection"
  | "lots_of_beers_on_tap"
  | "serves_food"
  | "live_music"
  | "dog_friendly";

export type GuestCheckValues = {
  rating: number;
  atmosphere: number;
  service: number;
  space: number;
  priceTier: number | null;
  additionalInfo: AdditionalInfoKey[];
  comment: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markerName: string;
  markerPlaceType: string;
  placeCity?: string | null;
  placeShortCode?: string | null;
  onSubmit: (values: GuestCheckValues) => void;
  isPending?: boolean;
  isError?: boolean;
};

function BeerRating({
  value,
  onChange,
  size = 26,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="leading-none transition-opacity hover:opacity-75 cursor-pointer"
        >
          <PubLine
            size={size}
            color={(hover || value) >= i ? "#b5621e" : "#d4c5a9"}
          />
        </button>
      ))}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-dashed border-[#c4aa88] my-2" />;
}

export function RateDialog({
  open,
  onOpenChange,
  markerName,
  markerPlaceType,
  placeCity,
  placeShortCode,
  onSubmit,
  isPending,
  isError,
}: Props) {
  const t = useTranslations("guestCheck");

  const ADDITIONAL_OPTIONS: { key: AdditionalInfoKey; label: string }[] = [
    { key: "outdoor_seating", label: t("outdoor") },
    { key: "smoking_area", label: t("smoking") },
    { key: "great_beer_selection", label: t("beerSelection") },
    { key: "lots_of_beers_on_tap", label: t("beersOnTap") },
    { key: "serves_food", label: t("servesFood") },
    { key: "live_music", label: t("liveMusic") },
    { key: "dog_friendly", label: t("dogFriendly") },
  ];

  const [overallRating, setOverallRating] = useState(0);
  const [atmosphere, setAtmosphere] = useState(0);
  const [service, setService] = useState(0);
  const [space, setSpace] = useState(0);
  const [priceTier, setPriceTier] = useState<number | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState<Set<AdditionalInfoKey>>(new Set());
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (open) {
      setOverallRating(0);
      setAtmosphere(0);
      setService(0);
      setSpace(0);
      setPriceTier(null);
      setAdditionalInfo(new Set());
      setComment("");
    }
  }, [open]);

  function toggleAdditional(key: AdditionalInfoKey) {
    setAdditionalInfo((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSubmit() {
    if (overallRating === 0) return;
    onSubmit({
      rating: overallRating,
      atmosphere,
      service,
      space,
      priceTier,
      additionalInfo: Array.from(additionalInfo),
      comment,
    });
  }

  const subRatings = [
    { label: t("atmosphere"), value: atmosphere, onChange: setAtmosphere },
    { label: t("service"), value: service, onChange: setService },
    { label: t("theSpace"), value: space, onChange: setSpace },
  ];

  const meta = [
    markerPlaceType,
    placeCity ? ` · ${placeCity}` : "",
    placeShortCode ? ` · #${placeShortCode}` : "",
  ].join("");

  return (
    <TicketLayout
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      subtitle={markerName}
      meta={meta}
      onClose={() => onOpenChange(false)}
      showBarcode={true}
      scrollable={true}
      maxWidth="max-w-[360px] w-full"
    >
      <div className="bg-[#f5ede0] px-6 pb-3">
        <Divider />

        {/* Overall rating */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-mono text-[9px] text-[#7a6248] uppercase" style={{ letterSpacing: "0.12em" }}>
              {t("setRating")}
            </span>
            <span className="font-mono text-[9px] text-[#7a6248] uppercase" style={{ letterSpacing: "0.12em" }}>
              {t("tapMug")}
            </span>
          </div>
          <div className="flex justify-center">
            <BeerRating value={overallRating} onChange={setOverallRating} size={32} />
          </div>
        </div>

        <Divider />

        {/* Sub-ratings */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="font-mono text-[9px] text-[#7a6248] uppercase" style={{ letterSpacing: "0.12em" }}>{t("itemHeader")}</span>
            <span className="font-mono text-[9px] text-[#7a6248] uppercase" style={{ letterSpacing: "0.12em" }}>{t("beersHeader")}</span>
          </div>
          {subRatings.map(({ label, value, onChange }) => (
            <div
              key={label}
              className="flex items-center justify-between py-1.5 border-b border-dashed border-[#e0d0b8] last:border-0"
            >
              <span className="font-mono text-[11px] font-bold text-[#1a1009] uppercase shrink-0 w-24" style={{ letterSpacing: "0.08em" }}>
                {label}
              </span>
              <BeerRating value={value} onChange={onChange} size={20} />
            </div>
          ))}
        </div>

        <Divider />

        {/* Price tier */}
        <div>
          <div className="mb-1.5">
            <span className="font-mono text-[9px] text-[#7a6248] uppercase" style={{ letterSpacing: "0.12em" }}>
              {t("priceTier")}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(["$", "$$", "$$$", "$$$$"] as const).map((tier, i) => {
              const selected = priceTier === i + 1;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setPriceTier(selected ? null : i + 1)}
                  className={`font-mono text-xs font-bold py-2 border rounded-sm transition-colors ${
                    selected
                      ? "bg-[#1a1009] text-[#f5ede0] border-[#1a1009]"
                      : "bg-transparent text-[#1a1009] border-[#c4aa88] hover:border-[#1a1009]"
                  }`}
                  style={{ letterSpacing: "0.05em" }}
                >
                  {tier}
                </button>
              );
            })}
          </div>
        </div>

        <Divider />

        {/* Additional info */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-mono text-[9px] text-[#7a6248] uppercase" style={{ letterSpacing: "0.12em" }}>
              {t("additionalInfo")}
            </span>
            <span className="font-mono text-[9px] text-[#7a6248] uppercase" style={{ letterSpacing: "0.12em" }}>
              {t("tickAll")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            {ADDITIONAL_OPTIONS.map(({ key, label }) => {
              const checked = additionalInfo.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleAdditional(key)}
                  className={`flex items-start gap-2 p-1.5 rounded-sm text-left transition-colors ${
                    checked ? "bg-[#e8d5b0]" : "hover:bg-[#ede3cf]"
                  }`}
                >
                  <span
                    className={`mt-0.5 w-4 h-4 shrink-0 border flex items-center justify-center rounded-[2px] transition-colors ${
                      checked ? "bg-[#c07820] border-[#c07820]" : "bg-transparent border-[#c4aa88]"
                    }`}
                  >
                    {checked && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none" aria-hidden="true">
                        <path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="font-mono text-[9px] font-bold text-[#1a1009] uppercase leading-tight" style={{ letterSpacing: "0.08em" }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Divider />

        {/* Comment */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-mono text-[9px] text-[#7a6248] uppercase" style={{ letterSpacing: "0.12em" }}>
              {t("comments")}
            </span>
            <span className="font-mono text-[9px] text-[#7a6248]" style={{ letterSpacing: "0.08em" }}>
              {t("charCount", { count: comment.length })}
            </span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder={t("commentPlaceholder")}
            rows={3}
            className="w-full bg-[#ede3cf] border border-dashed border-[#c4aa88] font-mono text-[10px] text-[#1a1009] placeholder:text-[#b09a7a] px-3 py-2 resize-none outline-none rounded-sm leading-relaxed"
            style={{ letterSpacing: "0.06em" }}
          />
        </div>

        <div className="mt-3" />

        {/* Actions */}
        <div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={overallRating === 0 || isPending}
            className="w-full py-3 font-mono font-black text-sm text-white rounded-sm transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#c07820", letterSpacing: "0.2em" }}
          >
            {isPending ? t("posting") : t("post")}
          </button>

          {isError && (
            <p className="font-mono text-[9px] text-red-700 text-center mt-1.5" style={{ letterSpacing: "0.1em" }}>
              {t("failed")}
            </p>
          )}
        </div>
      </div>
    </TicketLayout>
  );
}
