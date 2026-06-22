"use client";

import { LuX, LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";

type NavItemDef = {
  label: string;
  icon: React.ReactNode;
  badge?: number;
  active: boolean;
  onClick: () => void;
};

type ConsoleSidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCloseDrawer: () => void;
  navItems: NavItemDef[];
};

function NavItem({
  icon,
  label,
  badge,
  active,
  onClick,
  collapsed = false,
}: NavItemDef & { collapsed?: boolean }) {
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

export function ConsoleSidebar({
  collapsed,
  onToggleCollapse,
  onCloseDrawer,
  navItems,
}: ConsoleSidebarProps) {
  return (
    <>
      <div
        className={`pt-5 pb-6 shrink-0 flex items-center ${collapsed ? "justify-center px-0" : "px-2"}`}
      >
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Show menu" : undefined}
          className={`hidden md:flex items-center gap-2 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors ${
            collapsed ? "justify-center px-2.5" : "w-full px-3"
          }`}
        >
          {collapsed ? (
            <LuPanelLeftOpen size={16} />
          ) : (
            <LuPanelLeftClose size={16} />
          )}
          {!collapsed && <span>Hide menu</span>}
        </button>
        <button
          onClick={onCloseDrawer}
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
            key={item.label}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
            active={item.active}
            onClick={item.onClick}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </>
  );
}
