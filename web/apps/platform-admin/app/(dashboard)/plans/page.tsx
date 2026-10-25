import { serverClient } from "@educloud/api-client/server";
import { PageHeader, Stagger, StaggerItem } from "@educloud/ui";
import { PlanEditor } from "@/components/plan-editor";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Packages") };
}

export default async function PlansPage() {
  const t = await getT();
  const plans = await (await serverClient()).platformPlans();

  return (
    <>
      <PageHeader
        eyebrow={t("Product")}
        title={t("Packages")}
        description={t("What schools, universities and teachers can subscribe to. Prices and benefits appear on the website within a minute of saving.")}
      />
      <Stagger className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <StaggerItem key={plan.id}>
            <PlanEditor plan={plan} />
          </StaggerItem>
        ))}
        <StaggerItem>
          <PlanEditor />
        </StaggerItem>
      </Stagger>
    </>
  );
}
