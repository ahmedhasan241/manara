import { IBM_Plex_Mono, IBM_Plex_Sans_Arabic, Poppins } from "next/font/google";

/**
 * Poppins for Latin text (round and friendly), IBM Plex Sans Arabic for Arabic
 * (the browser falls through per character), Plex Mono for codes and numbers.
 * Self-hosted by Next at build time; add `fontClasses` to <html>.
 */
const poppins = Poppins({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"], variable: "--font-poppins", display: "swap" });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-plex-arabic", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

export const fontClasses = [poppins, plexArabic, plexMono].map((font) => font.variable).join(" ");
