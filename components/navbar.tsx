"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { useGeolocation } from "@/context/geolocation-context";
import { SearchBar } from "@/components/search-bar";
import { AuthDialog } from "@/components/auth-dialog";
import { AddPlaceDialog } from "@/components/add-place-dialog";
import { LuUser, LuShield } from "react-icons/lu";

export function Navbar() {
  const { user, isAdmin } = useUser();
  const { address, status, coords } = useGeolocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "admin-login">("login");
  const [zoneOpen, setZoneOpen] = useState(false);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);

  function openAuthFromZone(mode: "login" | "signup" | "admin-login") {
    setZoneOpen(false);
    setAuthMode(mode);
    setAuthOpen(true);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) {
        setZoneOpen(false);
      }
    }
    if (zoneOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [zoneOpen]);

  const addPlaceButton = (
    <button
      onClick={() => setAddPlaceOpen(true)}
      className="h-11 inline-flex items-center text-sm font-medium text-zinc-300 border border-zinc-700 rounded-lg px-3 hover:text-white hover:border-zinc-500 transition-colors"
    >
      Add place
    </button>
  );

  const zonePicker = (
    <div ref={zoneRef} className="relative">
      <button
        onClick={() => setZoneOpen((v) => !v)}
        className="h-11 inline-flex items-center text-sm font-medium text-zinc-950 bg-yellow-400 hover:bg-yellow-300 rounded-lg px-3 transition-colors"
      >
        Sign up
      </button>
      {zoneOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 p-5 flex flex-col gap-3">
          {/* User zone */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
              <LuUser size={17} className="text-zinc-300" />
            </div>
            <span className="font-semibold text-white text-sm">User zone</span>
          </div>
          <button
            onClick={() => openAuthFromZone("login")}
            className="text-left text-base font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Sign in to User&apos;s profile
          </button>
          <button
            onClick={() => openAuthFromZone("signup")}
            className="text-left text-base font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Create an account at User profile
          </button>

          <hr className="border-zinc-700" />

          {/* Admin zone */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
              <LuShield size={17} className="text-zinc-300" />
            </div>
            <span className="font-semibold text-white text-sm">Admin zone</span>
          </div>
          <button
            onClick={() => openAuthFromZone("admin-login")}
            className="text-left text-base font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Sign in to Admin&apos;s panel
          </button>
        </div>
      )}
    </div>
  );

  const authControls = user ? (
    <>
      {addPlaceButton}
      {isAdmin && (
        <Link
          href="/dashboard"
          className="h-11 inline-flex items-center text-sm font-medium text-zinc-300 border border-zinc-700 rounded-lg px-3 hover:text-white hover:border-zinc-500 transition-colors"
        >
          Dashboard
        </Link>
      )}
      <Link
        href="/profile"
        aria-label="Profile"
        className="h-11 w-11 flex items-center justify-center text-zinc-200 hover:text-white border border-zinc-700 rounded-lg hover:border-zinc-500 transition-colors"
      >
        <LuUser size={18} />
      </Link>
    </>
  ) : (
    zonePicker
  );

  return (
    <>
      <header className="px-4 md:px-12 bg-zinc-900 shrink-0">
        {/* Row 1: logo + auth */}
        <div className="flex items-center gap-2 pt-6 pb-4">
          <div className="h-11 flex items-center gap-1.5 shrink-0">
            <span className="text-xl">🍺</span>
            <h1 className="font-semibold text-white">
              <Link href="/">Pub Rater</Link>
            </h1>
          </div>
          {/* Desktop: search bar in the middle */}
          <div className="hidden md:flex flex-1 justify-center px-4 min-w-0">
            <div className="w-full max-w-2xl">
              <SearchBar />
            </div>
          </div>
          {/* Auth controls — rendered once to avoid shared-ref bug */}
          <div className="flex items-center gap-2 ml-auto">
            {authControls}
          </div>
        </div>
        {/* Row 2: search bar on mobile only */}
        <div className="pb-5 md:hidden">
          <SearchBar />
        </div>
      </header>
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
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
