"use client";

import { Suspense, useState } from "react";
import { LuLayoutDashboard, LuMenu } from "react-icons/lu";
import { ConsoleSidebar } from "@/components/ui/console-sidebar";
import { OwnerOverview } from "./owner-overview";

type Section = "overview";

export function OwnerConsole() {
  const [section, setSection] = useState<Section>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  function navigate(s: Section) {
    setSection(s);
    setDrawerOpen(false);
  }

  const navItems = [
    {
      label: "Overview",
      icon: <LuLayoutDashboard size={16} />,
      active: section === "overview",
      onClick: () => navigate("overview"),
    },
  ];

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex ${sidebarCollapsed ? "w-14" : "w-52"} shrink-0 bg-background flex-col overflow-hidden transition-all duration-200`}
      >
        <ConsoleSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          onCloseDrawer={() => setDrawerOpen(false)}
          navItems={navItems}
        />
      </aside>

      {/* Mobile drawer */}
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

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-hidden flex flex-col md:pt-5">
          <div className="md:hidden px-4 pt-3 pb-1 shrink-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1.5 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Open menu"
            >
              <LuMenu size={20} />
            </button>
          </div>
          {section === "overview" && (
            <Suspense>
              <OwnerOverview />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
