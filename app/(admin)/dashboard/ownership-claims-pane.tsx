"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approveRequest, rejectRequest } from "@/app/actions/review-request";
import { supabase } from "@/lib/supabase";
import { LocationRequestSchema, ReviewActionSchema, type OwnerClaim } from "@/lib/schemas";
import { LuShield, LuX, LuArrowLeft } from "react-icons/lu";

async function fetchOwnerClaims(): Promise<OwnerClaim[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("type", "owner_claim")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => LocationRequestSchema.parse(row) as OwnerClaim);
}

function claimRef(idx: number) {
  return `CLM-${idx + 1}`;
}

function requesterInitials(claim: OwnerClaim) {
  const name = claim.requester_name ?? claim.requester_email;
  if (!name) return "?";
  const parts = name.split(/[\s@._-]/);
  if (parts.length >= 2 && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}


function StatusBadge({ status }: { status: string }) {
  if (status === "pending")
    return <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />pending</span>;
  if (status === "approved")
    return <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />approved</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />{status}</span>;
}

export function OwnershipClaimsPane() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["owner_claims"],
    queryFn: fetchOwnerClaims,
  });

  const approveMutation = useMutation({
    mutationFn: approveRequest,
    onSuccess: () => {
      setComment("");
      setCommentError(null);
      queryClient.invalidateQueries({ queryKey: ["owner_claims"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectRequest,
    onSuccess: () => {
      setComment("");
      setCommentError(null);
      queryClient.invalidateQueries({ queryKey: ["owner_claims"] });
    },
  });

  const selected = claims.find((c) => c.id === selectedId) ?? claims[0] ?? null;
  const selectedIdx = selected ? claims.findIndex((c) => c.id === selected.id) : 0;
  const isBusy =
    (approveMutation.isPending && approveMutation.variables === selected?.id) ||
    (rejectMutation.isPending && rejectMutation.variables?.id === selected?.id);

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
      <div className="px-5 pt-6 pb-4 shrink-0">
        <h1 className="text-lg font-semibold text-foreground">Ownership Claims</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Verify business ownership</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading…</div>
        ) : claims.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">No claims.</div>
        ) : (
          claims.map((claim, i) => {
            const isSelected = selected?.id === claim.id;
            return (
              <button
                key={claim.id}
                onClick={() => selectItem(claim.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 border-l-2 transition-colors ${
                  isSelected ? "border-l-primary bg-card" : "border-l-transparent hover:bg-card/50"
                } border-b border-border`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                  {requesterInitials(claim)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {claim.name ?? `Claim #${claim.marker_id.slice(0, 8)}`}
                    </span>
                    <StatusBadge status={claim.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground truncate">
                      {claim.requester_email ?? claim.requester_name ?? claim.requested_by?.slice(0, 12) ?? "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">{claimRef(i)}</span>
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
      <button
        onClick={() => setMobileView("list")}
        className="md:hidden flex items-center gap-2 px-5 pt-5 pb-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <LuArrowLeft size={15} /> Back
      </button>
      <div className="px-5 md:px-8 py-4 md:py-6 max-w-2xl">
        <p className="text-xs font-mono text-primary mb-1">{claimRef(selectedIdx)}</p>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          {selected.name ?? `Marker ${selected.marker_id.slice(0, 8)}`}
        </h2>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-card border border-border text-foreground">
            {selected.amenity ?? "Place"}
          </span>
          <StatusBadge status={selected.status} />
        </div>
        <div className="mb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Claimant</p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              {requesterInitials(selected)}
            </div>
            <div>
              {selected.requester_name && (
                <p className="text-sm font-medium text-foreground">{selected.requester_name}</p>
              )}
              <p className="text-xs text-muted-foreground">{selected.requester_email ?? selected.requested_by?.slice(0, 16) ?? "Unknown"}</p>
            </div>
          </div>
        </div>
        <div className="mb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Submitted</p>
          <p className="text-sm text-foreground">{new Date(selected.created_at).toLocaleString()}</p>
        </div>
        {selected.description && (
          <div className="mb-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Intent</p>
            <p className="text-sm text-foreground">{selected.description}</p>
          </div>
        )}
        <div className="mb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Place ID</p>
          <p className="text-xs font-mono text-foreground break-all">{selected.marker_id}</p>
        </div>
        {selected.status === "pending" && (
          <div className="pt-4 border-t border-border space-y-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Admin comment <span className="text-muted-foreground normal-case">(required to reject)</span>
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
                <LuShield size={15} />
                {approveMutation.isPending && approveMutation.variables === selected.id ? "Granting…" : "Grant ownership"}
              </button>
              <button
                onClick={handleReject}
                disabled={isBusy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:bg-card text-foreground text-sm font-medium transition-colors disabled:opacity-50"
              >
                <LuX size={15} />
                {rejectMutation.isPending && rejectMutation.variables?.id === selected.id ? "Rejecting…" : "Reject claim"}
              </button>
            </div>
          </div>
        )}
        {((approveMutation.isError && approveMutation.variables === selected.id) ||
          (rejectMutation.isError && rejectMutation.variables?.id === selected.id)) && (
          <p className="text-sm text-red-500 mt-3">Action failed. Please try again.</p>
        )}
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      Select a claim to review.
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      <div className={`${mobileView === "detail" ? "hidden" : "flex"} md:flex w-full md:w-[340px] shrink-0 md:border-r border-border flex-col overflow-hidden`}>
        {listPanel}
      </div>
      <div className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden`}>
        {detailPanel}
      </div>
    </div>
  );
}
