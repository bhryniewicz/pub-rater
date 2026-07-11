"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ReviewActionSchema, type OwnerClaim } from "@/features/requests/schemas";
import { QUERY_KEYS } from "@/lib/query";
import { useOwnerClaims } from "@/features/admin/api/get-owner-claims";
import { useApproveOwnerClaim, useRejectOwnerClaim, useRequestMoreInfoOwnerClaim } from "@/features/admin/api/review-owner-claim";
import { LuCheck, LuX, LuArrowLeft, LuInfo } from "react-icons/lu";
import dynamic from "next/dynamic";

const RequestMiniMap = dynamic(
  () => import("./request-mini-map").then((m) => m.RequestMiniMap),
  { ssr: false },
);

const DAY_LABELS: Record<string, string> = {
  mo: "Mon", tu: "Tue", we: "Wed", th: "Thu", fr: "Fri", sa: "Sat", su: "Sun",
};

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
  if (status === "need_more_info")
    return <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />needs info</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />{status}</span>;
}

export function OwnershipClaimsPane() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [modal, setModal] = useState<"reject" | "need_more_info" | null>(null);
  const [modalMessage, setModalMessage] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const { data: claims } = useOwnerClaims();

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel("admin:owner_claims")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests", filter: "type=eq.owner_claim" },
        () => {
          clearTimeout(debounce);
          debounce = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OWNER_CLAIMS });
          }, 300);
        }
      )
      .subscribe();
    return () => {
      clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    if (!mapModalOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMapModalOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapModalOpen]);

  const approveMutation = useApproveOwnerClaim();
  const rejectMutation = useRejectOwnerClaim();
  const needMoreInfoMutation = useRequestMoreInfoOwnerClaim();

  function openModal(type: "reject" | "need_more_info") {
    setModal(type);
    setModalMessage("");
    setModalError(null);
  }

  function closeModal() {
    setModal(null);
    setModalMessage("");
    setModalError(null);
  }

  function handleModalSubmit() {
    if (!selected || !modal) return;
    const result = ReviewActionSchema.safeParse({ action: modal, id: selected.id, comment: modalMessage });
    if (!result.success) {
      setModalError(result.error.issues[0]?.message ?? "Invalid");
      return;
    }
    setModalError(null);
    if (modal === "reject") rejectMutation.mutate({ id: selected.id, comment: modalMessage }, { onSuccess: closeModal });
    else needMoreInfoMutation.mutate({ id: selected.id, comment: modalMessage }, { onSuccess: closeModal });
  }

  const selected = claims.find((c) => c.id === selectedId) ?? claims[0] ?? null;
  const selectedIdx = selected ? claims.findIndex((c) => c.id === selected.id) : 0;
  const isBusy =
    (approveMutation.isPending && approveMutation.variables === selected?.id) ||
    (rejectMutation.isPending && rejectMutation.variables?.id === selected?.id) ||
    (needMoreInfoMutation.isPending && needMoreInfoMutation.variables?.id === selected?.id);

  function selectItem(id: string) {
    setSelectedId(id);
    setMobileView("detail");
    closeModal();
  }

  const listPanel = (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="px-5 pt-6 pb-4 shrink-0">
        <h1 className="text-lg font-semibold text-foreground">{t("ownershipClaimsNav")}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{t("verifyOwnership")}</p>
      </div>
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {claims.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">{t("noClaims")}</div>
        ) : (
          <div className="flex flex-col gap-1 p-3">
            {claims.map((claim, i) => {
              const isSelected = selected?.id === claim.id;
              return (
                <button
                  key={claim.id}
                  onClick={() => selectItem(claim.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors text-left w-full ${
                    isSelected ? "bg-card ring-1 ring-primary/30" : "hover:bg-card/60"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
                    {requesterInitials(claim)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {claim.name ?? `Claim #${claim.marker_id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-muted-foreground/60 truncate mt-0.5">
                      {claim.requester_email ?? claim.requester_name ?? claim.requested_by?.slice(0, 12) ?? "Unknown"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={claim.status} />
                    <span className="text-[10px] text-muted-foreground/40 font-mono hidden sm:inline">{claimRef(i)}</span>
                  </div>
                </button>
              );
            })}
          </div>
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
        <LuArrowLeft size={15} /> {tCommon("back")}
      </button>
      <div className="px-5 md:px-8 py-4 md:py-6 max-w-2xl">
        <p className="text-xs font-mono text-primary mb-1">{claimRef(selectedIdx)}</p>
        <h2 className="pub-name text-2xl font-bold text-foreground mb-3">
          {selected.name ?? `Marker ${selected.marker_id.slice(0, 8)}`}
        </h2>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-card border border-border text-foreground">
            {selected.place_type ?? "Place"}
          </span>
          <StatusBadge status={selected.status} />
        </div>
        <div className="mb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{t("claimRef")}</p>
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
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("submittedLabel")}</p>
          <p className="text-sm text-foreground">{new Date(selected.created_at).toLocaleString()}</p>
        </div>
        {selected.description && (
          <div className="mb-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("intentLabel")}</p>
            <p className="text-sm text-foreground">{selected.description}</p>
          </div>
        )}
        {selected.lat != null && selected.lon != null && (
          <div
            className="w-full h-44 rounded-xl overflow-hidden mb-5 relative border border-border cursor-pointer group"
            onClick={() => setMapModalOpen(true)}
            title="Click to enlarge map"
          >
            <RequestMiniMap lat={selected.lat} lon={selected.lon} />
            <span className="absolute bottom-3 left-3 text-xs text-white/60 font-mono bg-black/40 px-1.5 py-0.5 rounded pointer-events-none">
              {selected.lat.toFixed(6)}, {selected.lon.toFixed(6)}
            </span>
            <span className="absolute top-2 right-2 text-[10px] text-white/70 bg-black/40 px-1.5 py-0.5 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              Click to expand
            </span>
          </div>
        )}
        {(selected.address || (selected.lat != null && selected.lon != null)) && (
          <div className="grid grid-cols-2 gap-4 mb-5">
            {selected.address && (
              <div>
                <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-1.5">{t("addressLabel")}</p>
                <p className="text-sm text-foreground/90">{selected.address}</p>
              </div>
            )}
            {selected.lat != null && selected.lon != null && (
              <div>
                <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-1.5">{t("coordinatesLabel")}</p>
                <p className="text-sm font-mono text-foreground/90">{selected.lat.toFixed(6)}, {selected.lon.toFixed(6)}</p>
              </div>
            )}
          </div>
        )}
        {selected.opening_hours && (
          <div className="mb-5">
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-3">{t("openingHoursLabel")}</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {(Object.entries(selected.opening_hours) as [string, { open: string; close: string | null } | null][]).map(([day, hours]) => (
                <div key={day} className="flex gap-3">
                  <span className="text-muted-foreground/60 w-8 shrink-0">{DAY_LABELS[day]}</span>
                  <span className="text-foreground/90">{hours ? `${hours.open}${hours.close ? ` – ${hours.close}` : ""}` : tCommon("closed")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mb-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("placeIdLabel")}</p>
          <p className="text-xs font-mono text-foreground break-all">{selected.marker_id}</p>
        </div>
        {selected.admin_comment && selected.status === "need_more_info" && (
          <div className="mb-5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-[11px] text-blue-400 uppercase tracking-widest mb-1">{t("messageToUser")}</p>
            <p className="text-sm text-foreground/90">{selected.admin_comment}</p>
          </div>
        )}
        {(selected.status === "pending" || selected.status === "need_more_info") && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => approveMutation.mutate(selected.id)}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm font-medium transition-colors disabled:opacity-50 border border-green-600/30"
              >
                <LuCheck size={14} />
                {approveMutation.isPending && approveMutation.variables === selected.id ? tCommon("approving") : tCommon("approve")}
              </button>
              <button
                onClick={() => openModal("reject")}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors disabled:opacity-50 border border-red-500/30"
              >
                <LuX size={14} />
                {tCommon("reject")}
              </button>
              <button
                onClick={() => openModal("need_more_info")}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground text-sm font-medium transition-colors disabled:opacity-50"
              >
                <LuInfo size={14} />
                {t("requestMoreInfo")}
              </button>
            </div>
          </div>
        )}
        {((approveMutation.isError && approveMutation.variables === selected.id) ||
          (rejectMutation.isError && rejectMutation.variables?.id === selected.id)) && (
          <p className="text-sm text-red-500 mt-3">{t("actionFailed")}</p>
        )}
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      {t("selectClaim")}
    </div>
  );

  const isModalBusy =
    (modal === "reject" && rejectMutation.isPending) ||
    (modal === "need_more_info" && needMoreInfoMutation.isPending);

  return (
    <div className="flex h-full overflow-hidden">
      <div className={`${mobileView === "detail" ? "hidden" : "flex"} md:flex w-full md:flex-1 shrink-0 md:border-r border-border flex-col overflow-hidden`}>
        {listPanel}
      </div>
      <div className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden`}>
        {detailPanel}
      </div>

      {mapModalOpen && selected && selected.lat != null && selected.lon != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setMapModalOpen(false)}
        >
          <div
            className="relative bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
            style={{ width: "min(90vw, 800px)", height: "min(80vh, 600px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMapModalOpen(false)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-background/80 border border-border text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm"
            >
              <LuX size={16} />
            </button>
            <span className="absolute bottom-3 left-3 z-10 text-xs text-white/70 font-mono bg-black/50 px-2 py-1 rounded pointer-events-none">
              {selected.lat.toFixed(6)}, {selected.lon.toFixed(6)}
            </span>
            <RequestMiniMap lat={selected.lat} lon={selected.lon} interactive />
          </div>
        </div>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div ref={modalRef} className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                {modal === "reject" ? t("rejectClaim") : t("requestMoreInfo")}
              </h3>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <LuX size={16} />
              </button>
            </div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
              {modal === "reject" ? t("rejectReason") : t("whatInfo")}
              <span className="normal-case ml-1 text-muted-foreground/60">{tCommon("required")}</span>
            </label>
            <textarea
              autoFocus
              value={modalMessage}
              onChange={(e) => { setModalMessage(e.target.value); if (modalError) setModalError(null); }}
              placeholder={
                modal === "reject"
                  ? t("rejectPlaceholder")
                  : t("infoPlaceholder")
              }
              rows={4}
              className={`w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 transition-colors ${
                modalError ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-primary"
              }`}
            />
            {modalError && <p className="text-xs text-red-500 mt-1">{modalError}</p>}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={isModalBusy}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  modal === "reject"
                    ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                    : "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                }`}
              >
                {isModalBusy
                  ? modal === "reject" ? tCommon("rejecting") : tCommon("sending")
                  : modal === "reject" ? t("rejectClaim") : t("sendRequest")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
