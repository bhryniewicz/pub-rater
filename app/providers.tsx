"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useRef } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { GeolocationProvider } from "@/context/geolocation-context";
import { SearchProvider } from "@/context/search-context";
import { FilterProvider } from "@/context/filter-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<QueryClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
          retry: 3,
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          refetchOnWindowFocus: true,
          refetchOnMount: true,
          refetchOnReconnect: true,
        },
        mutations: {
          retry: 3,
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
      },
    });
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <QueryClientProvider client={clientRef.current}>
        <GeolocationProvider>
          <FilterProvider>
            <SearchProvider>{children}</SearchProvider>
          </FilterProvider>
        </GeolocationProvider>
        <Toaster position="bottom-right" richColors />
        <ReactQueryDevtools />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
