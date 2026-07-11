"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSetLocale } from "@/context/intl-context";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useUser } from "@/features/profile/api/get-user";
import { useGeolocation } from "@/context/geolocation-context";
import { SearchBar } from "./search-bar";
import { AddPlaceDialog } from "@/components/add-place-dialog";
import { Drawer } from "@/components/ui/drawer";
import { supabase } from "@/lib/supabase";
import { analytics } from "@/lib/analytics";
import {
  LuUser,
  LuBuilding2,
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
  const [menuOpen, setMenuOpen] = useState(false);
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

  const menuContent = (
    <div className="px-4 py-5 flex flex-col gap-1">
      {/* Home link */}
      <Link
        href="/"
        onClick={() => setMenuOpen(false)}
        className={menuLinkClass(null)}
      >
        <LuHouse size={16} />
        {t("home")}
      </Link>

      <hr className="border-border my-1" />

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        {mounted && resolvedTheme === "dark" ? (
          <LuSun size={16} />
        ) : (
          <LuMoon size={16} />
        )}
        <span className="flex-1 text-left">{t("darkMode")}</span>
        <span
          className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${mounted && resolvedTheme === "dark" ? "bg-primary" : "bg-muted"}`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${mounted && resolvedTheme === "dark" ? "translate-x-4" : "translate-x-0"}`}
          />
        </span>
      </button>

      <hr className="border-border my-1" />

      {/* Language switcher */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        {(["pl", "en"] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => {
              setLocale(lang);
              setMenuOpen(false);
            }}
            className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
              locale === lang
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {lang === "pl" ? t("langPl") : t("langEn")}
          </button>
        ))}
      </div>

      <hr className="border-border my-1" />

      {user ? (
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
          <hr className="border-border my-1" />
          <button
            onClick={handleLogOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LuLogOut size={16} />
            {t("logOut")}
          </button>
        </>
      ) : (
        <>
          <div className="px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <LuUser size={13} /> {t("userZone")}
          </div>
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
          <hr className="border-border my-1" />
          <div className="px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <LuBuilding2 size={13} /> {t("ownerZone")}
          </div>
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <LuLogIn size={16} />
            {t("ownerSignIn")}
          </Link>
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
                <SearchBar />
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
              onClick={() => setMenuOpen((v) => !v)}
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
            <SearchBar />
          </div>
        )}
      </header>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)}>
        {menuContent}
      </Drawer>

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
