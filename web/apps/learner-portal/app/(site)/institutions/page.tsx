import { Building2 } from "lucide-react";
import type { TenantType } from "@educloud/api-client";
import { CharacterGroup, EmptyState, FadeIn, FilterChips, Stagger, StaggerItem, rich } from "@educloud/ui";
import { OrganizationCard } from "@/components/site/market-card";
import { getViewer } from "@/lib/viewer";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Schools, universities & teachers") };
}

const TYPES = [
  [undefined, "All"],
  ["university", "Universities"],
  ["school", "Schools"],
  ["teacher", "Independent teachers"],
] as const satisfies readonly (readonly [TenantType | undefined, string])[];

export default async function InstitutionsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const t = await getT();
  const { type } = await searchParams;
  const selected = TYPES.find(([kind]) => kind === type)?.[0];
  const { api } = await getViewer();
  const organizations = await api.catalogOrganizations(selected);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <FadeIn className="mb-10 grid grid-cols-1 items-center gap-8 rounded-[2rem] bg-sky/70 p-6 sm:p-10 md:grid-cols-[1fr_1.1fr]">
        <div>
          <h1 className="text-display-md font-display font-bold">
            {rich(t("Learn with <hl>real institutions</hl>"), { hl: (w) => <span className="text-brand-500">{w}</span> })}
          </h1>
          <p className="mt-3 text-ink-muted">{t("Universities, schools and independent teachers publish their courses here. Pick one to see everything they teach.")}</p>
        </div>
        <CharacterGroup count={4} />
      </FadeIn>

      <FilterChips param="type" label={t("Type")} className="mb-6" options={TYPES.map(([kind, label]) => ({ value: kind, label: t(label) }))} />

      {organizations.length === 0 ? (
        <EmptyState icon={<Building2 className="h-6 w-6" />} title={t("Nothing here yet")} />
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <StaggerItem key={org.slug}>
              <OrganizationCard org={org} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
