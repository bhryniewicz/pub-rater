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
import { ConsoleSidebar } from "@/components/ui/console-sidebar";
import {
  LuLayoutDashboard,
  LuMapPin,
  LuShield,
  LuUsers,
  LuList,
  LuBell,
  LuMenu,
} from "react-icons/lu";

type Section =
  | "overview"
  | "place_requests"
  | "ownership_claims"
  | "users"
  | "all_place_requests";

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

  function navigate(s: Section) {
    setSection(s);
    setDrawerOpen(false);
  }

  const navItems = [
    { label: t("overview"), icon: <LuLayoutDashboard size={16} />, active: section === "overview", onClick: () => navigate("overview") },
    { label: t("placeRequests"), icon: <LuMapPin size={16} />, badge: placeRequestCount, active: section === "place_requests", onClick: () => navigate("place_requests") },
    { label: t("ownershipClaimsNav"), icon: <LuShield size={16} />, badge: ownerClaimCount, active: section === "ownership_claims", onClick: () => navigate("ownership_claims") },
    { label: t("allRequests"), icon: <LuList size={16} />, active: section === "all_place_requests", onClick: () => navigate("all_place_requests") },
    { label: t("users"), icon: <LuUsers size={16} />, active: section === "users", onClick: () => navigate("users") },
    { label: t("notifications"), icon: <LuBell size={16} />, active: false, onClick: () => setDrawerOpen(false) },
  ];

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* ── Desktop sidebar ── */}
      <aside className={`hidden md:flex ${sidebarCollapsed ? "w-14" : "w-52"} shrink-0 bg-background flex-col overflow-hidden transition-all duration-200`}>
        <ConsoleSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          onCloseDrawer={() => setDrawerOpen(false)}
          navItems={navItems}
        />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative w-64 bg-background flex flex-col overflow-hidden h-full z-10">
            <ConsoleSidebar
              collapsed={false}
              onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
              onCloseDrawer={() => setDrawerOpen(false)}
              navItems={navItems}
            />
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
