"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { PubLine, BarSolid } from "@/assets/icons";
import {
  TicketLayout,
  TICKET,
  TICKET_DASH_BORDER,
  TICKET_LABEL,
} from "@/components/forms/_layout/ticket-layout";

type Preferences = {
  bar_preference: boolean;
  pub_preference: boolean;
};

type Props = {
  userId: string;
  onDone: () => void;
};

export function OnboardingModal({ userId, onDone }: Props) {
  const [preferences, setPreferences] = useState<Preferences>({
    bar_preference: false,
    pub_preference: false,
  });
  const [saving, setSaving] = useState(false);

  async function finish(prefs: Preferences) {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ is_onboarded: true, preferences: prefs })
      .eq("id", userId);
    setSaving(false);
    onDone();
  }

  function toggle(key: keyof Preferences) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <TicketLayout
      open={true}
      onOpenChange={() => {}}
      title="PREFERENCES"
      showBarcode={true}
      maxWidth="sm:max-w-sm"
    >
      <div className="px-8 pb-6 flex flex-col gap-5">
        <div className="pt-4" style={{ borderBottom: TICKET_DASH_BORDER }}>
          <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>
            WHAT KIND OF PLACES ARE YOU INTO?
          </p>

          <div className="flex flex-col gap-3 mt-3 mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.pub_preference}
                onChange={() => toggle("pub_preference")}
                className="w-4 h-4 rounded"
                style={{ accentColor: TICKET.ACCENT }}
              />
              <PubLine size={18} color={TICKET.TEXT} />
              <span
                className="font-mono text-xs font-bold uppercase tracking-wider"
                style={{ color: TICKET.TEXT }}
              >
                Pubs
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.bar_preference}
                onChange={() => toggle("bar_preference")}
                className="w-4 h-4 rounded"
                style={{ accentColor: TICKET.ACCENT }}
              />
              <BarSolid size={18} color={TICKET.TEXT} />
              <span
                className="font-mono text-xs font-bold uppercase tracking-wider"
                style={{ color: TICKET.TEXT }}
              >
                Bars
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => finish(preferences)}
            disabled={saving}
            className="w-full py-3 font-mono font-black uppercase tracking-[0.25em] text-sm rounded-sm transition-opacity disabled:opacity-60"
            style={{ backgroundColor: TICKET.ACCENT, color: TICKET.BG }}
          >
            {saving ? "SAVING..." : "DONE"}
          </button>
          <button
            onClick={() => finish({ bar_preference: false, pub_preference: false })}
            disabled={saving}
            className="w-full py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-center transition-opacity disabled:opacity-60"
            style={{ color: TICKET.MUTED }}
          >
            SKIP FOR NOW
          </button>
        </div>
      </div>
    </TicketLayout>
  );
}
