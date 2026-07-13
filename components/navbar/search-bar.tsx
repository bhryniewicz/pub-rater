"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import type { MapMarker } from "@/lib/supabase";
import { getMarkersQueryOptions } from "@/lib/markers/get-markers";
import { useSearch } from "@/context/search-context";
import { useFilters } from "@/context/filter-context";
import { PlaceTypeIcon, placeTypeGradient } from "@/lib/place-type";
import { analytics } from "@/lib/analytics";
import {
  Command,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { LuSearch, LuSlidersHorizontal } from "react-icons/lu";

type SearchBarProps = {
  filtersOpen: boolean;
  onToggleFilters: () => void;
};

export function SearchBar({ filtersOpen, onToggleFilters }: SearchBarProps) {
  const t = useTranslations("searchBar");

  const [input, setInput] = useState("");
  const [debouncedInput] = useDebounce(input, 500);
  const [open, setOpen] = useState(false);

  const { searchQuery, searchSelectedId, setSearchQuery, setSearchSelectedId, clearSearch } =
    useSearch();
  const { filters } = useFilters();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

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
              if (filtersOpen) onToggleFilters();
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
            onToggleFilters();
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
    </div>
  );
}
