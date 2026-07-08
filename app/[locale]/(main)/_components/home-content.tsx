"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePubList } from "@/features/places/api/get-pub-list";
import { useMarkers } from "@/features/markers/api/get-markers";
import { PubList } from "@/features/places/components/pub-list/pub-list";
import { AgeGate } from "@/components/age-gate";
import { useUser } from "@/features/profile/api/get-user";
import { useSearch } from "@/context/search-context";
import { useFilters } from "@/context/filter-context";
import { LuArrowLeft } from "react-icons/lu";
import { AmenityFilterBar } from "@/features/places/components/amenity-filter-bar";
import { OpenToggle } from "@/components/open-toggle";

const Map = dynamic(() => import("@/features/places/components/map/map"), {
  ssr: false,
});

export default function HomeContent() {
  const t = useTranslations("home");
  const { profile } = useUser();
  const { searchSelectedId, clearSearch } = useSearch();
  const { resetFilters } = useFilters();
  const router = useRouter();

  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [focusedMarker, setFocusedMarker] = useState<{
    id: string;
    lat: number;
    lon: number;
  } | null>(null);

  useEffect(() => {
    if (profile && !profile.is_onboarded) router.push("/onboard");
  }, [profile, router]);

  useEffect(() => {
    clearSearch();
    resetFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markers = useMarkers();
  const { filteredMarkers } = markers;

  const {
    data: pubListPages,
    isLoading: listLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    enabled: pubListEnabled,
  } = usePubList(markers);

  const pubList = useMemo(
    () => pubListPages?.pages.flatMap((p) => p.items) ?? [],
    [pubListPages],
  );

  useEffect(() => {
    if (!searchSelectedId || filteredMarkers.length === 0) return;
    const m = filteredMarkers[0];
    setFocusedMarker({ id: m.id, lat: m.lat, lon: m.lon });
    setMobileView("map");
  }, [searchSelectedId, filteredMarkers]);

  return (
    <main className="flex flex-col flex-1 min-h-0">
      <AgeGate />
      <AmenityFilterBar />
      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-2 overflow-hidden">
        <div
          className={`min-h-0 px-4 md:pl-12 md:pr-0 overflow-hidden bg-background ${mobileView === "map" ? "hidden md:block" : "flex-1 md:flex-none"}`}
        >
          <PubList
            places={pubList}
            totalCount={pubListPages?.pages[0]?.totalCount ?? 0}
            isLoading={!pubListEnabled || listLoading}
            onShowMap={(coords) => {
              if (coords) setFocusedMarker(coords);
              setMobileView("map");
            }}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
          />
        </div>
        <div
          className={`min-h-0 md:pb-4 md:pl-2 ${mobileView === "list" ? "hidden md:block" : "flex-1 md:flex-none"}`}
        >
          <div className="relative w-full h-full md:rounded-2xl overflow-hidden">
            <button
              onClick={() => setMobileView("list")}
              className="md:hidden absolute top-4 left-4 z-10 flex items-center gap-1.5 h-7 px-3 bg-secondary text-muted-foreground rounded-full text-xs font-medium shadow-lg border border-border"
            >
              <LuArrowLeft size={14} />
              {t("listView")}
            </button>
            <div className="md:hidden absolute top-4 right-4 z-10 shadow-lg">
              <OpenToggle />
            </div>
            <Map markers={filteredMarkers} focusedMarker={focusedMarker} />
          </div>
        </div>
      </div>
    </main>
  );
}
