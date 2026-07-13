"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSetLocale } from "@/context/intl-context";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useUser } from "@/features/profile/api/get-user";
import { useGeolocation } from "@/lib/geolocation/use-geolocation";
import { SearchBar } from "./search-bar";
import { FilterDrawer } from "./filter-drawer";
import { AddPlaceDialog } from "@/components/add-place-dialog";
import { Drawer } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { analytics } from "@/lib/analytics";
import {
  LuUser,
  LuSun,
  LuMoon,
  LuMenu,
  LuMapPin,
  LuPlus,
  LuLayoutDashboard,
  LuLogIn,
  LuLogOut,
  LuUserPlus,
  LuHouse,
  LuBell,
} from "react-icons/lu";
import { CountBadge } from "@/components/ui/count-badge";
import { motion } from "framer-motion";

type NavbarProps = {
  isSearchVisible?: boolean;
};

export function Navbar({ isSearchVisible = true }: NavbarProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const setLocale = useSetLocale();
  const pathname = usePathname();

  const activeSegment = (() => {
    const clean = pathname.startsWith(`/${locale}`)
      ? pathname.slice(`/${locale}`.length)
      : pathname;
    return clean.split("/").filter(Boolean)[0] ?? null;
  })();
  const { user, isAdmin, isOwner } = useUser();
  const { coords } = useGeolocation();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  // Only one drawer can be open at a time; the inactive one unmounts.
  const [activeDrawer, setActiveDrawer] = useState<"menu" | "filters" | null>(
    null,
  );
  const menuOpen = activeDrawer === "menu";
  const setMenuOpen = (nextOpen: boolean) =>
    setActiveDrawer(nextOpen ? "menu" : null);
  // Placeholder — no persistent unread-notification count exists yet.
  const notificationCount = 3;

  useEffect(() => setMounted(true), []);

  function menuLinkClass(segment: string | null) {
    return `flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
      activeSegment === segment
        ? "bg-secondary text-foreground font-medium"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
    }`;
  }

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
  };

  const sectionLabel = "mono-label text-primary text-[10px] font-semibold";

  const menuContent = (
    <div className="px-4 py-4 flex flex-col gap-6">
      {/* Navigation */}
      <div>
        <span className={sectionLabel}>{t("sectionNavigation")}</span>
        <div className="mt-3 flex flex-col gap-1">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className={menuLinkClass(null)}
          >
            <LuHouse size={16} />
            {t("home")}
          </Link>
          {user && (
            <>
              {/* Add Place — in drawer on mobile only */}
              {(!(isAdmin || isOwner) || activeSegment !== "dashboard") && (
                <button
                  onClick={() => {
                    setAddPlaceOpen(true);
                    setMenuOpen(false);
                  }}
                  className="md:hidden flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <LuMapPin size={16} />
                  {t("addPlace")}
                </button>
              )}
              {(isAdmin || isOwner) && (
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className={menuLinkClass("dashboard")}
                >
                  <LuLayoutDashboard size={16} />
                  {t("dashboard")}
                </Link>
              )}
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className={menuLinkClass("profile")}
              >
                <LuUser size={16} />
                {t("profile")}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Appearance */}
      <div>
        <span className={sectionLabel}>{t("sectionAppearance")}</span>
        <div className="mt-3 flex flex-col gap-3">
          {/* Theme toggle */}
          <div className="rounded-2xl border border-border bg-card/40">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                {mounted && resolvedTheme === "dark" ? (
                  <LuSun size={18} className="text-primary shrink-0" />
                ) : (
                  <LuMoon size={18} className="text-primary shrink-0" />
                )}
                <p className="text-[13px] font-medium text-foreground">
                  {t("darkMode")}
                </p>
              </div>
              <Switch
                checked={mounted && resolvedTheme === "dark"}
                onCheckedChange={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
                className="data-unchecked:bg-muted-foreground dark:data-unchecked:bg-muted-foreground data-checked:bg-primary"
              />
            </div>
          </div>

          {/* Language switcher */}
          <div className="grid grid-cols-2 gap-2">
            {(["pl", "en"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setLocale(lang);
                  setMenuOpen(false);
                }}
                className={`py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                  locale === lang
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "pl" ? t("langPl") : t("langEn")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Account */}
      {user ? (
        <div>
          <span className={sectionLabel}>{t("sectionAccount")}</span>
          <div className="mt-3">
            <button
              onClick={handleLogOut}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <LuLogOut size={16} />
              {t("logOut")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <span className={sectionLabel}>{t("userZone")}</span>
            <div className="mt-3 flex flex-col gap-1">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <LuLogIn size={16} />
                {t("signIn")}
              </Link>
              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <LuUserPlus size={16} />
                {t("createAccount")}
              </Link>
            </div>
          </div>
          <div>
            <span className={sectionLabel}>{t("ownerZone")}</span>
            <div className="mt-3 flex flex-col gap-1">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <LuLogIn size={16} />
                {t("ownerSignIn")}
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <header className="relative z-50 px-4 md:px-12 bg-transparent shrink-0">
        <div className="flex items-center gap-2 py-6 relative">
          <div className="h-12 flex items-center shrink-0">
            <Link
              href="/"
              aria-label="Pub Rater"
              onClick={() => analytics.logoClicked(pathname)}
            >
              <Image
                src={
                  mounted && resolvedTheme === "dark"
                    ? "/ocenpub-logo-dark.png"
                    : "/ocenpub-logo-light.png"
                }
                alt="Pub Rater"
                height={80}
                width={160}
                className="h-min w-auto object-contain"
                priority
              />
            </Link>
          </div>

          {/* Search bar — desktop only, absolutely centered in navbar */}
          {isSearchVisible && (
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 pointer-events-none">
              <div className="w-full pointer-events-auto">
                <SearchBar
                  filtersOpen={activeDrawer === "filters"}
                  onToggleFilters={() =>
                    setActiveDrawer((d) => (d === "filters" ? null : "filters"))
                  }
                />
              </div>
            </div>
          )}

          {/* Right controls */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Add Place — desktop bar only */}
            {user &&
              (!(isAdmin || isOwner) || activeSegment !== "dashboard") && (
                <button
                  onClick={() => setAddPlaceOpen(true)}
                  className="hidden md:inline-flex h-10 items-center gap-1.5 text-xs font-medium text-foreground border border-primary/40 rounded-lg px-3 hover:border-primary transition-colors"
                >
                  <LuPlus size={15} className="text-primary" />
                  {t("addPlace")}
                </button>
              )}

            {/* Notifications — all screen sizes */}
            {user && (
              <motion.button
                aria-label={t("notifications")}
                whileTap={{ scale: 0.88 }}
                className="relative h-10 w-10 flex items-center justify-center text-primary hover:text-primary border border-primary/40 rounded-lg hover:border-primary transition-colors"
              >
                <LuBell size={20} />
                {notificationCount > 0 && (
                  <CountBadge className="absolute -top-1.5 -right-1.5 bg-red-500">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </CountBadge>
                )}
              </motion.button>
            )}

            {/* Hamburger — all screen sizes */}
            <motion.button
              onClick={() =>
                setActiveDrawer((d) => (d === "menu" ? null : "menu"))
              }
              aria-label={t("openMenu")}
              whileTap={{ scale: 0.88 }}
              className="h-10 w-10 flex items-center justify-center text-primary hover:text-primary border border-primary/40 rounded-lg hover:border-primary transition-colors"
            >
              <LuMenu size={20} />
            </motion.button>
          </div>
        </div>

        {/* Search bar — mobile only */}
        {isSearchVisible && (
          <div className="pb-5 md:hidden">
            <SearchBar
              filtersOpen={activeDrawer === "filters"}
              onToggleFilters={() =>
                setActiveDrawer((d) => (d === "filters" ? null : "filters"))
              }
            />
          </div>
        )}
      </header>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} hideHeaderBorder>
        {menuContent}
      </Drawer>

      <FilterDrawer
        open={activeDrawer === "filters"}
        onClose={() => setActiveDrawer(null)}
      />

      <AddPlaceDialog
        open={addPlaceOpen}
        onOpenChange={setAddPlaceOpen}
        initialCenter={
          coords ? { lat: coords.lat, lon: coords.lon } : undefined
        }
      />
    </>
  );
}
