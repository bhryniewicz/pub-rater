"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approveRequest, rejectRequest } from "@/app/actions/review-request";
import { supabase } from "@/lib/supabase";
import {
  LocationRequestSchema,
  type LocationRequest,
  type PlaceRequest,
  type OwnerClaim,
} from "@/lib/schemas";
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
  pending: "bg-yellow-500/20 text-yellow-600 border border-yellow-500/30",
  approved: "bg-green-500/20 text-green-600 border border-green-500/30",
  rejected: "bg-red-500/20 text-red-600 border border-red-500/30",
};

type Tab = "place_request" | "owner_claim";

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
  const [activeTab, setActiveTab] = useState<Tab>("place_request");
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
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Loading requests…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-16 text-red-500 text-sm">
        Failed to load requests.
      </div>
    );
  }

  const placeRequests = (requests ?? []).filter(
    (r): r is PlaceRequest => r.type === "place_request"
  );
  const ownerClaims = (requests ?? []).filter(
    (r): r is OwnerClaim => r.type === "owner_claim"
  );

  const activeList = activeTab === "place_request" ? placeRequests : ownerClaims;

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-secondary rounded-xl p-1">
        <TabButton
          active={activeTab === "place_request"}
          onClick={() => { setActiveTab("place_request"); setExpandedId(null); }}
          label="Place Requests"
          count={placeRequests.length}
        />
        <TabButton
          active={activeTab === "owner_claim"}
          onClick={() => { setActiveTab("owner_claim"); setExpandedId(null); }}
          label="Ownership Claims"
          count={ownerClaims.length}
        />
      </div>

      {activeList.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          No {activeTab === "place_request" ? "place requests" : "ownership claims"} yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeList.map((req) => {
            const isExpanded = expandedId === req.id;
            const isBusy =
              (approveMutation.isPending && approveMutation.variables === req.id) ||
              (rejectMutation.isPending && rejectMutation.variables === req.id);

            return (
              <div
                key={req.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <span className="text-sm font-medium text-foreground flex-1 truncate">
                    {req.type === "place_request" ? req.name : `Claim: marker #${req.marker_id.slice(0, 8)}…`}
                  </span>
                  {req.type === "place_request" && req.amenity && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {AMENITY_LABELS[req.amenity] ?? req.amenity}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[req.status]}`}
                  >
                    {req.status}
                  </span>
                  <span className="text-muted-foreground text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 flex flex-col gap-4">
                    {req.type === "place_request" ? (
                      <PlaceRequestDetail req={req} />
                    ) : (
                      <OwnerClaimDetail req={req} />
                    )}

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
                          className="border-red-800 text-red-500 hover:bg-red-950/50 hover:text-red-400"
                        >
                          {rejectMutation.isPending && rejectMutation.variables === req.id
                            ? "Rejecting…"
                            : "Reject"}
                        </Button>
                      </div>
                    )}

                    {(approveMutation.isError && approveMutation.variables === req.id) ||
                     (rejectMutation.isError && rejectMutation.variables === req.id) ? (
                      <p className="text-sm text-red-500">Action failed. Please try again.</p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      <span
        className={`text-xs px-1.5 py-0.5 rounded-full ${
          active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function PlaceRequestDetail({ req }: { req: PlaceRequest }) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Name</dt>
          <dd className="text-foreground">{req.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Category</dt>
          <dd className="text-foreground">{AMENITY_LABELS[req.amenity] ?? req.amenity}</dd>
        </div>
        {req.address && (
          <div className="col-span-2">
            <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Address</dt>
            <dd className="text-foreground">{req.address}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Latitude</dt>
          <dd className="text-foreground font-mono text-xs">{req.lat.toFixed(6)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Longitude</dt>
          <dd className="text-foreground font-mono text-xs">{req.lon.toFixed(6)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Submitted</dt>
          <dd className="text-foreground text-xs">{new Date(req.created_at).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Status</dt>
          <dd>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[req.status]}`}>
              {req.status}
            </span>
          </dd>
        </div>
      </dl>

      {req.opening_hours && (
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1.5">Opening hours</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {(Object.entries(req.opening_hours) as [string, { open: string; close: string | null } | null][]).map(
              ([day, hours]) => (
                <div key={day} className="flex gap-2">
                  <span className="text-muted-foreground w-8">{DAY_LABELS[day]}</span>
                  <span className="text-foreground">
                    {hours ? `${hours.open}${hours.close ? ` – ${hours.close}` : ""}` : "Closed"}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}

function OwnerClaimDetail({ req }: { req: OwnerClaim }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
      <div className="col-span-2">
        <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Place ID</dt>
        <dd className="text-foreground font-mono text-xs">{req.marker_id}</dd>
      </div>
      {req.description && (
        <div className="col-span-2">
          <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Description</dt>
          <dd className="text-foreground">{req.description}</dd>
        </div>
      )}
      <div>
        <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Submitted</dt>
        <dd className="text-foreground text-xs">{new Date(req.created_at).toLocaleString()}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Status</dt>
        <dd>
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[req.status]}`}>
            {req.status}
          </span>
        </dd>
      </div>
    </dl>
  );
}
