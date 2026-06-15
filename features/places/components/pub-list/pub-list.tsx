"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { type PubListItem as PubListItemType } from "@/lib/supabase";
import { LuMap } from "react-icons/lu";
import { AnimatePresence } from "framer-motion";
import { OpenToggle } from "@/components/open-toggle";
import { PubListItem } from "./pub-list-item";

type Props = {
  places: PubListItemType[];
  totalCount: number;
  isLoading?: boolean;
  onShowOnMap: (coords: { id: string; lat: number; lon: number }) => void;
  onShowMap?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
};

export function PubList({
  places,
  totalCount,
  isLoading,
  onShowOnMap,
  onShowMap,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: Props) {
  const t = useTranslations("pubList");
  const sentinelRef = useRef<HTMLDivElement>(null);

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
        <p className="font-mono text-[10px] font-bold uppercase md:tracking-[0.2em] shrink-0">
          <span className="text-muted-foreground">{t("availableLabel")}</span>
          <span className="text-white"> {t("availableCount", { count: totalCount })}</span>
        </p>
        <div className="flex items-center gap-3">
          <OpenToggle />
          {onShowMap && (
            <button
              onClick={onShowMap}
              className="md:hidden flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border text-muted-foreground border-border hover:border-primary/50 transition-colors shrink-0 cursor-pointer"
            >
              <LuMap size={13} />
              {t("map")}
            </button>
          )}
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
          <AnimatePresence initial={false}>
            {places.map((marker, index) => (
              <PubListItem
                key={marker.id}
                marker={marker}
                index={index}
                onShowOnMap={onShowOnMap}
              />
            ))}
          </AnimatePresence>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="py-4 text-center">
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
          </div>
        </ul>
      )}
    </aside>
  );
}
