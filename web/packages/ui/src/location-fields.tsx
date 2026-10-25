"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { Field, Input, Select } from "./components";
import { useLocale, useT } from "./i18n-provider";
import { countryOptions, type UserLocation } from "./location";

/**
 * Country, city and area inputs for sign-up and profile forms (named
 * `country`, `city`, `area`, so server actions read them from FormData).
 * Country names are in the reader's language and sorted for them.
 */
export function LocationFields({
  defaultValue,
  required = false,
  idPrefix = "location",
  errors,
  compact = false,
}: {
  defaultValue?: UserLocation | null;
  /** Country and city required (area is always optional). */
  required?: boolean;
  idPrefix?: string;
  errors?: Partial<Record<"country" | "city" | "area", string>>;
  /** Country on its own row, city and area side by side (narrow dialogs). */
  compact?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  // Country names and their sort order come from the runtime's ICU data, which
  // differs between Node and browsers, so the full list is built after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [country, setCountry] = useState(defaultValue?.country ?? "");
  const options = useMemo(
    () => (mounted ? countryOptions(locale) : countryOptions(locale).filter((o) => o.code === (defaultValue?.country ?? "").toUpperCase())),
    [mounted, locale, defaultValue?.country],
  );

  return (
    <fieldset className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-3"}>
      <legend className="sr-only">{t("Where you live")}</legend>
      <div className={compact ? "sm:col-span-2" : undefined}>
        <Field label={t("Country")} htmlFor={`${idPrefix}-country`} error={errors?.country}>
          <div className="relative">
            <MapPin aria-hidden className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Select
              id={`${idPrefix}-country`}
              name="country"
              required={required}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              autoComplete="country"
              className="ps-9"
              aria-invalid={!!errors?.country || undefined}
            >
              <option value="">{t("Choose your country")}</option>
              {options.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.flag} {o.name}
                </option>
              ))}
            </Select>
          </div>
        </Field>
      </div>
      <Field label={t("City")} htmlFor={`${idPrefix}-city`} error={errors?.city}>
        <Input
          id={`${idPrefix}-city`}
          name="city"
          required={required}
          maxLength={120}
          defaultValue={defaultValue?.city ?? ""}
          autoComplete="address-level2"
          placeholder={t("e.g. Cairo")}
          aria-invalid={!!errors?.city || undefined}
        />
      </Field>
      <Field label={t("Area (optional)")} htmlFor={`${idPrefix}-area`} error={errors?.area}>
        <Input
          id={`${idPrefix}-area`}
          name="area"
          maxLength={120}
          defaultValue={defaultValue?.area ?? ""}
          autoComplete="address-level3"
          placeholder={t("e.g. Maadi")}
          aria-invalid={!!errors?.area || undefined}
        />
      </Field>
    </fieldset>
  );
}
