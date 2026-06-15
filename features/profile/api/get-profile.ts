"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchUser } from "@/features/profile/api/get-user";
import { QUERY_KEYS } from "@/lib/query-keys";

export function useProfile(_userId?: string, _enabled?: boolean) {
  const { data } = useQuery({
    queryKey: QUERY_KEYS.USER,
    queryFn: fetchUser,
    staleTime: Infinity,
  });
  return { data: data?.profile ?? null };
}
