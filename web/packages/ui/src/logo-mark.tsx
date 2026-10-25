/**
 * The Manara lighthouse: a gold line drawing (rays, graduation cap, tower, open
 * book) on a navy tile. Shared by the header logo, the page loader, favicons
 * and share images. It imports nothing, so any module can use it.
 */
export const LOGO_PATHS = [
  "M20 3.6v2.5M15 5.3l1.4 1.7M25 5.3l-1.4 1.7",
  "M11.5 11.7 20 8.1l8.5 3.6L20 15.3z",
  "M12.7 12.3v3.4",
  "M15.6 16.9h8.8v2.3h-8.8z",
  "M16.6 19.2 15.1 29.4M23.4 19.2l1.5 10.2",
  "M16.2 23.4l7.5-2.3M15.7 27.2l8.8-2.7",
  "M7.4 30.8c4.2-1.7 8.4-1.4 12.6.9 4.2-2.3 8.4-2.6 12.6-.9",
  "M7.4 33.8c4.2-1.7 8.4-1.4 12.6.9 4.2-2.3 8.4-2.6 12.6-.9",
] as const;

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={`shrink-0 ${className}`} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#132544" />
      <rect x="0.5" y="0.5" width="39" height="39" rx="9.5" fill="none" stroke="#d9ab55" strokeOpacity="0.35" />
      <g fill="none" stroke="#e0b55f" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {LOGO_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
