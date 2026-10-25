"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PartyPopper, X } from "lucide-react";
import { celebrate, useT } from "@educloud/ui";

/**
 * Cheers a student on for a great recent grade: confetti and a small banner,
 * once per grade on this device.
 */
export function Celebration({ gradeId, message }: { gradeId: string; message: string }) {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const key = `educloud-celebrated-${gradeId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    setShow(true);
    const timer = setTimeout(() => celebrate({ x: 0.5, y: 0.25 }), 400);
    return () => clearTimeout(timer);
  }, [gradeId]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12 }}
          className="gradient-border mb-6 flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-[var(--shadow-lift)]"
          role="status"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
            <PartyPopper className="h-5 w-5" />
          </span>
          <p className="flex-1 font-semibold">{message}</p>
          <button type="button" onClick={() => setShow(false)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-3" aria-label={t("Dismiss")}>
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
