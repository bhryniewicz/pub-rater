"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approveRequest, rejectRequest } from "@/app/actions/review-request";
import { supabase } from "@/lib/supabase";
import { LocationRequestSchema, ReviewActionSchema, type PlaceRequest } from "@/lib/schemas";
import dynamic from "next/dynamic";
import { LuCheck, LuX, LuArrowLeft, LuArrowUpDown } from "react-icons/lu";

const RequestMiniMap = dynamic(
  () => import("./request-mini-map").then((m) => m.RequestMiniMap),
  { ssr: false },
);

const AMENITY_LABELS: Record<string, { label: string; icon: string }> = {
  pub: { label: "Pub", icon: "🍺" },
  bar: { label: "Bar", icon: "🥂" },
  restaurant: { label: "Restaurant", icon: "🍽️" },
  cafe: { label: "Cafe", icon: "☕" },
  nightclub: { label: "Nightclub", icon: "🎶" },
  biergarten: { label: "Biergarten", icon: "🌻" },
};

const DAY_LABELS: Record<string, string> = {
  mo: "Mon", tu: "Tue", we: "Wed", th: "Thu", fr: "Fri", sa: "Sat", su: "Sun",
};

type FilterTab = "all" | "pub" | "biergarten" | "needs_info";

async function fetchPlaceRequests(): Promise<PlaceRequest[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("type", "place_request")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => LocationRequestSchema.parse(row) as PlaceRequest);
}

function reqRef(idx: number) {
  return `REQ-${2041 - idx}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending")
    return <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />pending</span>;
  if (status === "approved")
    return <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />approved</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />rejected</span>;
}

function AmenityChip({ amenity }: { amenity: string }) {
  const info = AMENITY_LABELS[amenity] ?? { label: amenity, icon: "📍" };
  return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-card border border-border text-foreground">{info.icon} {info.label}</span>;
}

function AmenityIcon({ amenity }: { amenity: string }) {
  const info = AMENITY_LABELS[amenity] ?? { label: amenity, icon: "📍" };
  return <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-base shrink-0">{info.icon}</div>;
}

export function PlaceRequestsPane() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [sortNewest, setSortNewest] = useState(true);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["place_requests"],
    queryFn: fetchPlaceRequests,
  });

  const approveMutation = useMutation({
    mutationFn: approveRequest,
    onSuccess: () => {
      setComment("");
      setCommentError(null);
      queryClient.invalidateQueries({ queryKey: ["place_requests"] });
      queryClient.invalidateQueries({ queryKey: ["markers"] });
      queryClient.invalidateQueries({ queryKey: ["pub_list"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectRequest,
    onSuccess: () => {
      setComment("");
      setCommentError(null);
      queryClient.invalidateQueries({ queryKey: ["place_requests"] });
    },
  });

  const sorted = sortNewest
    ? [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [...requests].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const filtered =
    filter === "all" ? sorted
    : filter === "needs_info" ? sorted.filter((r) => r.status === "rejected")
    : sorted.filter((r) => r.amenity === filter);

  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;
  const selectedIdx = selected ? requests.findIndex((r) => r.id === selected.id) : 0;
  const isBusy =
    (approveMutation.isPending && approveMutation.variables === selected?.id) ||
    (rejectMutation.isPending && rejectMutation.variables === selected?.id);

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: requests.length },
    { key: "pub", label: "Pubs", count: requests.filter((r) => r.amenity === "pub").length },
    { key: "biergarten", label: "Biergartens", count: requests.filter((r) => r.amenity === "biergarten").length },
    { key: "needs_info", label: "Needs info", count: 0 },
  ];

  function selectItem(id: string) {
    setSelectedId(id);
    setMobileView("detail");
    setComment("");
    setCommentError(null);
  }

  function handleReject() {
    if (!selected) return;
    const result = ReviewActionSchema.safeParse({ action: "reject", id: selected.id, comment });
    if (!result.success) {
      setCommentError(result.error.issues[0]?.message ?? "Invalid");
      return;
    }
    setCommentError(null);
    rejectMutation.mutate({ id: selected.id, comment });
  }

  const listPanel = (
    <div className="flex flex-col overflow-hidden h-full">
      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">No requests.</div>
        ) : (
          filtered.map((req) => {
            const isSelected = selected?.id === req.id;
            const idx = requests.findIndex((r) => r.id === req.id);
            return (
              <button
                key={req.id}
                onClick={() => selectItem(req.id)}
                className={`w-full text-left px-4 py-3.5 flex items-start gap-3 border-l-2 transition-colors ${
                  isSelected ? "border-l-primary bg-card" : "border-l-transparent hover:bg-card/50"
                } border-b border-border`}
              >
                <AmenityIcon amenity={req.amenity} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{req.name}</span>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs text-muted-foreground/70 truncate">{req.address ?? "No address"}</span>
                    <span className="text-xs text-muted-foreground/50 shrink-0">{reqRef(idx)}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const detailPanel = selected ? (
    <div className="overflow-y-auto h-full">
      {/* Back button — mobile only */}
      <button
        onClick={() => setMobileView("list")}
        className="md:hidden flex items-center gap-2 px-5 pt-5 pb-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <LuArrowLeft size={15} /> Back
      </button>
      <div className="px-6 py-5">
        <p className="text-xs font-mono text-primary mb-1">{reqRef(selectedIdx)}</p>
        <h2 className="text-3xl font-bold text-foreground mb-3">{selected.name}</h2>
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <AmenityChip amenity={selected.amenity} />
          <StatusBadge status={selected.status} />
          {selected.address && <span className="text-sm text-muted-foreground">{selected.address}</span>}
        </div>
        {/* Map */}
        <div className="w-full h-44 rounded-xl overflow-hidden mb-5 relative border border-border">
          <RequestMiniMap lat={selected.lat} lon={selected.lon} amenity={selected.amenity} />
          <span className="absolute bottom-3 left-3 text-xs text-white/60 font-mono bg-black/40 px-1.5 py-0.5 rounded pointer-events-none">
            {selected.lat.toFixed(6)}, {selected.lon.toFixed(6)}
          </span>
        </div>
        {/* Coords */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-1.5">Latitude</p>
            <p className="text-base font-mono text-foreground">{selected.lat.toFixed(6)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-1.5">Longitude</p>
            <p className="text-base font-mono text-foreground">{selected.lon.toFixed(6)}</p>
          </div>
        </div>
        {/* Submitted */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-1.5">Submitted by</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                {selected.requester_name?.slice(0, 1).toUpperCase() ?? selected.requester_email?.slice(0, 1).toUpperCase() ?? "?"}
              </div>
              <div>
                {selected.requester_name && (
                  <p className="text-sm font-medium text-foreground leading-tight">{selected.requester_name}</p>
                )}
                <p className="text-xs text-muted-foreground/70">{selected.requester_email ?? selected.requested_by?.slice(0, 8) ?? "Unknown"}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-1.5">Submitted</p>
            <p className="text-sm text-foreground/90">{new Date(selected.created_at).toLocaleString()}</p>
          </div>
        </div>
        {selected.description && (
          <div className="mb-5">
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-1.5">Note</p>
            <p className="text-sm text-foreground/90">{selected.description}</p>
          </div>
        )}
        {selected.opening_hours && (
          <div className="mb-6">
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-3">Opening Hours</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {(Object.entries(selected.opening_hours) as [string, { open: string; close: string | null } | null][]).map(([day, hours]) => (
                <div key={day} className="flex gap-3">
                  <span className="text-muted-foreground/60 w-8 shrink-0">{DAY_LABELS[day]}</span>
                  <span className="text-foreground/90">{hours ? `${hours.open}${hours.close ? ` – ${hours.close}` : ""}` : "Closed"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {selected.status === "pending" && (
          <div className="pt-4 border-t border-border space-y-3">
            <div>
              <label className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-1.5 block">
                Admin comment <span className="normal-case text-muted-foreground/40">(required to reject)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => { setComment(e.target.value); if (commentError) setCommentError(null); }}
                placeholder="Explain the decision to the user…"
                rows={3}
                className={`w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 transition-colors ${
                  commentError ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-primary"
                }`}
              />
              {commentError && <p className="text-xs text-red-500 mt-1">{commentError}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => approveMutation.mutate(selected.id)}
                disabled={isBusy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600/90 hover:bg-green-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <LuCheck size={15} />
                {approveMutation.isPending && approveMutation.variables === selected.id ? "Approving…" : "Approve"}
              </button>
              <button
                onClick={handleReject}
                disabled={isBusy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:bg-card text-foreground text-sm font-medium transition-colors disabled:opacity-50"
              >
                <LuX size={15} />
                {rejectMutation.isPending && rejectMutation.variables?.id === selected.id ? "Rejecting…" : "Reject"}
              </button>
              <button
                disabled={isBusy}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Request more info
              </button>
            </div>
          </div>
        )}
        {((approveMutation.isError && approveMutation.variables === selected.id) ||
          (rejectMutation.isError && rejectMutation.variables === selected.id)) && (
          <p className="text-sm text-red-500 mt-3">Action failed. Please try again.</p>
        )}
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      Select a request to review.
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Full-width filter bar */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <div className="flex gap-1.5 flex-wrap flex-1">
          {filterTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filter === t.key
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label} {t.count}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortNewest((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1 rounded-full transition-colors shrink-0"
        >
          <LuArrowUpDown size={11} />
          Sort: {sortNewest ? "Newest" : "Oldest"}
        </button>
      </div>
      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* List — full width on mobile, flex-1 on md+ */}
        <div className={`${mobileView === "detail" ? "hidden" : "flex"} md:flex w-full md:flex-1 shrink-0 md:border-r border-border flex-col overflow-hidden`}>
          {listPanel}
        </div>
        {/* Detail — full width on mobile, flex-1 on md+ */}
        <div className={`${mobileView === "list" ? "hidden" : "flex"} md:flex md:flex-1 flex-col overflow-hidden`}>
          {detailPanel}
        </div>
      </div>
    </div>
  );
}
