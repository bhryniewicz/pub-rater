import { Suspense } from "react";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/query-keys";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { fetchPlaceTypeCounts } from "@/features/markers/api/get-place-type-counts";
import HomeContent from "./_components/home-content";

function Spinner() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

export default async function Page() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: QUERY_KEYS.PLACE_TYPE_COUNTS,
    queryFn: async () =>
      fetchPlaceTypeCounts(await createServerSupabaseClient()),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<Spinner />}>
        <HomeContent />
      </Suspense>
    </HydrationBoundary>
  );
}
