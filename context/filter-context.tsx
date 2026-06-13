"use client";

import { createContext, useContext, useState } from "react";

export const VOIVODESHIPS: { key: string; label: string }[] = [
  { key: "Dolnoslaskie", label: "Dolnośląskie" },
  { key: "Kujawsko-Pomorskie", label: "Kujawsko-Pomorskie" },
  { key: "Lubelskie", label: "Lubelskie" },
  { key: "Lubuskie", label: "Lubuskie" },
  { key: "Lodzkie", label: "Łódzkie" },
  { key: "Malopolskie", label: "Małopolskie" },
  { key: "Mazowieckie", label: "Mazowieckie" },
  { key: "Opolskie", label: "Opolskie" },
  { key: "Podkarpackie", label: "Podkarpackie" },
  { key: "Podlaskie", label: "Podlaskie" },
  { key: "Pomorskie", label: "Pomorskie" },
  { key: "Slaskie", label: "Śląskie" },
  { key: "Swietokrzyskie", label: "Świętokrzyskie" },
  { key: "Warminsko-Mazurskie", label: "Warmińsko-Mazurskie" },
  { key: "Wielkopolskie", label: "Wielkopolskie" },
  { key: "Zachodniopomorskie", label: "Zachodniopomorskie" },
];

type FilterState = {
  categoryFilter: string[];
  setCategoryFilter: (v: string[] | ((prev: string[]) => string[])) => void;
  filterActive: boolean;
  setFilterActive: (v: boolean | ((prev: boolean) => boolean)) => void;
  likedFilterActive: boolean;
  setLikedFilterActive: (v: boolean | ((prev: boolean) => boolean)) => void;
  ownedFilterActive: boolean;
  setOwnedFilterActive: (v: boolean | ((prev: boolean) => boolean)) => void;
  openFilterActive: boolean;
  setOpenFilterActive: (v: boolean | ((prev: boolean) => boolean)) => void;
  openLateFilterActive: boolean;
  setOpenLateFilterActive: (v: boolean | ((prev: boolean) => boolean)) => void;
  minRatingFilter: number | null;
  setMinRatingFilter: (v: number | null) => void;
  voivodeshipFilter: string | null;
  setVoivodeshipFilter: (v: string | null) => void;
  radiusFilter: number | null;
  setRadiusFilter: (v: number | null) => void;
  resetFilters: () => void;
};

const FilterContext = createContext<FilterState | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [filterActive, setFilterActive] = useState(false);
  const [likedFilterActive, setLikedFilterActive] = useState(false);
  const [ownedFilterActive, setOwnedFilterActive] = useState(false);
  const [openFilterActive, setOpenFilterActive] = useState(false);
  const [openLateFilterActive, setOpenLateFilterActive] = useState(false);
  const [minRatingFilter, setMinRatingFilter] = useState<number | null>(null);
  const [voivodeshipFilter, setVoivodeshipFilter] = useState<string | null>(null);
  const [radiusFilter, setRadiusFilter] = useState<number | null>(null);

  function resetFilters() {
    setCategoryFilter([]);
    setFilterActive(false);
    setLikedFilterActive(false);
    setOwnedFilterActive(false);
    setOpenFilterActive(false);
    setOpenLateFilterActive(false);
    setMinRatingFilter(null);
    setVoivodeshipFilter(null);
    setRadiusFilter(null);
  }

  return (
    <FilterContext.Provider
      value={{
        categoryFilter,
        setCategoryFilter,
        filterActive,
        setFilterActive,
        likedFilterActive,
        setLikedFilterActive,
        ownedFilterActive,
        setOwnedFilterActive,
        openFilterActive,
        setOpenFilterActive,
        openLateFilterActive,
        setOpenLateFilterActive,
        minRatingFilter,
        setMinRatingFilter,
        voivodeshipFilter,
        setVoivodeshipFilter,
        radiusFilter,
        setRadiusFilter,
        resetFilters,
      }}
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
