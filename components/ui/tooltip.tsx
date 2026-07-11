"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  label?: string;
  side?: "top" | "bottom";
  children: ReactNode;
  className?: string;
};

export function Tooltip({
  label,
  side = "top",
  children,
  className,
}: TooltipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  function show() {
    const el = ref.current;
    if (!el || !label) return;
    const r = el.getBoundingClientRect();
    setCoords({
      top: side === "top" ? r.top - 8 : r.bottom + 8,
      left: r.left + r.width / 2,
    });
  }

  function hide() {
    setCoords(null);
  }

  return (
    <span
      ref={ref}
      className={`inline-flex ${className ?? ""}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {label &&
        coords &&
        createPortal(
          <span
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              transform:
                side === "top"
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)",
            }}
            className="pointer-events-none z-[9999] whitespace-nowrap rounded-lg bg-neutral-800 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg"
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
