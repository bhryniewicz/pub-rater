"use client";

import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/query";

export type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  role: string;
  avatar_url: string | null;
  is_onboarded: boolean;
  banned: boolean;
};

async function fetchUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("fetch_users");
  if (error) throw error;
  return (data ?? []) as AdminUser[];
}

export const getUsersQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.USERS,
    queryFn: fetchUsers,
  });

export function useUsers() {
  return useSuspenseQuery(getUsersQueryOptions());
}
