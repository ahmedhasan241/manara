import type { Locale } from "../../i18n";
import type { Catalog } from "../../translate";

/** Loads one language's catalog (only the active one is sent to the browser). */
export async function loadCatalog(locale: Locale): Promise<Catalog> {
  switch (locale) {
    case "ar":
      return (await import("./ar")).default;
    case "fr":
      return (await import("./fr")).default;
    case "es":
      return (await import("./es")).default;
    case "pt":
      return (await import("./pt")).default;
    case "zh":
      return (await import("./zh")).default;
    default:
      return (await import("./en")).default;
  }
}
