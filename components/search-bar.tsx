"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllMarkers, type MapMarker } from "@/lib/supabase";
import { useSearch } from "@/context/search-context";
import { useFilters, VOIVODESHIPS } from "@/context/filter-context";
import { useGeolocation } from "@/context/geolocation-context";
import { useUser } from "@/hooks/use-user";
import {
  Command,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { LuSearch, LuSlidersHorizontal, LuCrosshair } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";

const AMENITY_ICONS: Record<string, string> = {
  pub: "🍺",
  bar: "🥂",
  restaurant: "🍽️",
  cafe: "☕",
  nightclub: "🎶",
  biergarten: "🌻",
};

const AMENITY_COLORS: Record<string, string> = {
  pub: "#d97706",
  bar: "#7c3aed",
  restaurant: "#dc2626",
  cafe: "#92400e",
  nightclub: "#db2777",
  biergarten: "#16a34a",
};

export function SearchBar() {
  const [input, setInput] = useState("");
  const [debouncedInput, setDebouncedInput] = useState("");
  const [open, setOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { searchQuery, searchSelectedId, setSearchQuery, setSearchSelectedId, clearSearch } =
    useSearch();
  const {
    categoryFilter,
    setCategoryFilter,
    filterActive,
    setFilterActive,
    likedFilterActive,
    setLikedFilterActive,
    voivodeshipFilter,
    setVoivodeshipFilter,
    radiusFilter,
    setRadiusFilter,
  } = useFilters();
  const { status: geoStatus, coords: geoCoords, enable: enableGeo } = useGeolocation();
  const { user } = useUser();
  const containerRef = useRef<HTMLDivElement>(null);
  const justSelected = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedInput(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    setOpen(debouncedInput.length > 0 && !filtersOpen);
  }, [debouncedInput, filtersOpen]);

  useEffect(() => {
    if (!searchQuery && !searchSelectedId) setInput("");
  }, [searchQuery, searchSelectedId]);

  const { data: markers = [] } = useQuery({
    queryKey: ["markers"],
    queryFn: fetchAllMarkers,
    staleTime: 5 * 60 * 1000,
  });

  const suggestions =
    debouncedInput.length >= 1
      ? markers
          .filter((m) =>
            m.name.toLowerCase().includes(debouncedInput.toLowerCase()),
          )
          .slice(0, 8)
      : [];

  const categoryCounts = markers.reduce<Record<string, number>>((acc, m) => {
    acc[m.amenity] = (acc[m.amenity] ?? 0) + 1;
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  function handleSelect(marker: MapMarker) {
    justSelected.current = true;
    setSearchSelectedId(marker.id);
    setSearchQuery("");
    setInput(marker.name);
    setOpen(false);
  }

  function handleSearchAll() {
    setSearchQuery(debouncedInput.trim());
    setSearchSelectedId(null);
    setOpen(false);
  }

  function handleClear() {
    setInput("");
    clearSearch();
    setOpen(false);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setFiltersOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const isActive = !!searchQuery || !!searchSelectedId;
  const hasActiveFilters =
    filterActive || likedFilterActive || !!voivodeshipFilter || categoryFilter.length > 0 || radiusFilter !== null;

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`flex items-center gap-2 px-4 h-11 rounded-xl border text-sm transition-colors ${
          isActive
            ? "bg-primary/10 border-primary/50 text-foreground"
            : "bg-input border-border text-foreground"
        }`}
      >
        <LuSearch className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
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
          placeholder="Search places…"
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
          aria-label="More filters"
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
                  No results for &quot;{debouncedInput}&quot;
                </CommandEmpty>
              ) : (
                <>
                  {suggestions.map((marker) => (
                    <CommandItem
                      key={marker.id}
                      value={marker.id}
                      onSelect={() => handleSelect(marker)}
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer"
                    >
                      <span className="text-base shrink-0">
                        {AMENITY_ICONS[marker.amenity] ?? "📍"}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm text-foreground truncate">
                          {marker.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {marker.amenity}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                  <CommandItem
                    value="__search_all__"
                    onSelect={handleSearchAll}
                    className="border-t border-border text-muted-foreground text-xs px-3 py-2.5 cursor-pointer"
                  >
                    <LuSearch className="w-3.5 h-3.5 shrink-0" />
                    Show all results for &quot;{debouncedInput}&quot;
                  </CommandItem>
                </>
              )}
            </CommandList>
          </Command>
        </div>
      )}

      {/* Filters popup */}
      {filtersOpen && (
        <div className="absolute top-full mt-1 right-0 w-full min-w-64 z-50 bg-popover border border-border rounded-xl shadow-2xl p-3 flex flex-col gap-3">
          {/* My spots + Liked places — only for logged-in users */}
          {user && (
            <div className="flex gap-2">
              <button
                onClick={() => setFilterActive((v) => !v)}
                className={`flex-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                  filterActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                My spots
              </button>
              <button
                onClick={() => setLikedFilterActive((v) => !v)}
                className={`flex-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                  likedFilterActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                Liked places
              </button>
            </div>
          )}

          {/* Voivodeships */}
          <select
            value={voivodeshipFilter ?? ""}
            onChange={(e) => setVoivodeshipFilter(e.target.value || null)}
            className="w-full bg-input border border-border text-foreground text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-ring"
          >
            <option value="">All voivodeships</option>
            {VOIVODESHIPS.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Near me */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (geoStatus === "denied" || geoStatus === "unavailable") return;
                if (radiusFilter !== null) {
                  setRadiusFilter(null);
                } else {
                  if (geoStatus === "idle") enableGeo();
                  setRadiusFilter(1);
                }
              }}
              disabled={geoStatus === "denied" || geoStatus === "unavailable"}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                radiusFilter !== null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              <LuCrosshair size={12} />
              {geoStatus === "loading" ? "Locating…" : "Near me"}
            </button>
            {radiusFilter !== null && geoCoords && (
              <select
                value={radiusFilter}
                onChange={(e) => setRadiusFilter(Number(e.target.value))}
                className="flex-1 bg-input border border-border text-foreground text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-ring"
              >
                <option value="0.1">0.1 km</option>
                <option value="0.5">0.5 km</option>
                <option value="1">1 km</option>
                <option value="2">2 km</option>
                <option value="5">5 km</option>
              </select>
            )}
          </div>

          {/* Categories — mobile only */}
          {sortedCategories.length > 0 && (
            <div className="md:hidden flex flex-wrap gap-2">
              {sortedCategories.map(([type, count]) => {
                const active = categoryFilter.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() =>
                      setCategoryFilter((prev) =>
                        prev.includes(type)
                          ? prev.filter((t) => t !== type)
                          : [...prev, type],
                      )
                    }
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                      active
                        ? "border-transparent text-white"
                        : "text-muted-foreground border-border hover:border-primary/50"
                    }`}
                    style={active ? { background: AMENITY_COLORS[type] ?? "#4b5563" } : undefined}
                  >
                    <span>{AMENITY_ICONS[type] ?? "📍"}</span>
                    <span className="capitalize">{type}</span>
                    <span className="text-[10px] opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
