"use client";

import { MutationCache, QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useRef } from "react";
import { toast, Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { GeolocationProvider } from "@/context/geolocation-context";
import { SearchProvider } from "@/context/search-context";
import { FilterProvider } from "@/context/filter-context";
import { PostHogProvider } from "posthog-js/react";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query";
import { posthog } from "@/lib/analytics/posthog";

function AuthSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    function invalidateUser() {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER });
    }

    window.addEventListener("pageshow", invalidateUser);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        // Drop the identified person so the next visitor on this device
        // isn't merged into the previous user.
        posthog.reset();
      } else if (session?.user) {
        // Tie all events to the real user id and attach person properties.
        posthog.identify(session.user.id, {
          email: session.user.email,
          display_name: session.user.user_metadata?.display_name,
        });
      }

      // INITIAL_SESSION fires on setup with the current session — the useQuery
      // in useUser() already handles the initial fetch, so skip it here.
      if (event === "INITIAL_SESSION") return;
      invalidateUser();
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("pageshow", invalidateUser);
    };
  }, [queryClient]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<QueryClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new QueryClient({
      mutationCache: new MutationCache({
        onError: (error) => {
          toast.error("Something went wrong", {
            description: error instanceof Error ? error.message : "Please try again.",
          });
        },
      }),
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
          retry: 0,
        },
      },
    });
  }

  return (
    <PostHogProvider client={posthog}>
      <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
        <QueryClientProvider client={clientRef.current}>
          <AuthSync />
          <GeolocationProvider>
            <FilterProvider>
              <SearchProvider>{children}</SearchProvider>
            </FilterProvider>
          </GeolocationProvider>
          <Toaster position="bottom-right" richColors />
          <ReactQueryDevtools />
        </QueryClientProvider>
      </ThemeProvider>
    </PostHogProvider>
  );
}
