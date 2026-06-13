"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestPlace } from "@/app/actions/request-place";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { AddPlaceValues, OpeningHours } from "@/lib/schemas";

export function useCreatePlaceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: AddPlaceValues & { opening_hours: OpeningHours | null }) =>
      requestPlace(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REQUESTS });
    },
  });
}
