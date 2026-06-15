"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ReviewActionSchema, type PlaceRequest } from "@/features/requests/schemas";
import { QUERY_KEYS } from "@/lib/query-keys";
import { usePlaceRequests } from "@/features/admin/api/get-place-requests";
import { useApprovePlaceRequest, useRejectPlaceRequest, useRequestMoreInfoPlaceRequest } from "@/features/admin/api/review-place-request";
import dynamic from "next/dynamic";
import { LuCheck, LuX, LuArrowLeft, LuArrowUpDown, LuInfo } from "react-icons/lu";
import { PlaceTypeIcon, PLACE_TYPE_LABELS } from "@/features/places/place-type";

const RequestMiniMap = dynamic(
  () => import("./request-mini-map").then((m) => m.RequestMiniMap),
  { ssr: false },
);

const DAY_LABELS: Record<string, string> = {
  mo: "Mon", tu: "Tue", we: "Wed", th: "Thu", fr: "Fri", sa: "Sat", su: "Sun",
};

type FilterTab = "all" | "pending" | "approved" | "rejected" | "needs_info";

function reqRef(idx: number) {
  return `REQ-${2041 - idx}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending")
    return <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />pending</span>;
  if (status === "approved")
    return <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />approved</span>;
  if (status === "need_more_info")
    return <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />needs info</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />rejected</span>;
}

function PlaceTypeChip({ placeType }: { placeType: string }) {
  const label = PLACE_TYPE_LABELS[placeType] ?? placeType;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-card border border-border text-foreground">
      <PlaceTypeIcon placeType={placeType} size={12} />
      {label}
    </span>
  );
}


export function PlaceRequestsPane() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [sortNewest, setSortNewest] = useState(true);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [modal, setModal] = useState<"reject" | "need_more_info" | null>(null);
  const [modalMessage, setModalMessage] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const { data: requests } = usePlaceRequests();

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel("admin:place_requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests", filter: "type=eq.place_request" },
        () => {
          clearTimeout(debounce);
          debounce = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLACE_REQUESTS });
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

  const approveMutation = useApprovePlaceRequest();
  const rejectMutation = useRejectPlaceRequest();
  const needMoreInfoMutation = useRequestMoreInfoPlaceRequest();

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

  const sorted = sortNewest
    ? [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [...requests].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const filtered =
    filter === "all" ? sorted
    : filter === "pending" ? sorted.filter((r) => r.status === "pending")
    : filter === "approved" ? sorted.filter((r) => r.status === "approved")
    : filter === "rejected" ? sorted.filter((r) => r.status === "rejected")
    : sorted.filter((r) => r.status === "need_more_info");

  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;
  const selectedIdx = selected ? requests.findIndex((r) => r.id === selected.id) : 0;
  const isBusy =
    (approveMutation.isPending && approveMutation.variables === selected?.id) ||
    (rejectMutation.isPending && rejectMutation.variables?.id === selected?.id) ||
    (needMoreInfoMutation.isPending && needMoreInfoMutation.variables?.id === selected?.id);

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: t("filterAll"), count: requests.length },
    { key: "pending", label: t("filterPending"), count: requests.filter((r) => r.status === "pending").length },
    { key: "approved", label: t("filterApproved"), count: requests.filter((r) => r.status === "approved").length },
    { key: "rejected", label: t("filterRejected"), count: requests.filter((r) => r.status === "rejected").length },
    { key: "needs_info", label: t("filterNeedsInfo"), count: requests.filter((r) => r.status === "need_more_info").length },
  ];

  function selectItem(id: string) {
    setSelectedId(id);
    setMobileView("detail");
    closeModal();
  }

  const listPanel = (
    <div className="flex flex-col overflow-hidden h-full">
      {/* List */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">{t("noRequests")}</div>
        ) : (
          <div className="flex flex-col gap-1 p-3">
            {filtered.map((req) => {
              const isSelected = selected?.id === req.id;
              const idx = requests.findIndex((r) => r.id === req.id);
              return (
                <button
                  key={req.id}
                  onClick={() => selectItem(req.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors text-left w-full ${
                    isSelected ? "bg-card ring-1 ring-primary/30" : "hover:bg-card/60"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                    <PlaceTypeIcon placeType={req.place_type} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{req.name}</p>
                    <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{req.address ?? "No address"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={req.status} />
                    <span className="text-[10px] text-muted-foreground/40 font-mono hidden sm:inline">{reqRef(idx)}</span>
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
      {/* Back button — mobile only */}
      <button
        onClick={() => setMobileView("list")}
        className="md:hidden flex items-center gap-2 px-5 pt-5 pb-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <LuArrowLeft size={15} /> {tCommon("back")}
      </button>
      <div className="px-6 py-5">
        <p className="text-xs font-mono text-primary mb-1">{reqRef(selectedIdx)}</p>
        <h2 className="pub-name text-3xl font-bold text-foreground mb-3">{selected.name}</h2>
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <PlaceTypeChip placeType={selected.place_type} />
          <StatusBadge status={selected.status} />
          {selected.address && <span className="text-sm text-muted-foreground">{selected.address}</span>}
        </div>
        {/* Map */}
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
        {/* Coords */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-1.5">{t("latLabel")}</p>
            <p className="text-base font-mono text-foreground">{selected.lat.toFixed(6)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-1.5">{t("lonLabel")}</p>
            <p className="text-base font-mono text-foreground">{selected.lon.toFixed(6)}</p>
          </div>
        </div>
        {/* Submitted */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-1.5">{t("submittedBy")}</p>
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
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-1.5">{t("submittedLabel")}</p>
            <p className="text-sm text-foreground/90">{new Date(selected.created_at).toLocaleString()}</p>
          </div>
        </div>
        {selected.description && (
          <div className="mb-5">
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest mb-1.5">{t("noteLabel")}</p>
            <p className="text-sm text-foreground/90">{selected.description}</p>
          </div>
        )}
        {selected.opening_hours && (
          <div className="mb-6">
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
      {t("selectRequest")}
    </div>
  );

  const isModalBusy =
    (modal === "reject" && rejectMutation.isPending) ||
    (modal === "need_more_info" && needMoreInfoMutation.isPending);

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
          {sortNewest ? t("sortNewest") : t("sortOldest")}
        </button>
      </div>
      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* List — full width on mobile, flex-1 on md+ */}
        <div className={`${mobileView === "detail" ? "hidden" : "flex"} md:flex w-full md:flex-1 shrink-0 md:border-r border-border flex-col overflow-hidden`}>
          {listPanel}
        </div>
        {/* Detail — full width on mobile, flex-1 on md+ */}
        <div className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden`}>
          {detailPanel}
        </div>
      </div>

      {mapModalOpen && selected && (
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
                {modal === "reject" ? t("rejectRequest") : t("requestMoreInfo")}
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
                  : modal === "reject" ? t("rejectRequest") : t("sendRequest")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
