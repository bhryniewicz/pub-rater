"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LuX } from "react-icons/lu";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  hideHeaderBorder?: boolean;
  children: React.ReactNode;
};

export function Drawer({
  open,
  onClose,
  title,
  headerAction,
  footer,
  hideHeaderBorder,
  children,
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className="fixed inset-y-0 right-0 z-50 w-full md:max-w-sm bg-background flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-4 py-4 shrink-0${hideHeaderBorder ? "" : " border-b border-border"}`}>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <LuX size={18} />
              </button>
              {title ? (
                <span className="text-white font-bold text-base">{title}</span>
              ) : (
                <div />
              )}
              {headerAction ?? <div className="w-8" />}
            </div>
            <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {children}
            </div>
            {footer && (
              <div className="border-t border-border shrink-0 p-4">{footer}</div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
