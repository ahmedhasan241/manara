"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowUp } from "lucide-react";
import { cn } from "./components";
import { useT } from "./i18n-provider";

/*
 * Scrolling feel shared by every app. Smooth (inertial) scrolling only on
 * devices with a fine pointer and when the user hasn't asked for reduced
 * motion; touch devices keep their native scrolling.
 */

let lenis: Lenis | null = null;

/** Scrolls to an element or position, smoothly when smooth scrolling is on. */
export function scrollToTarget(target: number | string | HTMLElement, offset = -72) {
  if (lenis) return lenis.scrollTo(target, { offset });
  const top = typeof target === "number" ? target : (typeof target === "string" ? document.querySelector(target) : target)?.getBoundingClientRect().top;
  if (top === undefined) return;
  window.scrollTo({ top: typeof target === "number" ? target : window.scrollY + top + offset, behavior: "smooth" });
}

export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduced) return;

    const instance = new Lenis({
      lerp: 0.12,
      wheelMultiplier: 1,
      anchors: { offset: -72 },
      // Let menus, dialogs, sheets and inner scroll areas scroll on their own.
      prevent: (node) => !!node.closest?.("[role=dialog],[role=menu],[role=listbox],[data-radix-popper-content-wrapper],[data-lenis-prevent],textarea,.overflow-y-auto,.overflow-auto"),
    });
    lenis = instance;
    document.documentElement.classList.add("lenis-on");
    let frame = requestAnimationFrame(function raf(time) {
      instance.raf(time);
      frame = requestAnimationFrame(raf);
    });

    // Radix locks the page behind dialogs by styling <body>; pause meanwhile.
    const observer = new MutationObserver(() => (document.body.hasAttribute("data-scroll-locked") ? instance.stop() : instance.start()));
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked", "style"] });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      instance.destroy();
      lenis = null;
      document.documentElement.classList.remove("lenis-on");
    };
  }, []);

  // New page: start at the top without gliding there.
  useEffect(() => {
    if (!window.location.hash) lenis?.scrollTo(0, { immediate: true });
  }, [pathname]);

  return null;
}

/**
 * True while the visitor scrolls down past the header (so it can slide away),
 * false again as soon as they scroll up or reach the top.
 */
export function useHideOnScroll(threshold = 96) {
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - last.current;
      if (Math.abs(delta) > 6) setHidden(delta > 0 && y > threshold);
      last.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return hidden;
}

/**
 * A round button that appears after a screen of scrolling; its ring fills as
 * you read. Sits above the phone tab bar in the portals.
 */
export function BackToTop({ className }: { className?: string }) {
  const t = useT();
  const { scrollY, scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(false);
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 28 });
  const dash = useTransform(progress, (p) => `${p * 100} 100`);

  useEffect(() => scrollY.on("change", (y) => setVisible(y > window.innerHeight * 0.9)), [scrollY]);

  return (
    <motion.button
      type="button"
      aria-label={t("Back to top")}
      title={t("Back to top")}
      onClick={() => scrollToTarget(0, 0)}
      initial={false}
      animate={visible ? { opacity: 1, y: 0, pointerEvents: "auto" } : { opacity: 0, y: 12, pointerEvents: "none" }}
      transition={{ duration: 0.25 }}
      className={cn(
        "fixed bottom-[calc(1rem+var(--bottom-bar,0px)+env(safe-area-inset-bottom))] end-4 z-40 grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-ink shadow-[var(--shadow-lift)] transition-colors hover:text-brand-700 dark:hover:text-brand-300 print:hidden",
        className,
      )}
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <motion.circle cx="18" cy="18" r="16" fill="none" stroke="var(--brand-600)" strokeWidth="2" strokeLinecap="round" pathLength={100} style={{ strokeDasharray: dash }} />
      </svg>
      <ArrowUp className="h-4 w-4" />
    </motion.button>
  );
}

/**
 * Moves its content a little slower than the page while it passes through
 * the viewport (depth for hero art). `speed` is pixels of drift each way.
 */
export function Parallax({ children, speed = 40, className }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  return (
    <motion.div ref={ref} style={reduce ? undefined : { y }} className={className}>
      {children}
    </motion.div>
  );
}
