"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef } from "react";
import { Toaster } from "sonner";
import { GeolocationProvider } from "@/context/geolocation-context";
import { SearchProvider } from "@/context/search-context";
import { FilterProvider } from "@/context/filter-context";
import { NotificationWatcher } from "@/components/notification-watcher";

export function Providers({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<QueryClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          refetchOnWindowFocus: false,
        },
      },
    });
  }

  return (
    <QueryClientProvider client={clientRef.current}>
      <GeolocationProvider>
        <FilterProvider>
          <SearchProvider>{children}</SearchProvider>
        </FilterProvider>
      </GeolocationProvider>
      <NotificationWatcher />
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  );
}
