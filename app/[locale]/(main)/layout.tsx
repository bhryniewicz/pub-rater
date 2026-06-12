import { Suspense } from "react";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { fetchAllMarkers } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query-keys";

const MARKERS_STALE_TIME = 5 * 60 * 1000;

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  const serverClient = await createServerSupabaseClient();

  await queryClient.prefetchQuery({
    queryKey: QUERY_KEYS.MARKERS,
    queryFn: () => fetchAllMarkers(serverClient),
    staleTime: MARKERS_STALE_TIME,
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense>
          <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
