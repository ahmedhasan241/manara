"use client";

import Link from "next/link";
import { Alert, useT } from "@educloud/ui";

/** API reasons that a bigger package fixes: seats used up, or video meetings not included. */
export const UPGRADE_CODES = ["seat_limit", "addon_required"] as const;

/** The failure's code when it is one a package change fixes. */
export function upgradeCode(result: unknown): (typeof UPGRADE_CODES)[number] | undefined {
  if (!result || typeof result !== "object" || !("code" in result) || (result as { ok?: unknown }).ok !== false) return undefined;
  const code = (result as { code?: unknown }).code;
  return UPGRADE_CODES.find((c) => c === code);
}

/**
 * The API's explanation (e.g. "Your package includes 50 students…") with a
 * link to Package & billing, where owners and admins can add seats or video
 * meetings. Others land on a page telling them who can.
 */
export function UpgradeNotice({ message, className }: { message: string; className?: string }) {
  const t = useT();
  return (
    <div className={className}>
      <Alert tone="warning">
        <span>{message}</span>{" "}
        <Link href="/billing" className="font-semibold underline underline-offset-2">
          {t("See package & billing")}
        </Link>
      </Alert>
    </div>
  );
}
