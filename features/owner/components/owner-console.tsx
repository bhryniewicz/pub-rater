"use client";

import { Suspense, useState } from "react";
import {
  LuLayoutDashboard,
  LuX,
  LuMenu,
  LuPanelLeftClose,
  LuPanelLeftOpen,
} from "react-icons/lu";
import { OwnerOverview } from "./owner-overview";

type Section = "overview";

function NavItem({
  icon,
  label,
  active,
  onClick,
  collapsed,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
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
    </button>
  );
}

export function OwnerConsole() {
  const [section, setSection] = useState<Section>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems: { key: Section; label: string; icon: React.ReactNode }[] = [
    {
      key: "overview",
      label: "Overview",
      icon: <LuLayoutDashboard size={16} />,
    },
  ];

  function navigate(s: Section) {
    setSection(s);
    setDrawerOpen(false);
  }

  const renderSidebarContent = (collapsed: boolean) => (
    <>
      <div
        className={`pt-5 pb-6 shrink-0 flex items-center ${collapsed ? "justify-center px-0" : "px-2"}`}
      >
        <button
          onClick={() => setSidebarCollapsed((v) => !v)}
          title={collapsed ? "Show menu" : undefined}
          className="hidden md:flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors w-full"
        >
          {collapsed ? (
            <LuPanelLeftOpen size={16} />
          ) : (
            <LuPanelLeftClose size={16} />
          )}
          {!collapsed && <span>Hide menu</span>}
        </button>
        <button
          onClick={() => setDrawerOpen(false)}
          className="md:hidden p-1 text-muted-foreground hover:text-foreground"
        >
          <LuX size={18} />
        </button>
      </div>
      <nav
        className={`flex-1 ${collapsed ? "px-1" : "px-2"} flex flex-col gap-0.5 overflow-y-auto`}
      >
        {navItems.map((item) => (
          <NavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={section === item.key}
            onClick={() => navigate(item.key)}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </>
  );

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex ${sidebarCollapsed ? "w-14" : "w-52"} shrink-0 bg-background flex-col overflow-hidden transition-all duration-200`}
      >
        {renderSidebarContent(sidebarCollapsed)}
      </aside>

      {/* Mobile drawer */}
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

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-hidden flex flex-col">
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
