"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";
import { cn } from "./components";

/*
 * Kinetic type and scroll-linked layouts. Words are the smallest unit we
 * animate (never letters), so Arabic stays joined. Everything renders as
 * plain, readable content when the user prefers reduced motion.
 */

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * A headline whose words rise out of a mask one after another, losing a
 * little blur on the way. Screen readers get the sentence in one piece.
 */
export function WordReveal({ text, className, delay = 0, stagger = 0.055, as = "span" }: { text: string; className?: string; delay?: number; stagger?: number; as?: "span" | "h1" | "h2" | "p" }) {
  const reduce = useReducedMotion();
  // Watch the whole line: each word starts clipped by its mask, so it can't be "seen" itself.
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const Tag = as;
  const words = text.split(/\s+/).filter(Boolean);
  if (reduce) return <Tag className={className}>{text}</Tag>;

  return (
    <Tag ref={ref as never} className={className} aria-label={text}>
      {/* Word boxes count as neutral for bidi; isolating them keeps English in order on an Arabic page (and vice versa). */}
      <span dir="auto">
        {words.map((word, i) => (
          <span key={`${word}-${i}`} aria-hidden className="inline-flex overflow-hidden pb-[0.12em] align-bottom [margin-block-end:-0.12em]">
            <motion.span
              className="inline-block will-change-transform"
              initial={{ y: "105%", opacity: 0, filter: "blur(6px)" }}
              animate={inView ? { y: "0%", opacity: 1, filter: "blur(0px)" } : undefined}
              transition={{ duration: 0.7, ease, delay: delay + i * stagger }}
            >
              {word}
            </motion.span>
            {i < words.length - 1 && " "}
          </span>
        ))}
      </span>
    </Tag>
  );
}

/**
 * Reading by scrolling: each word goes from faint to full ink as the
 * paragraph moves up through the screen.
 */
export function ScrollHighlight({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(/\s+/).filter(Boolean);
  if (reduce) return <p className={className}>{text}</p>;

  return (
    <p ref={ref} className={className} aria-label={text}>
      {words.map((word, i) => (
        <HighlightWord key={`${word}-${i}`} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {word}
        </HighlightWord>
      ))}
    </p>
  );
}

function HighlightWord({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <span aria-hidden>
      <motion.span style={{ opacity }}>{children}</motion.span>{" "}
    </span>
  );
}

/**
 * The teacher's mark: a hand-drawn wavy line that draws itself under its
 * text the first time it is seen.
 */
export function DrawUnderline({ children, className, color = "var(--brand-400)", delay = 0.35 }: { children: ReactNode; className?: string; color?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();

  return (
    <span ref={ref} className={cn("relative inline-block whitespace-nowrap", className)}>
      {children}
      <svg aria-hidden viewBox="0 0 300 16" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-[0.32em] start-0 h-[0.42em] w-full overflow-visible rtl:-scale-x-100">
        <motion.path
          d="M3 10 C 30 2, 50 15, 78 8 S 128 2, 156 9 S 208 15, 236 7 S 282 3, 297 9"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: inView || reduce ? 1 : 0 }}
          transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay }}
        />
      </svg>
    </span>
  );
}

/**
 * A marquee that drifts on its own and speeds up with the page's scroll —
 * scroll fast and it hurries along, stop and it settles.
 */
export function VelocityMarquee({ children, baseSpeed = 2.4, className }: { children: ReactNode; baseSpeed?: number; className?: string }) {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [-2000, 0, 2000], [-5, 0, 5], { clamp: false });
  const direction = useRef(1);
  const [rtl, setRtl] = useState(false);
  // In RTL the container right-aligns the strip, so it simply travels the other way.
  const mirrored = useTransform(x, (v) => -v);
  const hovered = useRef(false);

  useEffect(() => setRtl(document.documentElement.dir === "rtl"), []);

  useAnimationFrame((_, delta) => {
    const track = trackRef.current;
    if (reduce || !track) return;
    const half = track.scrollWidth / 2;
    if (!half) return;
    const b = boost.get();
    if (b < -0.05) direction.current = -1;
    else if (b > 0.05) direction.current = 1;
    const speed = (hovered.current ? 0.25 : 1) * baseSpeed * direction.current * (1 + Math.abs(b));
    let next = x.get() - (speed * delta) / 16;
    if (next <= -half) next += half;
    if (next > 0) next -= half;
    x.set(next);
  });

  const items = Children.toArray(children);
  return (
    <div
      className={cn("relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]", className)}
      onPointerEnter={() => (hovered.current = true)}
      onPointerLeave={() => (hovered.current = false)}
    >
      <motion.div ref={trackRef} dir="ltr" className="flex w-max gap-4" style={reduce ? undefined : { x: rtl ? mirrored : x }}>
        <div dir={rtl ? "rtl" : undefined} className="flex shrink-0 gap-4">{items}</div>
        <div aria-hidden dir={rtl ? "rtl" : undefined} className="flex shrink-0 gap-4">{items}</div>
      </motion.div>
    </div>
  );
}

/**
 * Cards that pin one after another and stack like a deck while you scroll;
 * the ones underneath sink back and dim. Phones get a plain list.
 */
export function StackedCards({ children, className, top = 96 }: { children: ReactNode; className?: string; top?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [wide, setWide] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const items = Children.toArray(children);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {items.map((child, i) => (
        <StackedCard key={i} index={i} count={items.length} progress={scrollYProgress} top={top} still={!!reduce || !wide}>
          {child}
        </StackedCard>
      ))}
    </div>
  );
}

function StackedCard({ children, index, count, progress, top, still }: { children: ReactNode; index: number; count: number; progress: MotionValue<number>; top: number; still: boolean }) {
  const start = index / count;
  const target = 1 - (count - 1 - index) * 0.045;
  const scale = useTransform(progress, [start, 1], [1, target]);
  const brightness = useTransform(progress, [start, 1], [1, 1 - (count - 1 - index) * 0.06]);
  const filter = useTransform(brightness, (b) => `brightness(${b})`);

  return (
    <>
      <div className="mb-6 md:sticky md:mb-0" style={{ top: top + index * 22 }}>
        <motion.div className="origin-top md:will-change-transform" style={still ? undefined : { scale, filter }}>
          {children}
        </motion.div>
      </div>
      {/* Scroll room before the next card slides over; a separate box so the sticky cards stay small. */}
      {index < count - 1 && <div aria-hidden className="hidden md:block md:h-[45vh]" />}
    </>
  );
}

/** Wraps a number so it rolls up like an odometer on first view (for stats written as text, e.g. "98%"). */
export function RollingValue({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  // Digits roll one by one; any other run ("%", "يومًا") stays whole so joined scripts keep joining.
  const chars = value.split(/(\d)/).filter(Boolean);

  return (
    <span ref={ref} className={cn("inline-flex tabular-nums", className)} aria-label={value}>
      {chars.map((c, i) =>
        /\d/.test(c) && !reduce ? (
          <span key={i} aria-hidden className="relative inline-block h-[1.1em] overflow-hidden leading-[1.1]">
            <motion.span
              className="flex flex-col"
              initial={{ y: "0%" }}
              animate={{ y: inView ? `-${(10 + Number(c)) * (100 / 20)}%` : "0%" }}
              transition={{ duration: 1.4, ease, delay: i * 0.06 }}
            >
              {Array.from({ length: 20 }, (_, d) => (
                <span key={d} className="block h-[1.1em]">{d % 10}</span>
              ))}
            </motion.span>
          </span>
        ) : (
          <span key={i} aria-hidden>{c}</span>
        ),
      )}
    </span>
  );
}
