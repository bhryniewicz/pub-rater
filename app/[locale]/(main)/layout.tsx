import { Suspense } from "react";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar/navbar";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { fetchAllMarkers, getMarkersQueryOptions } from "@/features/markers/api/get-markers";
import {
  fetchPubListPage,
  DEFAULT_PUB_LIST_PARAMS,
  DEFAULT_PUB_LIST_QUERY_KEY,
} from "@/features/places/api/get-pub-list-fetcher";

const MARKERS_STALE_TIME = 5 * 60 * 1000;

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  const serverClient = await createServerSupabaseClient();

  await Promise.all([
    queryClient.prefetchQuery({
      ...getMarkersQueryOptions(),
      queryFn: () => fetchAllMarkers(serverClient),
      staleTime: MARKERS_STALE_TIME,
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: DEFAULT_PUB_LIST_QUERY_KEY,
      queryFn: ({ pageParam }) =>
        fetchPubListPage(pageParam as number, DEFAULT_PUB_LIST_PARAMS, serverClient),
      initialPageParam: 0,
      staleTime: 2 * 60 * 1000,
    }),
  ]);

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
