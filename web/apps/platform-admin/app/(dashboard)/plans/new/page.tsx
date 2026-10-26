import { Plus } from "lucide-react";
import { PageHeader } from "@educloud/ui";
import { PlanForm } from "@/components/plan-editor";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("New package") };
}

export default async function NewPlanPage() {
  const t = await getT();
  return (
    <>
      <PageHeader back={{ href: "/plans", label: t("Packages") }} icon={<Plus />} title={t("New package")} />
      <PlanForm />
    </>
  );
}
