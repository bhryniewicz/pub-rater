import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { fetchPlaceData, getPlaceQueryOptions } from "@/features/places/api/get-place";
import { PlaceDetail } from "./_components/place-detail";

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = new QueryClient();
  const serverClient = await createServerSupabaseClient();

  await queryClient.prefetchQuery({
    ...getPlaceQueryOptions(id),
    queryFn: () => fetchPlaceData(id, serverClient),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PlaceDetail />
    </HydrationBoundary>
  );
}
