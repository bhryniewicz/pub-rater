"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approveRequest, rejectRequest } from "@/app/actions/review-request";
import { supabase } from "@/lib/supabase";
import { LocationRequestSchema, type LocationRequest } from "@/lib/schemas";
import { Button } from "@/components/ui/button";

const AMENITY_LABELS: Record<string, string> = {
  pub: "Pub 🍺",
  bar: "Bar 🥂",
  restaurant: "Restaurant 🍽️",
  cafe: "Cafe ☕",
  nightclub: "Nightclub 🎶",
  biergarten: "Biergarten 🌻",
};

const DAY_LABELS: Record<string, string> = {
  mo: "Mon", tu: "Tue", we: "Wed", th: "Thu", fr: "Fri", sa: "Sat", su: "Sun",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  approved: "bg-green-500/20 text-green-400 border border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border border-red-500/30",
};

async function fetchRequests(): Promise<LocationRequest[]> {
  const { data, error } = await supabase
    .from("location_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => LocationRequestSchema.parse(row));
}

export function RequestsList() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: requests, isLoading, isError } = useQuery({
    queryKey: ["location_requests"],
    queryFn: fetchRequests,
  });

  const approveMutation = useMutation({
    mutationFn: approveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location_requests"] });
      queryClient.invalidateQueries({ queryKey: ["markers"] });
      queryClient.invalidateQueries({ queryKey: ["pub_list"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["location_requests"] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">
        Loading requests…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-16 text-red-400 text-sm">
        Failed to load requests.
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">
        No requests yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((req) => {
        const isExpanded = expandedId === req.id;
        const isBusy =
          (approveMutation.isPending && approveMutation.variables === req.id) ||
          (rejectMutation.isPending && rejectMutation.variables === req.id);

        return (
          <div
            key={req.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
          >
            {/* Header row — always visible */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : req.id)}
            >
              <span className="text-sm font-medium text-white flex-1 truncate">
                {req.name}
              </span>
              <span className="text-xs text-zinc-400 shrink-0">
                {AMENITY_LABELS[req.amenity] ?? req.amenity}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[req.status]}`}
              >
                {req.status}
              </span>
              <span className="text-zinc-600 text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="border-t border-zinc-800 px-4 py-4 flex flex-col gap-4">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <dt className="text-zinc-500 text-xs uppercase tracking-wide mb-0.5">Name</dt>
                    <dd className="text-zinc-200">{req.name}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 text-xs uppercase tracking-wide mb-0.5">Category</dt>
                    <dd className="text-zinc-200">{AMENITY_LABELS[req.amenity] ?? req.amenity}</dd>
                  </div>
                  {req.address && (
                    <div className="col-span-2">
                      <dt className="text-zinc-500 text-xs uppercase tracking-wide mb-0.5">Address</dt>
                      <dd className="text-zinc-200">{req.address}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-zinc-500 text-xs uppercase tracking-wide mb-0.5">Latitude</dt>
                    <dd className="text-zinc-200 font-mono text-xs">{req.lat.toFixed(6)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 text-xs uppercase tracking-wide mb-0.5">Longitude</dt>
                    <dd className="text-zinc-200 font-mono text-xs">{req.lon.toFixed(6)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 text-xs uppercase tracking-wide mb-0.5">Submitted</dt>
                    <dd className="text-zinc-200 text-xs">
                      {new Date(req.created_at).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 text-xs uppercase tracking-wide mb-0.5">Status</dt>
                    <dd>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[req.status]}`}>
                        {req.status}
                      </span>
                    </dd>
                  </div>
                </dl>

                {/* Opening hours */}
                {req.opening_hours && (
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1.5">Opening hours</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      {(Object.entries(req.opening_hours) as [string, { open: string; close: string | null } | null][]).map(
                        ([day, hours]) => (
                          <div key={day} className="flex gap-2">
                            <span className="text-zinc-500 w-8">{DAY_LABELS[day]}</span>
                            <span className="text-zinc-300">
                              {hours ? `${hours.open}${hours.close ? ` – ${hours.close}` : ""}` : "Closed"}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Approve / Reject */}
                {req.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(req.id)}
                      disabled={isBusy}
                      className="bg-green-600 hover:bg-green-500 text-white"
                    >
                      {approveMutation.isPending && approveMutation.variables === req.id
                        ? "Approving…"
                        : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMutation.mutate(req.id)}
                      disabled={isBusy}
                      className="border-red-800 text-red-400 hover:bg-red-950/50 hover:text-red-300"
                    >
                      {rejectMutation.isPending && rejectMutation.variables === req.id
                        ? "Rejecting…"
                        : "Reject"}
                    </Button>
                  </div>
                )}

                {(approveMutation.isError && approveMutation.variables === req.id) ||
                 (rejectMutation.isError && rejectMutation.variables === req.id) ? (
                  <p className="text-sm text-red-400">Action failed. Please try again.</p>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
