"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LocationRequestSchema } from "@/lib/schemas";
import { PlaceRequestsPane } from "./place-requests-pane";
import { OwnershipClaimsPane } from "./ownership-claims-pane";
import {
  LuLayoutDashboard,
  LuMapPin,
  LuShield,
  LuMessageSquare,
  LuUsers,
  LuList,
  LuBell,
  LuSearch,
  LuPlus,
  LuX,
  LuMenu,
  LuArrowLeft,
} from "react-icons/lu";

type Section =
  | "overview"
  | "place_requests"
  | "ownership_claims"
  | "comments"
  | "users";

async function fetchCounts() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [pendingRes, todayRes, weekRes, totalOwnerClaimsRes] =
    await Promise.all([
      supabase.from("requests").select("type, status").eq("status", "pending"),
      supabase
        .from("requests")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString()),
      supabase.rpc("count_new_users_by_week"),
      supabase
        .from("requests")
        .select("id", { count: "exact", head: true })
        .eq("type", "owner_claim"),
    ]);

  if (pendingRes.error) throw pendingRes.error;
  if (todayRes.error) throw todayRes.error;
  if (weekRes.error) throw weekRes.error;
  if (totalOwnerClaimsRes.error) throw totalOwnerClaimsRes.error;

  const rows = pendingRes.data ?? [];
  const weekData = weekRes.data?.[0] ?? { this_week: 0, last_week: 0 };
  const thisWeek = Number(weekData.this_week);
  const lastWeek = Number(weekData.last_week);
  const weekDelta = thisWeek - lastWeek;

  return {
    placeRequests: rows.filter((r) => r.type === "place_request").length,
    ownerClaims: rows.filter((r) => r.type === "owner_claim").length,
    totalOwnerClaims: totalOwnerClaimsRes.count ?? 0,
    todayRequests: todayRes.count ?? 0,
    newUsersThisWeek: thisWeek,
    newUsersWeekDelta: weekDelta,
  };
}

async function fetchAllRequests() {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []).map((row) => LocationRequestSchema.parse(row));
}

// ── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  icon,
  label,
  badge,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
        active
          ? "bg-primary/15 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-card"
      }`}
    >
      <span className={active ? "text-primary" : ""}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium min-w-[20px] text-center">
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewSection({
  placeRequestCount,
  ownerClaimCount,
  totalOwnerClaims,
  todayRequestCount,
  newUsersThisWeek,
  newUsersWeekDelta,
  recentRequests,
}: {
  placeRequestCount: number;
  ownerClaimCount: number;
  totalOwnerClaims: number;
  todayRequestCount: number;
  newUsersThisWeek: number;
  newUsersWeekDelta: number;
  recentRequests: ReturnType<typeof LocationRequestSchema.parse>[];
}) {
  const AMENITY_LABELS: Record<string, { label: string; icon: string }> = {
    pub: { label: "Pub", icon: "🍺" },
    bar: { label: "Bar", icon: "🥂" },
    restaurant: { label: "Restaurant", icon: "🍽️" },
    cafe: { label: "Cafe", icon: "☕" },
    nightclub: { label: "Nightclub", icon: "🎶" },
    biergarten: { label: "Biergarten", icon: "🌻" },
  };

  const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    approved: "bg-green-500/15 text-green-400 border border-green-500/20",
    rejected: "bg-red-500/15 text-red-400 border border-red-500/20",
  };

  const bars = [
    { day: "Mon", h: 35 },
    { day: "Tue", h: 55 },
    { day: "Wed", h: 20 },
    { day: "Thu", h: 70 },
    { day: "Fri", h: 65 },
    { day: "Sat", h: 90 },
    { day: "Sun", h: 40 },
  ];
  const maxH = Math.max(...bars.map((b) => b.h));

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
      <h1 className="text-lg font-semibold text-foreground">Overview</h1>
      <p className="text-xs text-muted-foreground mt-0.5 mb-6">
        Console health &amp; pending work
      </p>

      {/* KPI cards — 1 col mobile, 2 col sm, 4 col xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Pending requests",
            value: placeRequestCount,
            sub: `+${todayRequestCount} today`,
            icon: <LuMapPin size={14} />,
            iconColor: "text-primary",
            subColor: "text-green-400",
          },
          {
            label: "Ownership claims",
            value: totalOwnerClaims,
            sub: `${ownerClaimCount} awaiting`,
            icon: <LuShield size={14} />,
            iconColor: "text-primary",
            subColor: "text-amber-400",
          },
          {
            label: "Flagged comments",
            value: 12,
            sub: "+5",
            icon: <LuMessageSquare size={14} />,
            iconColor: "text-primary",
            subColor: "text-orange-400",
          },
          {
            label: "New users / wk",
            value: newUsersThisWeek,
            sub:
              newUsersWeekDelta === 0
                ? "same as last wk"
                : `${newUsersWeekDelta > 0 ? "+" : ""}${newUsersWeekDelta} vs last wk`,
            icon: <LuUsers size={14} />,
            iconColor: "text-primary",
            subColor:
              newUsersWeekDelta > 0
                ? "text-green-400"
                : newUsersWeekDelta < 0
                  ? "text-red-400"
                  : "text-muted-foreground",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-card border border-border rounded-xl px-5 py-4"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <span className={kpi.iconColor}>{kpi.icon}</span>
              {kpi.label}
            </div>
            <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
            <p className={`text-[11px] mt-1 ${kpi.subColor}`}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Pending queue + chart — stack on mobile, side by side on xl */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        {/* Pending queue */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Pending queue
            </h2>
          </div>
          {/* Scrollable horizontally on mobile so table doesn't break */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left px-5 py-2.5 font-medium">Place</th>
                  <th className="text-left px-3 py-2.5 font-medium">Type</th>
                  <th className="text-left px-3 py-2.5 font-medium">
                    Submitted
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground text-xs"
                    >
                      No pending items.
                    </td>
                  </tr>
                ) : (
                  recentRequests.map((req) => {
                    const amenity =
                      req.type === "place_request" ? (req.amenity ?? "") : "";
                    const info = AMENITY_LABELS[amenity] ?? {
                      label: amenity,
                      icon: "📍",
                    };
                    return (
                      <tr
                        key={req.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-5 py-3 font-medium text-foreground">
                          {req.type === "place_request"
                            ? req.name
                            : `Claim: ${req.marker_id.slice(0, 8)}`}
                        </td>
                        <td className="px-3 py-3">
                          {amenity && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground">
                              {info.icon} {info.label}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[req.status] ?? "bg-secondary text-muted-foreground"}`}
                          >
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Volume chart */}
        <div className="bg-card border border-border rounded-xl px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Volume · this week
          </h2>
          <div className="flex items-end gap-1.5 h-24 mb-2">
            {bars.map((b) => (
              <div
                key={b.day}
                className="flex flex-col items-center gap-1 flex-1"
              >
                <div
                  className="w-full rounded-sm bg-primary/70"
                  style={{ height: `${(b.h / maxH) * 88}px` }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {b.day}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Approval", value: "84%" },
              { label: "Avg time", value: "1.4h" },
              { label: "Places", value: "1,240" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  {s.label}
                </p>
                <p className="text-base font-bold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Comments ──────────────────────────────────────────────────────────────────

function CommentsSection() {
  const COMMENTS = [
    {
      id: "1",
      user: "promo_deals_pl",
      initials: "PD",
      preview:
        "🔥 CHEAP BEER WHOLESALE!! visit cheap-kegs-pl .biz for 50% off — DM m…",
      category: "Spam",
      reports: 7,
      on: "The Crooked Tap",
      trust: 3,
      body: "🔥 CHEAP BEER WHOLESALE!! visit cheap-kegs-pl .biz for 50% off — DM me now!!!",
      date: "5/31/2026, 1:22 AM",
    },
    {
      id: "2",
      user: "angry_drinker",
      initials: "AD",
      preview:
        "The bartender is an absolute idiot, worst human alive, hope this dump burn…",
      category: "Abuse",
      reports: 4,
      on: "Hop & Anchor",
      trust: 19,
      body: "The bartender is an absolute idiot, worst human alive, hope this dump burns down.",
      date: "5/30/2026, 11:04 PM",
    },
    {
      id: "3",
      user: "Kasia_R",
      initials: "KR",
      preview:
        "Does anyone know where I can park my bike around here? Also the tra…",
      category: "Off-Topic",
      reports: 2,
      on: "Złoty Chmiel Garden",
      trust: 65,
      body: "Does anyone know where I can park my bike around here? Also the tram stop moved.",
      date: "5/29/2026, 3:17 PM",
    },
    {
      id: "4",
      user: "anon_4417",
      initials: "?",
      preview:
        "Overrated trash, the owner clearly pays for fake reviews. Avoid this scam.",
      category: "Abuse",
      reports: 3,
      on: "Browar Stary Rynek",
      trust: 8,
      body: "Overrated trash, the owner clearly pays for fake reviews. Avoid this scam.",
      date: "5/29/2026, 9:40 AM",
    },
    {
      id: "5",
      user: "casino_winz",
      initials: "CW",
      preview:
        "Win €1000 free spins!!! best-slots-online click here 🎰 link in bio",
      category: "Spam",
      reports: 5,
      on: "Pub anywhere",
      trust: 1,
      body: "Win €1000 free spins!!! best-slots-online click here 🎰 link in bio",
      date: "5/28/2026, 8:00 PM",
    },
    {
      id: "6",
      user: "Bartek_99",
      initials: "B9",
      preview:
        "Unrelated but did the football match get cancelled tonight? Asking for a …",
      category: "Off-Topic",
      reports: 1,
      on: "Hop & Anchor",
      trust: 44,
      body: "Unrelated but did the football match get cancelled tonight? Asking for a friend.",
      date: "5/27/2026, 6:55 PM",
    },
  ];

  type CommentFilter = "all" | "spam" | "abuse" | "off-topic";
  const [filter, setFilter] = useState<CommentFilter>("all");
  const [selectedId, setSelectedId] = useState<string>("1");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const filtered =
    filter === "all"
      ? COMMENTS
      : COMMENTS.filter(
          (c) =>
            c.category.toLowerCase() === filter ||
            (c.category === "Off-Topic" && filter === "off-topic"),
        );

  const selected =
    filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null;

  const catBadge = (cat: string) => {
    if (cat === "Spam")
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
          {cat}
        </span>
      );
    if (cat === "Abuse")
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
          {cat}
        </span>
      );
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
        {cat}
      </span>
    );
  };

  const filterTabs: { key: CommentFilter; label: string }[] = [
    { key: "all", label: `All ${COMMENTS.length}` },
    {
      key: "spam",
      label: `Spam ${COMMENTS.filter((c) => c.category === "Spam").length}`,
    },
    {
      key: "abuse",
      label: `Abuse ${COMMENTS.filter((c) => c.category === "Abuse").length}`,
    },
    {
      key: "off-topic",
      label: `Off-topic ${COMMENTS.filter((c) => c.category === "Off-Topic").length}`,
    },
  ];

  function selectItem(id: string) {
    setSelectedId(id);
    setMobileView("detail");
  }

  const listPanel = (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="px-5 pt-6 pb-3 shrink-0">
        <h1 className="text-lg font-semibold text-foreground">Comments</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Reported reviews, grouped by reason
        </p>
      </div>
      <div className="px-4 pb-3 flex gap-1.5 flex-wrap shrink-0">
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
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => selectItem(c.id)}
            className={`w-full text-left px-4 py-3 flex items-start gap-3 border-l-2 transition-colors ${
              selected?.id === c.id
                ? "border-l-primary bg-card"
                : "border-l-transparent hover:bg-card/50"
            } border-b border-border`}
          >
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              {c.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {c.user}
                </span>
                {catBadge(c.category)}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {c.preview}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                🚩 {c.reports}
              </p>
            </div>
          </button>
        ))}
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
        <p className="text-xs font-mono text-primary mb-2">
          C-{9981 - parseInt(selected.id)}
        </p>
        <h2 className="text-xl font-bold text-foreground mb-3">
          Reported {selected.category.toLowerCase()} comment
        </h2>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {catBadge(selected.category)}
          <span className="text-xs text-muted-foreground">
            🚩 {selected.reports} reports
          </span>
          <span className="text-xs text-yellow-400">★★★★★</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                {selected.initials}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {selected.user}
                </p>
                <p className="text-xs text-muted-foreground">
                  on {selected.on}
                </p>
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground shrink-0">
              Trust {selected.trust}
            </span>
          </div>
          <p className="text-sm text-foreground mt-3 pl-2 border-l-2 border-primary/40">
            {selected.body}
          </p>
          <p className="text-xs text-muted-foreground mt-2">{selected.date}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Keep
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border hover:bg-card text-foreground text-sm font-medium transition-colors">
            <LuX size={14} /> Remove
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/90 hover:bg-primary text-primary-foreground text-sm font-medium transition-colors">
            Remove &amp; warn user
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      Select a comment.
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      <div
        className={`${mobileView === "detail" ? "hidden" : "flex"} md:flex w-full md:w-[340px] shrink-0 md:border-r border-border flex-col overflow-hidden`}
      >
        {listPanel}
      </div>
      <div
        className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden`}
      >
        {detailPanel}
      </div>
    </div>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────

type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  role: string;
  avatar_url: string | null;
  is_onboarded: boolean;
};

async function fetchUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("fetch_users");
  if (error) throw error;
  return (data ?? []) as AdminUser[];
}

const ROLES = ["user", "owner", "admin"] as const;
type UserRole = (typeof ROLES)[number];

function UsersSection({ currentUserId }: { currentUserId: string | null }) {
  const queryClient = useQueryClient();
  const [confirmBanId, setConfirmBanId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { error } = await supabase.rpc("set_user_role", {
        target_id: id,
        new_role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const banMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_user", { target_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmBanId(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  function initials(email: string) {
    const local = email.split("@")[0];
    const parts = local.split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return local.slice(0, 2).toUpperCase();
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
      <h1 className="text-lg font-semibold text-foreground mb-1">Users</h1>
      <p className="text-xs text-muted-foreground mb-6">
        Members, roles &amp; access
      </p>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                {["User", "Joined", "Role", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground text-xs"
                  >
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground text-xs"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isBanning =
                    banMutation.isPending && confirmBanId === u.id;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {initials(u.email)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-foreground whitespace-nowrap">
                                {u.email}
                              </p>
                              {isSelf && (
                                <span className="text-xs text-muted-foreground">
                                  (you)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {u.is_onboarded ? "Onboarded" : "Not onboarded"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString("en-GB", {
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled={isSelf || roleMutation.isPending}
                          value={u.role}
                          onChange={(e) =>
                            roleMutation.mutate({
                              id: u.id,
                              role: e.target.value as UserRole,
                            })
                          }
                          className="text-xs px-2.5 py-1 rounded-lg bg-secondary border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className="text-xs text-muted-foreground/40">
                            —
                          </span>
                        ) : confirmBanId === u.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => banMutation.mutate(u.id)}
                              disabled={isBanning}
                              className="text-xs px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                            >
                              {isBanning ? "Deleting…" : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmBanId(null)}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmBanId(u.id)}
                            className="text-xs text-muted-foreground hover:text-red-400 transition-colors border border-border px-2.5 py-1 rounded-lg whitespace-nowrap"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main shell ────────────────────────────────────────────────────────────────

export function AdminConsole() {
  const [section, setSection] = useState<Section>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const { data: counts } = useQuery({
    queryKey: ["admin_counts"],
    queryFn: fetchCounts,
  });

  const { data: recentRequests = [] } = useQuery({
    queryKey: ["recent_requests"],
    queryFn: fetchAllRequests,
  });

  const placeRequestCount = counts?.placeRequests ?? 0;
  const ownerClaimCount = counts?.ownerClaims ?? 0;
  const totalOwnerClaims = counts?.totalOwnerClaims ?? 0;
  const todayRequestCount = counts?.todayRequests ?? 0;
  const newUsersThisWeek = counts?.newUsersThisWeek ?? 0;
  const newUsersWeekDelta = counts?.newUsersWeekDelta ?? 0;
  const commentCount = 12;

  console.log(counts?.newUsersThisWeek, "?");

  const navItems: {
    key: Section;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      key: "overview",
      label: "Overview",
      icon: <LuLayoutDashboard size={16} />,
    },
    {
      key: "place_requests",
      label: "Place Requests",
      icon: <LuMapPin size={16} />,
      badge: placeRequestCount,
    },
    {
      key: "ownership_claims",
      label: "Ownership Claims",
      icon: <LuShield size={16} />,
      badge: ownerClaimCount,
    },
    {
      key: "comments",
      label: "Comments",
      icon: <LuMessageSquare size={16} />,
      badge: commentCount,
    },
    { key: "users", label: "Users", icon: <LuUsers size={16} /> },
  ];

  function navigate(s: Section) {
    setSection(s);
    setDrawerOpen(false);
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 shrink-0 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2"
          onClick={() => setDrawerOpen(false)}
        >
          <span className="text-lg">🍺</span>
          <span className="font-semibold text-foreground">
            Pub <span className="text-primary">Rater</span>
          </span>
        </Link>
        {/* Close button inside drawer — mobile only */}
        <button
          onClick={() => setDrawerOpen(false)}
          className="md:hidden p-1 text-muted-foreground hover:text-foreground"
        >
          <LuX size={18} />
        </button>
      </div>
      {/* Nav */}
      <nav className="flex-1 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
            active={section === item.key}
            onClick={() => navigate(item.key)}
          />
        ))}
        <hr className="my-2 border-border" />
        <NavItem
          icon={<LuList size={16} />}
          label="All places"
          active={false}
          onClick={() => setDrawerOpen(false)}
        />
        <NavItem
          icon={<LuBell size={16} />}
          label="Notifications"
          active={false}
          onClick={() => setDrawerOpen(false)}
        />
      </nav>
    </>
  );

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-52 shrink-0 bg-background border-r border-border flex-col overflow-hidden">
        {sidebarContent}
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <aside className="relative w-64 bg-background border-r border-border flex flex-col overflow-hidden h-full z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 px-4 shrink-0 border-b border-border flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-2 -ml-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Open menu"
          >
            <LuMenu size={20} />
          </button>

          <div className="flex-1 relative">
            <LuSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search…"
              className="w-full max-w-sm h-8 pl-8 pr-3 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <button className="inline-flex items-center gap-1.5 px-3 md:px-4 h-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors shrink-0">
            <LuPlus size={14} />
            <span className="hidden sm:inline">Add place</span>
          </button>
        </header>

        {/* Section content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {section === "overview" && (
            <OverviewSection
              placeRequestCount={placeRequestCount}
              ownerClaimCount={ownerClaimCount}
              totalOwnerClaims={totalOwnerClaims}
              todayRequestCount={todayRequestCount}
              newUsersThisWeek={newUsersThisWeek}
              newUsersWeekDelta={newUsersWeekDelta}
              recentRequests={recentRequests}
            />
          )}
          {section === "place_requests" && <PlaceRequestsPane />}
          {section === "ownership_claims" && <OwnershipClaimsPane />}
          {section === "comments" && <CommentsSection />}
          {section === "users" && (
            <UsersSection currentUserId={currentUserId} />
          )}
        </div>
      </div>
    </div>
  );
}
