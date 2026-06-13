"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { editPlace } from "@/app/actions/edit-place";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { EditPlaceValues } from "@/lib/schemas";

export function useUpdatePlace(markerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: EditPlaceValues) => editPlace(markerId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLACE(markerId) });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUB_LIST] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MARKERS });
    },
  });
}
