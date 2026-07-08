"use client";

import { useTranslations } from "next-intl";

type Props = {
  openNow: boolean | null;
  closeTime: string | null;
  variant: "badge" | "inline";
};

export function OpenStatus({ openNow, closeTime, variant }: Props) {
  const t = useTranslations("pubList");

  if (variant === "badge") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${openNow === true ? "bg-open" : openNow === false ? "bg-closed" : "bg-zinc-400"}`}
        />
        <span className="text-xs font-bold text-white">
          {openNow === true
            ? closeTime
              ? t("openUntil", { time: closeTime })
              : t("openStatus")
            : openNow === false
              ? t("closedStatus")
              : t("noHours")}
        </span>
      </div>
    );
  }

  return openNow === true ? (
    <>
      <span className="font-sans font-bold text-open">{t("openStatus")}</span>
      {closeTime && (
        <span className="text-foreground/80 font-sans">{t("until", { time: closeTime })}</span>
      )}
    </>
  ) : openNow === false ? (
    <span className="font-sans font-bold text-closed">{t("closedStatus")}</span>
  ) : (
    <span className="font-sans text-muted-foreground">{t("noHours")}</span>
  );
}
