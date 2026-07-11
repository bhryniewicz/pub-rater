"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import type { MapMarker } from "@/lib/supabase";
import { getMarkersQueryOptions } from "@/features/markers/api/get-markers";
import { useSearch } from "@/context/search-context";
import { useFilters } from "@/context/filter-context";
import { VOIVODESHIPS } from "@/lib/constants";
import { type Filters, DEFAULT_FILTERS } from "@/features/places/filters";
import { useGeolocation } from "@/context/geolocation-context";
import { useUser } from "@/features/profile/api/get-user";
import { useOwnedMarkers } from "@/features/markers/api/get-owned-markers";
import { PlaceTypeIcon, placeTypeGradient } from "@/features/places/place-type";
import { analytics } from "@/lib/analytics";
import { AmenityFilters } from "@/features/places/components/amenity-filter-bar";
import {
  Command,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import {
  LuSearch,
  LuSlidersHorizontal,
  LuCrosshair,
  LuChevronUp,
} from "react-icons/lu";
import { Drawer } from "@/components/ui/drawer";

export function SearchBar() {
  const t = useTranslations("searchBar");

  const RATING_OPTIONS: { label: string; value: number | null }[] = [
    { label: t("ratingAny"), value: null },
    { label: "3.0 ★ +", value: 3 },
    { label: "3.5 ★ +", value: 3.5 },
    { label: "4.0 ★ +", value: 4 },
    { label: "4.5 ★ +", value: 4.5 },
  ];
  const [input, setInput] = useState("");
  const [debouncedInput] = useDebounce(input, 500);
  const [open, setOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [showAllCategories, setShowAllCategories] = useState(false);

  function toggleSection(key: string) {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Pending (staged) filter state — only applied when "Show places" is clicked
  const [pending, setPending] = useState<Filters>(DEFAULT_FILTERS);

  function setPendingFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setPending((prev) => ({ ...prev, [key]: value }));
  }

  const { searchQuery, searchSelectedId, setSearchQuery, setSearchSelectedId, clearSearch } =
    useSearch();
  const { filters, setFilters } = useFilters();
  const { status: geoStatus, coords: geoCoords, enable: enableGeo } = useGeolocation();
  const { user, profile } = useUser();
  const { data: ownedIds = null } = useOwnedMarkers(
    user?.id,
    !!user && profile?.role === "owner",
  );
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync pending state from applied context when panel opens
  useEffect(() => {
    if (filtersOpen) setPending(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersOpen]);

  useEffect(() => {
    setOpen(debouncedInput.length > 0 && !filtersOpen);
  }, [debouncedInput, filtersOpen]);

  useEffect(() => {
    if (!searchQuery && !searchSelectedId) setInput("");
  }, [searchQuery, searchSelectedId]);

  const { data: markers = [] } = useQuery(getMarkersQueryOptions());

  const suggestions =
    debouncedInput.length >= 1
      ? markers
          .filter((m) =>
            m.name.toLowerCase().includes(debouncedInput.toLowerCase()),
          )
          .slice(0, 8)
      : [];

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

  function normalizedQuery() {
    return debouncedInput.trim().toLowerCase().replace(/\s+/g, " ");
  }

  function handleSelect(marker: MapMarker) {
    analytics.searchPerformed({
      query: normalizedQuery(),
      mode: "select",
      result_count: suggestions.length,
      matched_place_id: marker.id,
      matched_place_name: marker.name,
      matched_place_type: marker.place_type,
    });
    setOpen(false);
    router.push(`/places/${marker.id}`);
  }

  function handleSearchAll() {
    const top = suggestions[0];
    analytics.searchPerformed({
      query: normalizedQuery(),
      mode: "submit",
      result_count: suggestions.length,
      matched_place_id: top?.id,
      matched_place_name: top?.name,
      matched_place_type: top?.place_type,
    });
    setSearchQuery(debouncedInput.trim());
    setSearchSelectedId(null);
    setOpen(false);
  }

  function handleClear() {
    setInput("");
    clearSearch();
    setOpen(false);
  }

  function clearPendingFilters() {
    setPending(DEFAULT_FILTERS);
  }

  function handleApplyFilters() {
    setFilters(pending);
    setFiltersOpen(false);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const isActive = !!searchQuery || !!searchSelectedId;
  // hasActiveFilters reflects *applied* filters (context), not pending
  const hasActiveFilters =
    filters.usePreferences ||
    filters.liked ||
    filters.owned ||
    !!filters.voivodeship ||
    filters.categories.length > 0 ||
    filters.radius !== null ||
    filters.minRating !== null ||
    filters.open ||
    filters.openLate;

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`flex items-center gap-2 px-4 h-11 rounded-xl border text-sm transition-colors focus-within:border-primary ${
          isActive
            ? "bg-primary/10 border-primary/50 text-foreground"
            : "bg-card border-primary/50 shadow-[0_0_16px_-6px_rgba(217,119,6,0.4)] text-foreground"
        }`}
      >
        <LuSearch className="w-3.5 h-3.5 shrink-0 text-primary" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearchAll();
            if (e.key === "Escape") {
              setOpen(false);
              setFiltersOpen(false);
            }
          }}
          placeholder={t("placeholder")}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-sm min-w-0"
        />
        {input && (
          <button
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground leading-none shrink-0"
          >
            ✕
          </button>
        )}
        <button
          onClick={() => {
            setFiltersOpen((v) => !v);
            setOpen(false);
          }}
          className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
            filtersOpen || hasActiveFilters
              ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
          aria-label={t("moreFilters")}
        >
          <LuSlidersHorizontal size={14} />
        </button>
      </div>

      {/* Suggestions dropdown */}
      {open && (
        <div className="absolute top-full mt-1 left-0 w-full min-w-64 z-50">
          <Command
            shouldFilter={false}
            className="bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            <CommandList>
              {suggestions.length === 0 ? (
                <CommandEmpty className="text-muted-foreground text-xs py-4">
                  {t("noResults", { query: debouncedInput })}
                </CommandEmpty>
              ) : (
                <>
                  {suggestions.map((marker) => (
                    <CommandItem
                      key={marker.id}
                      value={marker.id}
                      onSelect={() => handleSelect(marker)}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                    >
                      <span
                        style={{ background: placeTypeGradient(marker.place_type) }}
                        className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 text-white"
                      >
                        <PlaceTypeIcon
                          placeType={marker.place_type}
                          size={16}
                          color="currentColor"
                        />
                      </span>
                      <span className="text-sm text-foreground truncate min-w-0">
                        {marker.name}
                      </span>
                    </CommandItem>
                  ))}
                  <CommandItem
                    value="__search_all__"
                    onSelect={handleSearchAll}
                    className="mt-2 border-t border-border text-muted-foreground text-xs px-3 py-2.5 cursor-pointer"
                  >
                    <LuSearch className="w-3.5 h-3.5 shrink-0" />
                    {t("showAllResults", { query: debouncedInput })}
                  </CommandItem>
                </>
              )}
            </CommandList>
          </Command>
        </div>
      )}

      {/* Filters drawer */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t("filters")}
        headerAction={
          <button
            onClick={clearPendingFilters}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("clearFilters")}
          </button>
        }
        footer={
          <button
            onClick={handleApplyFilters}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-base"
          >
            {t("showPlaces")}
          </button>
        }
      >
        <div className="px-4 py-5 flex flex-col gap-7">

                {/* Place type — mobile only */}
                {categoryItems.length > 0 && (
                  <div className="md:hidden">
                    <button
                      onClick={() => toggleSection("placeType")}
                      className="flex w-full items-center justify-between mb-3"
                    >
                      <span className="font-bold text-foreground text-sm">{t("placeType")}</span>
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
                    <span className="font-bold text-foreground text-sm">{t("minRating")}</span>
                    <LuChevronUp
                      size={16}
                      className={`text-muted-foreground transition-transform ${
                        collapsedSections.minRating ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {!collapsedSections.minRating && (
                  <div className="flex flex-wrap gap-2">
                    {RATING_OPTIONS.map(({ label, value }) => (
                      <button
                        key={label}
                        onClick={() => setPendingFilter("minRating", value)}
                        className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                          pending.minRating === value
                            ? "bg-secondary border-foreground/20 text-foreground"
                            : "border-border text-muted-foreground hover:border-foreground/20"
                        }`}
                      >
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
                    <span className="font-bold text-foreground text-sm">{t("openingHours")}</span>
                    <LuChevronUp
                      size={16}
                      className={`text-muted-foreground transition-transform ${
                        collapsedSections.openingHours ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {!collapsedSections.openingHours && (
                  <div className="flex flex-col gap-2">
                    <div
                      className={`flex items-center justify-between px-3 py-3 rounded-xl border transition-colors ${
                        pending.open ? "bg-secondary border-foreground/20" : "border-border"
                      }`}
                    >
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            pending.open ? "text-open" : "text-foreground"
                          }`}
                        >
                          {t("openNow")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("openNowDesc")}
                        </p>
                      </div>
                      <Switch
                        checked={pending.open}
                        onCheckedChange={() => setPendingFilter("open", !pending.open)}
                        className="data-unchecked:bg-muted-foreground dark:data-unchecked:bg-muted-foreground data-checked:bg-primary"
                      />
                    </div>
                    <div
                      className={`flex items-center justify-between px-3 py-3 rounded-xl border transition-colors ${
                        pending.openLate ? "bg-secondary border-foreground/20" : "border-border"
                      }`}
                    >
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            pending.openLate ? "text-open" : "text-foreground"
                          }`}
                        >
                          {t("openLate")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("openLateDesc")}
                        </p>
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
                    <span className="font-bold text-foreground text-sm">{t("location")}</span>
                    <LuChevronUp
                      size={16}
                      className={`text-muted-foreground transition-transform ${
                        collapsedSections.location ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {!collapsedSections.location && (
                  <div className="flex flex-col gap-3">
                    <select
                      value={pending.voivodeship ?? ""}
                      onChange={(e) => setPendingFilter("voivodeship", e.target.value || null)}
                      className="w-full bg-input border border-border text-foreground text-sm rounded-2xl px-4 py-3.5 focus:outline-none focus:border-ring appearance-none cursor-pointer"
                    >
                      <option value="">{t("allVoivodeships")}</option>
                      {VOIVODESHIPS.map((v) => (
                        <option key={v.key} value={v.key}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
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
                        className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          pending.radius !== null
                            ? "bg-secondary border-foreground/20 text-foreground"
                            : "border-border text-muted-foreground hover:border-foreground/20"
                        }`}
                      >
                        <LuCrosshair size={14} />
                        {geoStatus === "loading" ? t("locating") : t("nearMe")}
                      </button>
                      {pending.radius !== null && geoCoords && (
                        <select
                          value={pending.radius}
                          onChange={(e) => setPendingFilter("radius", Number(e.target.value))}
                          className="flex-1 bg-input border border-border text-foreground text-sm rounded-full px-4 py-2.5 focus:outline-none focus:border-ring"
                        >
                          <option value="0.1">0.1 km</option>
                          <option value="0.5">0.5 km</option>
                          <option value="1">1 km</option>
                          <option value="2">2 km</option>
                          <option value="5">5 km</option>
                        </select>
                      )}
                    </div>
                  </div>
                  )}
                </div>
        </div>
      </Drawer>
    </div>
  );
}
