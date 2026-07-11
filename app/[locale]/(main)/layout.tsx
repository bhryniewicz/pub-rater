import { Suspense } from "react";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar/navbar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchPubListPage,
  DEFAULT_PUB_LIST_PARAMS,
  DEFAULT_PUB_LIST_QUERY_KEY,
} from "@/features/places/api/get-pub-list";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  const serverClient = await createServerSupabaseClient();

  await queryClient.prefetchInfiniteQuery({
    queryKey: DEFAULT_PUB_LIST_QUERY_KEY,
    queryFn: ({ pageParam }) =>
      fetchPubListPage(pageParam as number, DEFAULT_PUB_LIST_PARAMS, serverClient),
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="home-ambient flex flex-col h-screen overflow-hidden">
      <Navbar />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense>
          <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
