"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { LogoMark } from "./logo-mark";

/*
 * One loader for every app: whenever you move between pages, change the
 * currency or switch language, a slim glowing bar runs along the top and a
 * calm full-screen card with the Manara lighthouse covers the page until the
 * new content is ready.
 */

type LoaderState = { page: boolean; language: { name: string; dir: "ltr" | "rtl" } | null };

let state: LoaderState = { page: false, language: null };
const listeners = new Set<() => void>();
const emit = (next: Partial<LoaderState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const SERVER_STATE: LoaderState = { page: false, language: null };

/** Shows the page loader for a navigation you start in code (router.push). */
export function startPageLoad() {
  emit({ page: true });
}

export function finishPageLoad() {
  if (state.page) emit({ page: false });
}

/** Called by the language switcher while the interface re-renders in another language. */
export function startLanguageLoad(language: { name: string; dir: "ltr" | "rtl" }) {
  emit({ language });
}
export function finishLanguageLoad() {
  if (state.language) emit({ language: null });
}

/**
 * Mount once near the root (I18nProvider does this for every app). It takes
 * the translated "Loading…" text as a prop rather than reading the i18n
 * context, so this module and the provider don't import each other.
 */
export function GlobalLoader({ loadingLabel }: { loadingLabel: string }) {
  return (
    <>
      <Suspense fallback={null}>
        <NavigationWatcher />
      </Suspense>
      <PageBar loadingLabel={loadingLabel} />
      <LanguageOverlay />
    </>
  );
}

/** Starts the bar on internal link clicks and back/forward; stops it when the URL has changed. */
function NavigationWatcher() {
  const pathname = usePathname();
  const search = useSearchParams()?.toString();

  useEffect(() => {
    emit({ page: false });
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page (or only a #section): nothing to load.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      emit({ page: true });
    };
    const onPopState = () => emit({ page: true });
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}

/** The thin bar along the top, creeping towards the end until the page arrives. */
function PageBar({ loadingLabel }: { loadingLabel: string }) {
  const reduce = useReducedMotion();
  const { page } = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const shownAt = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (page) {
      setVisible(true);
      setProgress(0.08);
      // Ease towards 90%: quick at first, then slower and slower.
      const tick = () => {
        setProgress((p) => Math.min(0.9, p + (0.9 - p) * 0.12));
        timers.current.push(window.setTimeout(tick, 200));
      };
      timers.current.push(window.setTimeout(tick, 120));
      // Never get stuck: give up quietly after 15 s.
      timers.current.push(window.setTimeout(() => emit({ page: false }), 15000));
    } else {
      setProgress((p) => (p > 0 ? 1 : 0));
      timers.current.push(window.setTimeout(() => setVisible(false), 350));
      timers.current.push(window.setTimeout(() => setProgress(0), 700));
    }
    return () => timers.current.forEach(clearTimeout);
  }, [page]);

  // Cover the page only if the next one isn't there almost at once (no flash on instant changes).
  useEffect(() => {
    if (!page) return;
    const show = window.setTimeout(() => {
      shownAt.current = Date.now();
      setOverlay(true);
    }, 120);
    return () => clearTimeout(show);
  }, [page]);

  // Whenever loading is over, lift the overlay; once shown it stays a moment so it fades rather than blinks.
  useEffect(() => {
    if (page || !overlay) return;
    const hide = window.setTimeout(() => setOverlay(false), Math.max(0, 400 - (Date.now() - shownAt.current)));
    return () => clearTimeout(hide);
  }, [page, overlay]);

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]" style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease 0.1s" }}>
        <div
          className="h-full origin-left rounded-e-full bg-gradient-to-r from-brand-300 via-brand-500 to-brand-600 rtl:origin-right"
          style={{ transform: `scaleX(${progress})`, transition: reduce ? "none" : "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
        {/* A soft glow at the leading edge. */}
        <div
          className="absolute top-0 h-[3px] w-24 rounded-full bg-brand-500 blur-[3px] ltr:-translate-x-full rtl:translate-x-full"
          style={{ insetInlineStart: `${progress * 100}%`, opacity: progress > 0 && progress < 1 ? 0.9 : 0, transition: "inset-inline-start 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s" }}
        />
      </div>
      <LoaderOverlay show={overlay} title={loadingLabel} />
    </>
  );
}

/**
 * The Manara lighthouse at work: the mark in the middle, two soft gold beams
 * sweeping round it like a lighthouse lamp, and a thin gold arc on the rim.
 * With reduced motion the beams and arc stay still.
 */
function LighthouseSpinner() {
  const reduce = useReducedMotion();
  const spin = reduce ? "" : "animate-spin";
  return (
    <span className="relative grid h-28 w-28 shrink-0 place-items-center">
      <span
        aria-hidden
        className={`absolute inset-0 rounded-full ${spin} [animation-duration:2.6s]`}
        style={{
          background:
            "conic-gradient(from 0deg, rgb(224 181 95 / 0.55) 0deg, rgb(224 181 95 / 0) 46deg, transparent 180deg, rgb(224 181 95 / 0.55) 180deg, rgb(224 181 95 / 0) 226deg, transparent 360deg)",
          maskImage: "radial-gradient(circle, transparent 30%, #000 34%, transparent 71%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 30%, #000 34%, transparent 71%)",
        }}
      />
      <svg viewBox="0 0 40 40" className={`absolute inset-1.5 ${spin} [animation-duration:1.2s]`} aria-hidden>
        <circle cx="20" cy="20" r="19" fill="none" stroke="var(--line)" strokeWidth="0.8" />
        <circle cx="20" cy="20" r="19" fill="none" stroke="#d9ab55" strokeWidth="1" strokeLinecap="round" strokeDasharray="22 200" />
      </svg>
      <LogoMark className="relative h-14 w-14 rounded-[14px] shadow-[0_0_28px_-4px_rgb(224_181_95/0.6)]" />
    </span>
  );
}

/** Full-screen card shown while the interface re-renders in the chosen language. */
function LanguageOverlay() {
  const { language } = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);

  // Never get stuck behind the overlay.
  useEffect(() => {
    if (!language) return;
    const timer = window.setTimeout(finishLanguageLoad, 15000);
    return () => clearTimeout(timer);
  }, [language]);

  return <LoaderOverlay show={!!language} title={language?.name ?? ""} dir={language?.dir} />;
}

/**
 * The overlay itself, kept simple: the page dims slightly and the brand mark
 * turns in a thin ring, with one short line underneath. Clicks are held while
 * it shows. It fades with CSS and is removed by a timer, so it always goes
 * away, even in a background tab where animation frames are paused.
 */
function LoaderOverlay({ show, title, dir }: { show: boolean; title: string; dir?: "ltr" | "rtl" }) {
  const [mounted, setMounted] = useState(show);
  const [lastTitle, setLastTitle] = useState(title);

  useEffect(() => {
    if (show) {
      setMounted(true);
      setLastTitle(title);
      return;
    }
    const remove = window.setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(remove);
  }, [show, title]);

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={show}
      data-open={show}
      className="fixed inset-0 z-[110] flex animate-fade-in flex-col items-center justify-center gap-4 bg-surface-2/75 backdrop-blur-[2px] transition-opacity duration-300 data-[open=false]:pointer-events-none data-[open=false]:opacity-0"
    >
      <LighthouseSpinner />
      <span className="flex flex-col items-center gap-1.5 leading-none" translate="no">
        <span dir="ltr" className="font-display text-sm font-bold tracking-[0.3em]">
          <span className="text-brand-600 dark:text-brand-400">MAN</span>
          <span className="text-heading">ARA</span>
        </span>
        <span lang="ar" dir="rtl" className="text-xs font-semibold text-brand-600 dark:text-brand-300">
          منارة
        </span>
      </span>
      <p dir={dir} className="text-sm font-medium text-ink-muted">
        {show ? title : lastTitle}
      </p>
    </div>
  );
}
