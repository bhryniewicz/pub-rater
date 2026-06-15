"use client";

import { Suspense, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { useAdminCounts } from "@/features/admin/api/get-admin-counts";
import { OverviewSection } from "./overview-section";
import { UsersSection } from "./users-section";
import { AllPlaceRequestsSection } from "./all-place-requests-section";
import { PlaceRequestsPane } from "./place-requests-pane";
import { OwnershipClaimsPane } from "./ownership-claims-pane";
import {
  LuLayoutDashboard,
  LuMapPin,
  LuShield,
  LuUsers,
  LuList,
  LuBell,
  LuX,
  LuMenu,
  LuPanelLeftClose,
  LuPanelLeftOpen,
} from "react-icons/lu";

type Section =
  | "overview"
  | "place_requests"
  | "ownership_claims"
  | "users"
  | "all_place_requests";

// ── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  icon,
  label,
  badge,
  active,
  onClick,
  collapsed = false,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active: boolean;
  onClick: () => void;
  collapsed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-3 px-3"} py-2.5 rounded-lg text-sm transition-colors text-left ${
        active
          ? "bg-primary/15 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-card"
      }`}
    >
      <span className={active ? "text-primary" : ""}>{icon}</span>
      {!collapsed && <span className="flex-1">{label}</span>}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium min-w-[20px] text-center">
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Main shell ────────────────────────────────────────────────────────────────

export function AdminConsole() {
  const t = useTranslations("admin");
  const [section, setSection] = useState<Section>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const { data: counts } = useAdminCounts();
  const placeRequestCount = counts.placeRequests;
  const ownerClaimCount = counts.ownerClaims;

  const navItems: {
    key: Section;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    { key: "overview", label: t("overview"), icon: <LuLayoutDashboard size={16} /> },
    { key: "place_requests", label: t("placeRequests"), icon: <LuMapPin size={16} />, badge: placeRequestCount },
    { key: "ownership_claims", label: t("ownershipClaimsNav"), icon: <LuShield size={16} />, badge: ownerClaimCount },
    { key: "all_place_requests", label: t("allRequests"), icon: <LuList size={16} /> },
    { key: "users", label: t("users"), icon: <LuUsers size={16} /> },
  ];

  function navigate(s: Section) {
    setSection(s);
    setDrawerOpen(false);
  }

  const renderSidebarContent = (collapsed: boolean) => (
    <>
      <div className={`pt-5 pb-6 shrink-0 flex items-center ${collapsed ? "justify-center px-0" : "px-2"}`}>
        <button
          onClick={() => setSidebarCollapsed((v) => !v)}
          title={collapsed ? "Show menu" : undefined}
          className="hidden md:flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors w-full"
        >
          {collapsed ? <LuPanelLeftOpen size={16} /> : <LuPanelLeftClose size={16} />}
          {!collapsed && <span>Hide menu</span>}
        </button>
        <button
          onClick={() => setDrawerOpen(false)}
          className="md:hidden p-1 text-muted-foreground hover:text-foreground"
        >
          <LuX size={18} />
        </button>
      </div>
      <nav className={`flex-1 ${collapsed ? "px-1" : "px-2"} flex flex-col gap-0.5 overflow-y-auto`}>
        {navItems.map((item) => (
          <NavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
            active={section === item.key}
            onClick={() => navigate(item.key)}
            collapsed={collapsed}
          />
        ))}
        <NavItem
          icon={<LuBell size={16} />}
          label={t("notifications")}
          active={false}
          onClick={() => setDrawerOpen(false)}
          collapsed={collapsed}
        />
      </nav>
    </>
  );

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* ── Desktop sidebar ── */}
      <aside className={`hidden md:flex ${sidebarCollapsed ? "w-14" : "w-52"} shrink-0 bg-background flex-col overflow-hidden transition-all duration-200`}>
        {renderSidebarContent(sidebarCollapsed)}
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative w-64 bg-background flex flex-col overflow-hidden h-full z-10">
            {renderSidebarContent(false)}
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-hidden flex flex-col md:pt-5">
          {/* Mobile sidebar toggle */}
          <div className="md:hidden px-4 pt-3 pb-1 shrink-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1.5 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("openMenu")}
            >
              <LuMenu size={20} />
            </button>
          </div>
          {section === "overview" && (
            <Suspense>
              <OverviewSection />
            </Suspense>
          )}
          {section === "place_requests" && (
            <Suspense>
              <PlaceRequestsPane />
            </Suspense>
          )}
          {section === "ownership_claims" && (
            <Suspense>
              <OwnershipClaimsPane />
            </Suspense>
          )}
          {section === "all_place_requests" && (
            <Suspense>
              <AllPlaceRequestsSection />
            </Suspense>
          )}
          {section === "users" && (
            <Suspense>
              <UsersSection currentUserId={currentUserId} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
