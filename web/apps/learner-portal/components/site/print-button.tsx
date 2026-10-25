"use client";

import { Printer } from "lucide-react";
import { buttonClass, useT } from "@educloud/ui";

export function PrintButton() {
  const t = useT();
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("secondary")}>
      <Printer className="h-4 w-4" /> {t("Print or save as PDF")}
    </button>
  );
}
