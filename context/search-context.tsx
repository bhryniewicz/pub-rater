"use client";

import { createContext, useContext, useState } from "react";

type SearchState = {
  searchQuery: string;
  searchSelectedId: string | null;
  setSearchQuery: (q: string) => void;
  setSearchSelectedId: (id: string | null) => void;
  clearSearch: () => void;
};

const SearchContext = createContext<SearchState | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSelectedId, setSearchSelectedId] = useState<string | null>(null);

  function clearSearch() {
    setSearchQuery("");
    setSearchSelectedId(null);
  }

  return (
    <SearchContext.Provider
      value={{ searchQuery, searchSelectedId, setSearchQuery, setSearchSelectedId, clearSearch }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}
