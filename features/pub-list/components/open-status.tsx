"use client";

import { useTranslations } from "next-intl";
import { gradientTextStyle } from "@/lib/color";
import { ACCENT } from "@/lib/constants";

type Props = {
  openNow: boolean | null;
  closeTime: string | null;
  closingSoon?: boolean;
  variant: "badge" | "inline";
  secondaryClassName?: string;
  /** When true, the "until {time}" text takes the same accent color as the status word. */
  accentSecondary?: boolean;
  /** Override status colors (inline variant). Defaults to the app ACCENT palette. */
  colors?: { open: string; closingSoon: string; closed: string };
};

export function OpenStatus({
  openNow,
  closeTime,
  closingSoon,
  variant,
  secondaryClassName = "text-foreground/80",
  accentSecondary = false,
  colors,
}: Props) {
  const t = useTranslations("pubList");

  const openColor = colors?.open ?? ACCENT.green;
  const closingColor = colors?.closingSoon ?? ACCENT.yellow;
  const closedColor = colors?.closed ?? ACCENT.red;

  const status =
    openNow === true
      ? closingSoon
        ? "closing-soon"
        : "open"
      : openNow === false
        ? "closed"
        : "unknown";

  if (variant === "badge") {
    const dotClass =
      status === "open"
        ? "bg-open"
        : status === "closed"
          ? "bg-closed"
          : status === "unknown"
            ? "bg-zinc-400"
            : "";
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`}
          style={
            status === "closing-soon"
              ? { backgroundColor: ACCENT.yellow }
              : undefined
          }
        />
        <span className="text-xs font-bold text-white">
          {status === "open"
            ? closeTime
              ? t("openUntil", { time: closeTime })
              : t("openStatus")
            : status === "closing-soon"
              ? t("closingSoon")
              : status === "closed"
                ? t("closedStatus")
                : t("noHours")}
        </span>
      </div>
    );
  }

  if (status === "open") {
    return (
      <>
        <span className="font-sans font-bold" style={gradientTextStyle(openColor)}>
          {t("openStatus")}
        </span>
        {closeTime && (
          <span
            className={accentSecondary ? "font-sans font-bold" : `${secondaryClassName} font-sans`}
            style={accentSecondary ? gradientTextStyle(openColor) : undefined}
          >
            {t("until", { time: closeTime })}
          </span>
        )}
      </>
    );
  }

  if (status === "closing-soon") {
    return (
      <>
        <span className="font-sans font-bold" style={gradientTextStyle(closingColor)}>
          {t("closingSoon")}
        </span>
        {closeTime && (
          <span
            className={accentSecondary ? "font-sans font-bold" : `${secondaryClassName} font-sans`}
            style={accentSecondary ? gradientTextStyle(closingColor) : undefined}
          >
            {t("until", { time: closeTime })}
          </span>
        )}
      </>
    );
  }

  if (status === "closed") {
    return (
      <span className="font-sans font-bold" style={gradientTextStyle(closedColor)}>
        {t("closedStatus")}
      </span>
    );
  }

  return <span className="font-sans text-muted-foreground">{t("noHours")}</span>;
}
