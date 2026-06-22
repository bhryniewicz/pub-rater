"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export const TICKET = {
  BG: "#faf3e6",
  ACCENT: "#c9a87c",
  TEXT: "#1a1209",
  MUTED: "#8a7355",
} as const;

export const TICKET_DASH_BORDER = "1px dashed #c9a87c80";
export const TICKET_LABEL = "font-mono text-[9px] font-bold uppercase tracking-[0.2em]";

const TOOTH_W = 16;
const TOOTH_COUNT = 60;
const TOTAL_W = TOOTH_COUNT * TOOTH_W;
const BAR_H = 8;
const TIP_Y = 28;

function buildTopPath(): string {
  let d = `M0,0 L${TOTAL_W},0 L${TOTAL_W},${BAR_H}`;
  for (let i = TOOTH_COUNT - 1; i >= 0; i--) {
    const x = i * TOOTH_W;
    d += ` L${x + TOOTH_W / 2},${TIP_Y} L${x},${BAR_H}`;
  }
  d += " Z";
  return d;
}

function buildBottomPath(): string {
  let d = `M0,${TIP_Y} L0,${BAR_H}`;
  for (let i = 0; i < TOOTH_COUNT; i++) {
    const x = i * TOOTH_W;
    d += ` L${x},${BAR_H} L${x + TOOTH_W / 2},0 L${x + TOOTH_W},${BAR_H}`;
  }
  d += ` L${TOTAL_W},${TIP_Y} Z`;
  return d;
}

const TOP_PATH = buildTopPath();
const BOTTOM_PATH = buildBottomPath();

export function SerratedTop() {
  return (
    <svg
      viewBox={`0 0 ${TOTAL_W} ${TIP_Y}`}
      preserveAspectRatio="none"
      style={{ display: "block", height: TIP_Y }}
      className="w-full"
    >
      <path d={BOTTOM_PATH} fill={TICKET.BG} />
    </svg>
  );
}

export function SerratedBottom() {
  return (
    <svg
      viewBox={`0 0 ${TOTAL_W} ${TIP_Y}`}
      preserveAspectRatio="none"
      style={{ display: "block", height: TIP_Y, transform: "scaleY(-1)" }}
      className="w-full"
    >
      <path d={BOTTOM_PATH} fill={TICKET.BG} />
    </svg>
  );
}

const BAR_PATTERN = [
  2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 2, 1, 2, 4, 1, 2, 3, 1,
  2, 1, 4, 2, 1, 3, 1, 2,
];

export function Barcode() {
  return (
    <div className="flex items-center justify-center gap-px px-12 h-10">
      {BAR_PATTERN.map((w, i) => (
        <div
          key={i}
          style={{ width: w * 3, backgroundColor: TICKET.TEXT }}
          className="h-full"
        />
      ))}
    </div>
  );
}

type TicketSectionProps = {
  children: ReactNode;
  label?: string;
};

export function TicketSection({ children, label }: TicketSectionProps) {
  return (
    <div className="py-4" style={{ borderBottom: TICKET_DASH_BORDER }}>
      {label && (
        <p className={TICKET_LABEL} style={{ color: TICKET.MUTED }}>
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

type TicketLayoutProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  meta?: string;
  onClose?: () => void;
  showBarcode?: boolean;
  maxWidth?: string;
  scrollable?: boolean;
  topSlot?: ReactNode;
  children: ReactNode;
};

export function TicketLayout({
  open,
  onOpenChange,
  title,
  subtitle,
  meta,
  onClose,
  showBarcode = true,
  maxWidth = "sm:max-w-lg",
  scrollable = false,
  topSlot,
  children,
}: TicketLayoutProps) {
  const header = (
    <div
      className="px-8 pt-8 pb-5 text-center"
      style={{ borderBottom: TICKET_DASH_BORDER }}
    >
      <h2
        className="font-mono font-black uppercase tracking-[0.35em] text-2xl"
        style={{ color: TICKET.TEXT }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="font-mono text-xs font-bold uppercase mt-1"
          style={{ letterSpacing: "0.15em", color: TICKET.TEXT }}
        >
          {subtitle}
        </p>
      )}
      {meta && (
        <p
          className="font-mono text-[10px] uppercase mt-0.5"
          style={{ letterSpacing: "0.12em", color: TICKET.MUTED }}
        >
          {meta}
        </p>
      )}
    </div>
  );

  const body = (
    <div className="relative" style={{ backgroundColor: TICKET.BG }}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-4 w-7 h-7 flex items-center justify-center transition-colors"
          style={{ color: TICKET.MUTED }}
        >
          <X size={16} />
        </button>
      )}
      {topSlot}
      {header}
      {children}
      {showBarcode && (
        <div className="py-4" style={{ borderTop: TICKET_DASH_BORDER }}>
          <Barcode />
        </div>
      )}
    </div>
  );

  const receipt = (
    <>
      <SerratedTop />
      <div className="max-h-[80vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {body}
      </div>
      <SerratedBottom />
    </>
  );

  const scrollableReceipt = (
    <div className="flex flex-col max-h-[calc(100dvh-2rem)]">
      <SerratedTop />
      <div
        className="overflow-y-auto flex-1"
        style={{ scrollbarWidth: "none", backgroundColor: TICKET.BG }}
      >
        {body}
      </div>
      <SerratedBottom />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`p-0 gap-0 border-0 rounded-none shadow-none overflow-visible [&>button]:hidden ${maxWidth}`}
        style={{ backgroundColor: "transparent" }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {scrollable ? scrollableReceipt : receipt}
      </DialogContent>
    </Dialog>
  );
}
