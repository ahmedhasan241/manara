import { ImageResponse } from "next/og";

/**
 * Generated brand images for each app: the Apple touch icon and the social
 * preview card (Open Graph / Twitter). Text stays Latin so it renders without
 * shipping font files; the card names the product, not the language.
 */

const GOLD = "#e0b55f";
const NAVY = "#132544";
const PATHS = [
  "M20 3.6v2.5M15 5.3l1.4 1.7M25 5.3l-1.4 1.7",
  "M11.5 11.7 20 8.1l8.5 3.6L20 15.3z",
  "M12.7 12.3v3.4",
  "M15.6 16.9h8.8v2.3h-8.8z",
  "M16.6 19.2 15.1 29.4M23.4 19.2l1.5 10.2",
  "M16.2 23.4l7.5-2.3M15.7 27.2l8.8-2.7",
  "M7.4 30.8c4.2-1.7 8.4-1.4 12.6.9 4.2-2.3 8.4-2.6 12.6-.9",
  "M7.4 33.8c4.2-1.7 8.4-1.4 12.6.9 4.2-2.3 8.4-2.6 12.6-.9",
];

/** The Manara lighthouse in gold line art on a navy tile. */
function Mark({ size, tile = true }: { size: number; tile?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      {tile ? <rect width="40" height="40" rx="10" fill={NAVY} stroke={GOLD} strokeOpacity="0.4" /> : null}
      {PATHS.map((d) => (
        <path key={d} d={d} fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

export const appleIconSize = { width: 180, height: 180 };

export function appleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: NAVY }}>
        <Mark size={150} tile={false} />
      </div>
    ),
    appleIconSize,
  );
}

export const ogImageSize = { width: 1200, height: 630 };

/**
 * IBM Plex Sans Arabic for cards whose text may be Arabic (course titles).
 * Fetched once per server and cached; null if Google Fonts can't be reached,
 * in which case the default font is used.
 */
let plexArabic: Promise<ArrayBuffer | null> | null = null;
function loadPlexArabic() {
  plexArabic ??= fetch("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@600", { headers: { "User-Agent": "Mozilla/4.0" } })
    .then((r) => r.text())
    .then((css) => css.match(/url\((https:[^)]+\.ttf)\)/)?.[1])
    .then((url) => (url ? fetch(url).then((r) => r.arrayBuffer()) : null))
    .catch(() => null);
  return plexArabic;
}

/** A course's share card: its title, who teaches it, and the brand. */
export async function courseImage({ title, teacher, label }: { title: string; teacher: string; label: string }) {
  const font = await loadPlexArabic();
  const rtl = /[؀-ۿ]/.test(title);
  return ogImage({ title, subtitle: teacher, label, rtl }, font ? [{ name: "Plex Arabic", data: font, weight: 600, style: "normal" }] : undefined);
}

/** A calm social card on Manara navy: mark, product name, one line, and a gold dotted texture. */
export function ogImage(
  { title, subtitle, label, rtl = false }: { title: string; subtitle: string; label?: string; rtl?: boolean },
  fonts?: { name: string; data: ArrayBuffer; weight: 600; style: "normal" }[],
) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: NAVY,
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(224,181,95,0.16) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          color: "#f8f4ea",
          ...(fonts ? { fontFamily: "Plex Arabic" } : {}),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Mark size={64} />
          <span style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: 6 }}>
            <span style={{ color: GOLD }}>MAN</span>
            <span>ARA</span>
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: rtl ? "flex-end" : "flex-start", textAlign: rtl ? "right" : "left" }}>
          {label ? <span style={{ fontSize: 24, fontWeight: 600, color: GOLD, letterSpacing: 2 }}>{label}</span> : null}
          <span style={{ fontSize: title.length > 48 ? 54 : 68, fontWeight: 700, lineHeight: 1.12, letterSpacing: rtl ? 0 : -2, maxWidth: 1056 }}>{title}</span>
          <span style={{ fontSize: 30, color: "#b9c1d1", maxWidth: 900 }}>{subtitle}</span>
        </div>
        <div style={{ display: "flex", height: 10, width: 160, borderRadius: 999, background: GOLD }} />
      </div>
    ),
    fonts ? { ...ogImageSize, fonts } : ogImageSize,
  );
}
