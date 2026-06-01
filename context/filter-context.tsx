"use client";

import { createContext, useContext, useEffect, useState } from "react";

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
};

const FilterContext = createContext<FilterState | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [filterActive, setFilterActive] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("filterActive") === "1";
  });
  const [likedFilterActive, setLikedFilterActive] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("likedFilterActive") === "1";
  });
  const [ownedFilterActive, setOwnedFilterActive] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("ownedFilterActive") === "1";
  });
  const [openFilterActive, setOpenFilterActive] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("openFilterActive") === "1";
  });
  const [openLateFilterActive, setOpenLateFilterActive] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("openLateFilterActive") === "1";
  });
  const [minRatingFilter, setMinRatingFilter] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const v = sessionStorage.getItem("minRatingFilter");
    return v ? Number(v) : null;
  });
  const [voivodeshipFilter, setVoivodeshipFilter] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("voivodeshipFilter") ?? null;
  });
  const [radiusFilter, setRadiusFilter] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const v = sessionStorage.getItem("radiusFilter");
    return v ? Number(v) : null;
  });

  useEffect(() => {
    sessionStorage.setItem("filterActive", filterActive ? "1" : "0");
  }, [filterActive]);

  useEffect(() => {
    sessionStorage.setItem("likedFilterActive", likedFilterActive ? "1" : "0");
  }, [likedFilterActive]);

  useEffect(() => {
    sessionStorage.setItem("ownedFilterActive", ownedFilterActive ? "1" : "0");
  }, [ownedFilterActive]);

  useEffect(() => {
    sessionStorage.setItem("openFilterActive", openFilterActive ? "1" : "0");
  }, [openFilterActive]);

  useEffect(() => {
    sessionStorage.setItem("openLateFilterActive", openLateFilterActive ? "1" : "0");
  }, [openLateFilterActive]);

  useEffect(() => {
    if (minRatingFilter !== null) {
      sessionStorage.setItem("minRatingFilter", String(minRatingFilter));
    } else {
      sessionStorage.removeItem("minRatingFilter");
    }
  }, [minRatingFilter]);

  useEffect(() => {
    if (voivodeshipFilter) {
      sessionStorage.setItem("voivodeshipFilter", voivodeshipFilter);
    } else {
      sessionStorage.removeItem("voivodeshipFilter");
    }
  }, [voivodeshipFilter]);

  useEffect(() => {
    if (radiusFilter !== null) {
      sessionStorage.setItem("radiusFilter", String(radiusFilter));
    } else {
      sessionStorage.removeItem("radiusFilter");
    }
  }, [radiusFilter]);

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
