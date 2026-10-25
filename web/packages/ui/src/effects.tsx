"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { cn } from "./components";

/** True on devices with a fine pointer (mouse/trackpad); effects that follow the cursor skip touch screens. */
function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => setFine(window.matchMedia("(pointer: fine)").matches), []);
  return fine;
}

/**
 * A soft light that follows the cursor across a surface.
 */
export function Spotlight({ children, className, color = "var(--brand-500)", size = 420 }: { children: ReactNode; className?: string; color?: string; size?: number }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onPointerLeave={() => setPos(null)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: pos ? 1 : 0,
          background: pos ? `radial-gradient(${size}px circle at ${pos.x}px ${pos.y}px, color-mix(in oklab, ${color} 16%, transparent), transparent 70%)` : undefined,
        }}
      />
      {children}
    </div>
  );
}

/**
 * Pulls its child gently towards the cursor (for primary calls to action).
 */
export function Magnetic({ children, strength = 0.25, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 260, damping: 18 });
  const y = useSpring(0, { stiffness: 260, damping: 18 });

  return (
    <motion.div
      ref={ref}
      className={cn("inline-block", className)}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (!fine || reduce || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - rect.left - rect.width / 2) * strength);
        y.set((e.clientY - rect.top - rect.height / 2) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** A thin gradient bar at the top of the page showing reading progress. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-brand-600 rtl:origin-right"
      style={{ scaleX }}
    />
  );
}

/** Cycles through words with a vertical roll ("teachers", "lecturers", "schools"…). */
export function RotatingWords({ words, interval = 2200, className }: { words: string[]; interval?: number; className?: string }) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || words.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => clearInterval(timer);
  }, [interval, reduce, words.length]);

  return (
    <span className={cn("relative inline-grid overflow-hidden text-start align-bottom", className)}>
      {/* Invisible longest word reserves the width so the line doesn't jump. */}
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {words.reduce((a, b) => (b.length > a.length ? b : a), "")}
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={words[index]}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="col-start-1 row-start-1"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Endless horizontal scroller; content is duplicated for a seamless loop. Pauses on hover. */
export function Marquee({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]", className)}>
      <div className="flex w-max animate-marquee gap-4 group-hover:[animation-play-state:paused] rtl:[animation-direction:reverse]">
        {children}
        <div aria-hidden className="flex gap-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Floating blurred orbs in palette colours, for hero and empty areas. */
export function Orbs({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  const style = (o: number): CSSProperties => ({ opacity: o * intensity });
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="animate-aurora absolute -start-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-500 blur-[110px]" style={style(0.28)} />
      <div className="animate-aurora absolute -end-20 top-1/4 h-[24rem] w-[24rem] rounded-full bg-accent-500 blur-[110px] [animation-delay:-6s]" style={style(0.2)} />
      <div className="animate-aurora absolute bottom-0 start-1/3 h-[20rem] w-[20rem] rounded-full blur-[100px] [animation-delay:-11s]" style={{ ...style(0.18), background: "var(--gradient-mid)" }} />
    </div>
  );
}

/**
 * A short confetti burst in palette colours, drawn on a temporary canvas.
 * Skipped when the user prefers reduced motion.
 */
export function celebrate(origin: { x: number; y: number } = { x: 0.5, y: 0.6 }) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const styles = getComputedStyle(document.documentElement);
  const colors = ["--brand-400", "--brand-500", "--accent-400", "--gradient-mid", "--brand-200"].map((v) => styles.getPropertyValue(v).trim() || "#6d4aff");
  colors.push("#ffd166");

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999";
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const pieces = Array.from({ length: 140 }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = 7 + Math.random() * 9;
    return {
      x: origin.x * window.innerWidth,
      y: origin.y * window.innerHeight,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      round: Math.random() > 0.6,
    };
  });

  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of pieces) {
      p.vy += 0.28;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / 2200);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }
    if (t < 2200) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
