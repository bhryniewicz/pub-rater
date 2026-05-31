"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useUser } from "@/hooks/use-user";
import { useGeolocation } from "@/context/geolocation-context";
import { SearchBar } from "@/components/search-bar";
import { AddPlaceDialog } from "@/components/add-place-dialog";
import { LuUser, LuBuilding2, LuSun, LuMoon, LuMenu, LuX, LuMapPin, LuLayoutDashboard, LuLogIn, LuUserPlus } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const { user, isAdmin, isOwner } = useUser();
  const { address, status, coords } = useGeolocation();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [zoneOpen, setZoneOpen] = useState(false);

  useEffect(() => setMounted(true), []);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutsideMenu(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutsideMenu);
    return () => document.removeEventListener("mousedown", handleClickOutsideMenu);
  }, [menuOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) {
        setZoneOpen(false);
      }
    }
    if (zoneOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [zoneOpen]);

  const themeToggle = (
    <motion.button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      whileTap={{ scale: 0.88 }}
      className="h-11 w-11 relative flex items-center justify-center text-muted-foreground hover:text-foreground border border-border rounded-lg hover:border-foreground/40 transition-colors overflow-hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        {mounted && resolvedTheme === "dark" ? (
          <motion.span
            key="sun"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <LuSun size={18} />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <LuMoon size={18} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );

  const addPlaceButton = (
    <button
      onClick={() => setAddPlaceOpen(true)}
      className="h-11 inline-flex items-center text-sm font-medium text-muted-foreground border border-border rounded-lg px-3 hover:text-foreground hover:border-foreground/40 transition-colors"
    >
      Add place
    </button>
  );

  const zonePicker = (
    <div ref={zoneRef} className="relative">
      <button
        onClick={() => setZoneOpen((v) => !v)}
        className="h-9 inline-flex items-center text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-full px-4 transition-colors"
      >
        Sign up
      </button>
      {zoneOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-popover border border-border rounded-xl shadow-2xl z-50 p-5 flex flex-col gap-3">
          {/* User zone */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center shrink-0">
              <LuUser size={17} className="text-muted-foreground" />
            </div>
            <span className="font-semibold text-foreground text-sm">User zone</span>
          </div>
          <Link
            href="/login"
            onClick={() => setZoneOpen(false)}
            className="text-left text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in to User&apos;s profile
          </Link>
          <Link
            href="/signup"
            onClick={() => setZoneOpen(false)}
            className="text-left text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Create an account at User profile
          </Link>

          <hr className="border-border" />

          {/* Owner zone */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center shrink-0">
              <LuBuilding2 size={17} className="text-muted-foreground" />
            </div>
            <span className="font-semibold text-foreground text-sm">Owner zone</span>
          </div>
          <Link
            href="/owner/login"
            onClick={() => setZoneOpen(false)}
            className="text-left text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in to Owner&apos;s panel
          </Link>
        </div>
      )}
    </div>
  );

  const authControls = user ? (
    <>
      {addPlaceButton}
      {(isAdmin || isOwner) && (
        <Link
          href="/dashboard"
          className="h-11 inline-flex items-center text-sm font-medium text-muted-foreground border border-border rounded-lg px-3 hover:text-foreground hover:border-foreground/40 transition-colors"
        >
          Dashboard
        </Link>
      )}
      <Link
        href="/profile"
        aria-label="Profile"
        className="h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground border border-border rounded-lg hover:border-foreground/40 transition-colors"
      >
        <LuUser size={18} />
      </Link>
    </>
  ) : (
    zonePicker
  );

  return (
    <>
      <header className="px-4 md:px-12 bg-background shrink-0">
        {/* Row 1: logo + auth — relative anchor for the mobile overlay */}
        <div ref={menuRef} className="relative flex items-center gap-2 pt-6 pb-4">
          <div className="h-11 flex items-center gap-1.5 shrink-0">
            <span className="text-xl">🍺</span>
            <h1 className="font-semibold text-foreground">
              <Link href="/">Pub Rater</Link>
            </h1>
          </div>
          {/* Desktop: search bar in the middle */}
          <div className="hidden md:flex flex-1 justify-center px-4 min-w-0">
            <div className="w-full max-w-2xl">
              <SearchBar />
            </div>
          </div>
          {/* Desktop auth controls */}
          <div className="hidden md:flex items-center gap-2 ml-auto">
            {themeToggle}
            {authControls}
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden ml-auto">
            <motion.button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open menu"
              whileTap={{ scale: 0.88 }}
              className="h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground border border-border rounded-lg hover:border-foreground/40 transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                {menuOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <LuX size={20} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <LuMenu size={20} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Mobile menu overlay — absolute, covers search bar + map below */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="md:hidden absolute -left-4 -right-4 top-full z-50 bg-background border-t border-border px-4 py-2 flex flex-col gap-1"
              >
                {/* Theme switch row */}
                <button
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {mounted && resolvedTheme === "dark" ? <LuSun size={16} /> : <LuMoon size={16} />}
                  <span className="flex-1 text-left">Dark mode</span>
                  <span
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${mounted && resolvedTheme === "dark" ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${mounted && resolvedTheme === "dark" ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </span>
                </button>

                <hr className="border-border my-1" />

                {user ? (
                  <>
                    <button
                      onClick={() => {
                        setAddPlaceOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <LuMapPin size={16} />
                      Add place
                    </button>
                    {(isAdmin || isOwner) && (
                      <Link
                        href="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <LuLayoutDashboard size={16} />
                        Dashboard
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <LuUser size={16} />
                      Profile
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <LuUser size={13} /> User zone
                    </div>
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <LuLogIn size={16} />
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <LuUserPlus size={16} />
                      Create account
                    </Link>
                    <hr className="border-border my-1" />
                    <div className="px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <LuBuilding2 size={13} /> Owner zone
                    </div>
                    <Link
                      href="/owner/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <LuLogIn size={16} />
                      Owner sign in
                    </Link>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Row 2: search bar on mobile only */}
        <div className="pb-5 md:hidden">
          <SearchBar />
        </div>
      </header>
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
