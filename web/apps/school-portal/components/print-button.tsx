"use client";

import { Printer } from "lucide-react";
import { buttonClass, cn, useT } from "@educloud/ui";

export function PrintButton({ className, variant = "primary" }: { className?: string; variant?: "primary" | "secondary" }) {
  const t = useT();
  return (
    <button type="button" onClick={() => window.print()} className={cn(buttonClass(variant), "print:hidden", className)}>
      <Printer className="h-4 w-4" /> {t("Print")}
    </button>
  );
}
