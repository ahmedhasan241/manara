"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, MotionConfig, useInView, useReducedMotion, type Variants } from "motion/react";
import { useFormat, useT } from "./i18n-provider";

/**
 * Animation building blocks. Every animation honours the user's
 * "reduce motion" setting through MotionConfig.
 */

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/**
 * Inside app screens (dashboards, lists) content should be there at once, not
 * wait to be scrolled to: FadeIn and Stagger then play on mount instead.
 */
const OnMount = createContext(false);

export function RevealOnMount({ children }: { children: ReactNode }) {
  return <OnMount.Provider value={true}>{children}</OnMount.Provider>;
}

/** `whileInView` on marketing pages, a plain mount animation inside the app. */
function useEnter<T>(target: T) {
  return useContext(OnMount) ? { animate: target } : { whileInView: target };
}

const ease = [0.22, 1, 0.36, 1] as const;

/** Rises into place the first time it scrolls into view (straight away if already visible, or inside the app). */
export function FadeIn({ children, delay = 0, y = 14, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const enter = useEnter({ opacity: 1, y: 0 });
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} {...enter} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.55, delay, ease }}>
      {children}
    </motion.div>
  );
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease } },
};

/** Children wrapped in <StaggerItem> appear one after another, when the group scrolls into view. */
export function Stagger({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" | "ol" }) {
  const Component = motion[as];
  const enter = useEnter("show");
  return (
    <Component className={className} variants={container} initial="hidden" {...enter} viewport={{ once: true, amount: 0.1 }}>
      {children}
    </Component>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  const Component = motion[as];
  return (
    <Component className={className} variants={item}>
      {children}
    </Component>
  );
}

/** Wraps page content for a soft enter transition (use from a template.tsx). */
export function PageTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease }}
      // A leftover filter or transform would trap fixed children (progress bar, floating buttons); clear them once settled.
      onAnimationComplete={() => {
        if (ref.current) ref.current.style.filter = ref.current.style.transform = "";
      }}
    >
      {children}
    </motion.div>
  );
}

/** Counts up to a number when it scrolls into view. */
export function CountUp({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const fmt = useFormat();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, { duration: 1.1, ease, onUpdate: setDisplay });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return (
    <span ref={ref}>
      {fmt.number(display, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/** Pulsing coral dot for anything happening right now. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={`relative inline-flex h-2.5 w-2.5 ${className ?? ""}`} aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live-500 opacity-70" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-live-500" />
    </span>
  );
}

/** "in 12 min", "in 2 h 5 min", "now" — ticks every 30 seconds. */
export function Countdown({ to, className }: { to: string; className?: string }) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.round((new Date(to).getTime() - now) / 60_000);
  let text: string;
  if (minutes <= 0) text = t("now");
  else if (minutes < 60) text = t("in {count} min", { count: minutes });
  else if (minutes < 60 * 24) text = t("in {hours} h {minutes} min", { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  else text = t("in {count} days", { count: Math.round(minutes / 1440) });

  return (
    <time dateTime={to} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
