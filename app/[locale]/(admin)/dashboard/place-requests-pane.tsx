"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approveRequest, rejectRequest, requestMoreInfo } from "@/app/actions/review-request";
import { supabase } from "@/lib/supabase";
import { LocationRequestSchema, ReviewActionSchema, type PlaceRequest } from "@/lib/schemas";
import dynamic from "next/dynamic";
import { LuCheck, LuX, LuArrowLeft, LuArrowUpDown, LuInfo } from "react-icons/lu";

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
  if (status === "need_more_info")
    return <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />needs info</span>;
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
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [sortNewest, setSortNewest] = useState(true);
  const [modal, setModal] = useState<"reject" | "need_more_info" | null>(null);
  const [modalMessage, setModalMessage] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["place_requests"],
    queryFn: fetchPlaceRequests,
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin:place_requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests", filter: "type=eq.place_request" },
        () => { queryClient.invalidateQueries({ queryKey: ["place_requests"] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const approveMutation = useMutation({
    mutationFn: approveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["place_requests"] });
      queryClient.invalidateQueries({ queryKey: ["markers"] });
      queryClient.invalidateQueries({ queryKey: ["pub_list"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectRequest,
    onSuccess: () => {
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["place_requests"] });
    },
  });

  const needMoreInfoMutation = useMutation({
    mutationFn: requestMoreInfo,
    onSuccess: () => {
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["place_requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin_counts"] });
    },
  });

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
    if (modal === "reject") rejectMutation.mutate({ id: selected.id, comment: modalMessage });
    else needMoreInfoMutation.mutate({ id: selected.id, comment: modalMessage });
  }

  const sorted = sortNewest
    ? [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [...requests].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const filtered =
    filter === "all" ? sorted
    : filter === "needs_info" ? sorted.filter((r) => r.status === "need_more_info")
    : sorted.filter((r) => r.amenity === filter);

  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;
  const selectedIdx = selected ? requests.findIndex((r) => r.id === selected.id) : 0;
  const isBusy =
    (approveMutation.isPending && approveMutation.variables === selected?.id) ||
    (rejectMutation.isPending && rejectMutation.variables?.id === selected?.id) ||
    (needMoreInfoMutation.isPending && needMoreInfoMutation.variables?.id === selected?.id);

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: t("filterAll"), count: requests.length },
    { key: "pub", label: t("filterPubs"), count: requests.filter((r) => r.amenity === "pub").length },
    { key: "biergarten", label: t("filterBiergartens"), count: requests.filter((r) => r.amenity === "biergarten").length },
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
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">{tCommon("loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">{t("noRequests")}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-3">
            {filtered.map((req) => {
              const isSelected = selected?.id === req.id;
              const idx = requests.findIndex((r) => r.id === req.id);
              const icon = AMENITY_LABELS[req.amenity]?.icon ?? "📍";
              return (
                <button
                  key={req.id}
                  onClick={() => selectItem(req.id)}
                  className={`flex flex-col items-center text-center p-4 rounded-xl border transition-colors gap-2 ${
                    isSelected ? "border-primary bg-card ring-1 ring-primary/30" : "border-border hover:bg-card/60"
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center text-3xl shrink-0">
                    {icon}
                  </div>
                  <div className="w-full min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{req.name}</p>
                    <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{req.address ?? "No address"}</p>
                  </div>
                  <StatusBadge status={req.status} />
                  <span className="text-[10px] text-muted-foreground/40 font-mono">{reqRef(idx)}</span>
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
          <AmenityChip amenity={selected.amenity} />
          <StatusBadge status={selected.status} />
          {selected.address && <span className="text-sm text-muted-foreground">{selected.address}</span>}
        </div>
        {/* Map */}
        <div className="w-full h-44 rounded-xl overflow-hidden mb-5 relative border border-border">
          <RequestMiniMap lat={selected.lat} lon={selected.lon} />
          <span className="absolute bottom-3 left-3 text-xs text-white/60 font-mono bg-black/40 px-1.5 py-0.5 rounded pointer-events-none">
            {selected.lat.toFixed(6)}, {selected.lon.toFixed(6)}
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
