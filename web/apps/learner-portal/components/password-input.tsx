"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, cn, useT } from "@educloud/ui";

/** 0–4: length, letters and numbers, mixed case, symbols, long. */
export function passwordScore(value: string): number {
  if (value.length < 8) return 0;
  let score = 1;
  if (/[a-z]/i.test(value) && /\d/.test(value)) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/[^a-z0-9]/i.test(value) || value.length >= 14) score++;
  return Math.min(score, 4);
}

/** Password field with show / hide, and (for new passwords) a strength hint. */
export function PasswordInput({
  id,
  name,
  autoComplete,
  className,
  strength = false,
  invalid = false,
  autoFocus,
}: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  className?: string;
  strength?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const t = useT();
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  const score = passwordScore(value);
  const labels = [t("Too short"), t("Weak"), t("Fair"), t("Good"), t("Strong")];
  const colours = ["bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success"];

  return (
    <div>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          autoFocus={autoFocus}
          // Controlled only when the strength hint needs the text (sign-in forms reset after an action).
          value={strength ? value : undefined}
          onChange={strength ? (e) => setValue(e.target.value) : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={strength && value ? `${id}-strength` : undefined}
          className={cn("pe-12", className)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 end-1 grid w-11 place-items-center text-ink-muted hover:text-ink"
          aria-label={show ? t("Hide password") : t("Show password")}
          aria-pressed={show}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {strength && value && (
        <div id={`${id}-strength`} className="mt-2 flex items-center gap-2" aria-live="polite">
          <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
            {[1, 2, 3, 4].map((step) => (
              <span key={step} className={cn("h-1 rounded-full transition-colors", score >= step ? colours[score] : "bg-surface-3")} />
            ))}
          </div>
          <span className={cn("shrink-0 text-xs font-medium", score <= 1 ? "text-danger" : score === 2 ? "text-warning" : "text-success")}>
            {t("Strength: {level}", { level: labels[score]! })}
          </span>
        </div>
      )}
    </div>
  );
}
