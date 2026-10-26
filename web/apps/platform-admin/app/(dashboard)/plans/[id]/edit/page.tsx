import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { serverClient } from "@educloud/api-client/server";
import { Badge, PageHeader } from "@educloud/ui";
import { PlanForm } from "@/components/plan-editor";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Edit") };
}

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const plan = (await (await serverClient()).platformPlans()).find((p) => String(p.id) === id);
  if (!plan) notFound();

  return (
    <>
      <PageHeader
        back={{ href: "/plans", label: t("Packages") }}
        icon={<Pencil />}
        title={plan.name}
        meta={
          <>
            <Badge tone={plan.is_active ? "success" : "neutral"}>{plan.is_active ? t("On website") : t("Hidden")}</Badge>
            <span className="font-mono text-xs text-ink-muted">{plan.code}</span>
          </>
        }
      />
      <PlanForm plan={plan} />
    </>
  );
}
