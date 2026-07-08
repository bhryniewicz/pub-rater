"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { type PubListItem as PubListItemType } from "@/lib/supabase";
import { LuMap } from "react-icons/lu";
import { OpenToggle } from "@/components/open-toggle";
import { PubListItem } from "./pub-list-item";

type PubListProps = {
  places: PubListItemType[];
  totalCount: number;
  isLoading?: boolean;
  onShowMap: (coords?: { id: string; lat: number; lon: number }) => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
};

export function PubList({
  places,
  totalCount,
  isLoading,
  onShowMap,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: PubListProps) {
  const t = useTranslations("pubList");
  const sentinelRef = useRef<HTMLLIElement>(null);

  // Only animate genuinely-appended rows (infinite scroll). On a filter switch
  // the whole id-set is replaced, so we render instantly instead of re-animating.
  const prevRef = useRef<{ firstId: string | null; count: number }>({
    firstId: null,
    count: 0,
  });
  const firstId = places[0]?.id ?? null;
  const isAppend =
    firstId !== null &&
    firstId === prevRef.current.firstId &&
    places.length > prevRef.current.count;
  const animateFromIndex = isAppend ? prevRef.current.count : places.length;
  useEffect(() => {
    prevRef.current = { firstId, count: places.length };
  });

  useEffect(() => {
    if (!onLoadMore || !hasNextPage) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isFetchingNextPage) {
        onLoadMore();
      }
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  return (
    <aside className="flex flex-col h-full overflow-hidden">
      <div className="md:pr-4 pt-2 pb-4 shrink-0 flex items-center justify-between gap-3">
        <p className="font-mono text-[12px] font-extrabold uppercase shrink-0">
          <span className="text-muted-foreground">{t("availableLabel")}</span>
          <span className="text-primary">
            {" "}
            {t("availableCount", { count: totalCount })}
          </span>
        </p>
        <div className="flex items-center gap-3">
          <OpenToggle />
          <button
            onClick={() => onShowMap()}
            className="md:hidden flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-full border border-border bg-secondary text-muted-foreground hover:border-primary/50 transition-colors shrink-0 cursor-pointer"
          >
            <LuMap size={14} />
            {t("map")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("loading")}
          </p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto flex flex-col gap-4 md:gap-3 md:pr-4 pt-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {places.map((marker, index) => (
            <PubListItem
              key={marker.id}
              marker={marker}
              shouldAnimate={index >= animateFromIndex}
              onShowMap={onShowMap}
            />
          ))}

          {/* Infinite scroll sentinel */}
          <li ref={sentinelRef} className="py-4 text-center list-none">
            {isFetchingNextPage && (
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                {t("loadingMore")}
              </p>
            )}
            {!hasNextPage && places.length > 0 && (
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                {t("allLoaded")}
              </p>
            )}
          </li>
        </ul>
      )}
    </aside>
  );
}
