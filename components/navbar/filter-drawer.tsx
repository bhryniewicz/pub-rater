"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { getMarkersQueryOptions } from "@/lib/markers/get-markers";
import { useFilters } from "@/context/filter-context";
import { VOIVODESHIPS } from "@/lib/constants";
import { type Filters, DEFAULT_FILTERS } from "@/lib/filters";
import { useGeolocation } from "@/lib/geolocation/use-geolocation";
import { useUser } from "@/features/profile/api/get-user";
import { useOwnedMarkers } from "@/lib/markers/get-owned-markers";
import { AmenityFilters } from "@/components/amenity-filter-bar";
import { Switch } from "@/components/ui/switch";
import {
  LuCrosshair,
  LuChevronUp,
  LuChevronDown,
  LuClock,
  LuMoon,
} from "react-icons/lu";
import { PubMug } from "@/assets/icons";
import { Drawer } from "@/components/ui/drawer";

type FilterDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function FilterDrawer({ open, onClose }: FilterDrawerProps) {
  const t = useTranslations("searchBar");

  const RATING_OPTIONS: { label: string; value: number | null }[] = [
    { label: t("ratingAny"), value: null },
    { label: "3.0+", value: 3 },
    { label: "3.5+", value: 3.5 },
    { label: "4.0+", value: 4 },
    { label: "4.5+", value: 4.5 },
  ];

  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [showAllCategories, setShowAllCategories] = useState(false);
  // Pending (staged) filter state — only applied when "Show places" is clicked
  const [pending, setPending] = useState<Filters>(DEFAULT_FILTERS);

  const { filters, setFilters } = useFilters();
  const { status: geoStatus, coords: geoCoords, enable: enableGeo } = useGeolocation();
  const { user, profile } = useUser();
  const { data: ownedIds = null } = useOwnedMarkers(
    user?.id,
    !!user && profile?.role === "owner",
  );
  const { data: markers = [] } = useQuery(getMarkersQueryOptions());

  // Sync pending state from applied context when drawer opens
  useEffect(() => {
    if (open) setPending(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggleSection(key: string) {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setPendingFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setPending((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setPending(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    onClose();
  }

  function applyFilters() {
    setFilters(pending);
    onClose();
  }

  const categoryCounts = markers.reduce<Record<string, number>>((acc, m) => {
    acc[m.place_type] = (acc[m.place_type] ?? 0) + 1;
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  const categoryItems: { type: string; count: number }[] = [
    ...sortedCategories.map(([type, count]) => ({ type, count })),
  ];
  if (user && (profile?.liked_places.length ?? 0) > 0) {
    categoryItems.push({ type: "liked", count: profile!.liked_places.length });
  }
  if (profile?.role === "owner" && (ownedIds?.length ?? 0) > 0) {
    categoryItems.push({ type: "owned", count: ownedIds!.length });
  }

  function toggleCategory(type: string) {
    if (type === "liked") {
      setPending((p) => ({ ...p, categories: [], owned: false, liked: !p.liked }));
    } else if (type === "owned") {
      setPending((p) => ({ ...p, categories: [], liked: false, owned: !p.owned }));
    } else {
      setPending((p) => ({
        ...p,
        liked: false,
        owned: false,
        categories: !p.categories.includes(type) ? [type] : [],
      }));
    }
  }

  const pendingActiveTypes = [
    ...pending.categories,
    ...(pending.liked ? ["liked"] : []),
    ...(pending.owned ? ["owned"] : []),
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      hideHeaderBorder
      title={t("filters")}
      headerAction={
        <button
          onClick={clearFilters}
          className="text-xs font-extrabold text-primary hover:opacity-80 transition-opacity"
        >
          {t("clear")}
        </button>
      }
      footer={
        <button
          onClick={applyFilters}
          className="btn-gradient w-full py-3 rounded-2xl font-bold text-sm cursor-pointer"
        >
          {t("showPlaces")}
        </button>
      }
    >
      <div className="px-4 py-4 flex flex-col gap-6">

              {/* Place type — mobile only */}
              {categoryItems.length > 0 && (
                <div className="md:hidden">
                  <button
                    onClick={() => toggleSection("placeType")}
                    className="flex w-full items-center justify-between mb-3"
                  >
                    <span className="mono-label text-primary text-[10px] font-semibold">{t("placeType")}</span>
                    <LuChevronUp
                      size={16}
                      className={`text-muted-foreground transition-transform ${
                        collapsedSections.placeType ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {!collapsedSections.placeType && (
                    <div className="flex flex-col gap-2">
                      <AmenityFilters
                        variant="list"
                        items={
                          showAllCategories
                            ? categoryItems
                            : categoryItems.slice(0, 4)
                        }
                        activeTypes={pendingActiveTypes}
                        onToggle={toggleCategory}
                      />
                      {categoryItems.length > 4 && (
                        <button
                          onClick={() => setShowAllCategories((v) => !v)}
                          className="self-start px-1 py-1 text-sm font-semibold text-primary hover:underline"
                        >
                          {showAllCategories
                            ? t("showLess")
                            : t("showMoreCategories")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Minimum rating */}
              <div>
                <button
                  onClick={() => toggleSection("minRating")}
                  className="flex w-full items-center justify-between mb-3"
                >
                  <span className="mono-label text-primary text-[10px] font-semibold">{t("minRating")}</span>
                  <LuChevronUp
                    size={16}
                    className={`text-muted-foreground transition-transform ${
                      collapsedSections.minRating ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {!collapsedSections.minRating && (
                <div className="flex flex-nowrap gap-1.5">
                  {RATING_OPTIONS.map(({ label, value }) => (
                    <button
                      key={label}
                      onClick={() => setPendingFilter("minRating", value)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors ${
                        pending.minRating === value
                          ? "bg-primary border-transparent text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-foreground/20"
                      }`}
                    >
                      {value !== null && (
                        <PubMug
                          size={12}
                          className={
                            pending.minRating === value
                              ? "text-primary-foreground"
                              : "text-primary"
                          }
                        />
                      )}
                      {label}
                    </button>
                  ))}
                </div>
                )}
              </div>

              {/* Opening hours */}
              <div>
                <button
                  onClick={() => toggleSection("openingHours")}
                  className="flex w-full items-center justify-between mb-3"
                >
                  <span className="mono-label text-primary text-[10px] font-semibold">{t("openingHours")}</span>
                  <LuChevronUp
                    size={16}
                    className={`text-muted-foreground transition-transform ${
                      collapsedSections.openingHours ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {!collapsedSections.openingHours && (
                <div className="rounded-2xl border border-border bg-card/40">
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <LuClock size={18} className="text-primary shrink-0" />
                      <div>
                        <p className="text-[13px] font-medium text-foreground">
                          {t("openNow")}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {t("openNowDesc")}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={pending.open}
                      onCheckedChange={() => setPendingFilter("open", !pending.open)}
                      className="data-unchecked:bg-muted-foreground dark:data-unchecked:bg-muted-foreground data-checked:bg-primary"
                    />
                  </div>
                  <div className="h-px bg-border mx-4" />
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <LuMoon size={18} className="text-primary shrink-0" />
                      <div>
                        <p className="text-[13px] font-medium text-foreground">
                          {t("openLate")}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {t("openLateDesc")}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={pending.openLate}
                      onCheckedChange={() => setPendingFilter("openLate", !pending.openLate)}
                      className="data-unchecked:bg-muted-foreground dark:data-unchecked:bg-muted-foreground data-checked:bg-primary"
                    />
                  </div>
                </div>
                )}
              </div>

              {/* Location */}
              <div>
                <button
                  onClick={() => toggleSection("location")}
                  className="flex w-full items-center justify-between mb-3"
                >
                  <span className="mono-label text-primary text-[10px] font-semibold">{t("location")}</span>
                  <LuChevronUp
                    size={16}
                    className={`text-muted-foreground transition-transform ${
                      collapsedSections.location ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {!collapsedSections.location && (
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <select
                      value={pending.voivodeship ?? ""}
                      onChange={(e) => setPendingFilter("voivodeship", e.target.value || null)}
                      className="w-full bg-card/40 border border-border text-foreground text-sm rounded-lg px-4 py-3 pr-10 focus:outline-none focus:border-ring appearance-none cursor-pointer"
                    >
                      <option value="">{t("allVoivodeships")}</option>
                      {VOIVODESHIPS.map((v) => (
                        <option key={v.key} value={v.key}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                    <LuChevronDown
                      size={16}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary"
                    />
                  </div>
                  <div className="h-px bg-border" />
                  <button
                    onClick={() => {
                      if (geoStatus === "denied" || geoStatus === "unavailable") return;
                      if (pending.radius !== null) {
                        setPendingFilter("radius", null);
                      } else {
                        if (geoStatus === "idle") enableGeo();
                        setPendingFilter("radius", 1);
                      }
                    }}
                    disabled={geoStatus === "denied" || geoStatus === "unavailable"}
                    className={`flex w-full items-center gap-2.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      pending.radius !== null ? "text-foreground" : "text-primary hover:opacity-80"
                    }`}
                  >
                    <LuCrosshair size={16} />
                    {geoStatus === "loading" ? t("locating") : t("useMyLocation")}
                  </button>
                  {pending.radius !== null && geoCoords && (
                    <div className="relative">
                      <select
                        value={pending.radius}
                        onChange={(e) => setPendingFilter("radius", Number(e.target.value))}
                        className="w-full bg-card/40 border border-border text-foreground text-sm rounded-lg px-4 py-3 pr-10 focus:outline-none focus:border-ring appearance-none cursor-pointer"
                      >
                        <option value="0.1">0.1 km</option>
                        <option value="0.5">0.5 km</option>
                        <option value="1">1 km</option>
                        <option value="2">2 km</option>
                        <option value="5">5 km</option>
                      </select>
                      <LuChevronDown
                        size={16}
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary"
                      />
                    </div>
                  )}
                </div>
                )}
              </div>
      </div>
    </Drawer>
  );
}
