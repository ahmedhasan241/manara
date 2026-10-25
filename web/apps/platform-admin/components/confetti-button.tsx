"use client";

import { PartyPopper } from "lucide-react";
import { Button, celebrate, useT } from "@educloud/ui";

export function ConfettiButton() {
  const t = useT();
  return (
    <Button
      variant="soft"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        celebrate({ x: (rect.left + rect.width / 2) / window.innerWidth, y: rect.top / window.innerHeight });
      }}
    >
      <PartyPopper className="h-4 w-4" /> {t("Celebrate")}
    </Button>
  );
}
