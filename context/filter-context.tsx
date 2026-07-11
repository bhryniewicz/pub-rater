"use client";

import { createContext, useContext, useState } from "react";
import { type Filters, DEFAULT_FILTERS } from "@/lib/filters";

type SetFilter = <K extends keyof Filters>(
  key: K,
  value: Filters[K] | ((prev: Filters[K]) => Filters[K]),
) => void;

type FilterState = {
  filters: Filters;
  setFilter: SetFilter;
  setFilters: (v: Filters) => void;
  resetFilters: () => void;
};

const FilterContext = createContext<FilterState | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const setFilter: SetFilter = (key, value) =>
    setFilters((prev) => ({
      ...prev,
      [key]:
        typeof value === "function"
          ? (value as (p: Filters[typeof key]) => Filters[typeof key])(
              prev[key],
            )
          : value,
    }));

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <FilterContext.Provider
      value={{ filters, setFilter, setFilters, resetFilters }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}
