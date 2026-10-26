import Link from "next/link";
import { CreditCard, Plus } from "lucide-react";
import { serverClient } from "@educloud/api-client/server";
import { EmptyState, PageHeader, Stagger, StaggerItem, buttonClass } from "@educloud/ui";
import { PlanCard } from "@/components/plan-editor";
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
        icon={<CreditCard />}
        title={t("Packages")}
        description={t("What schools, universities and teachers can subscribe to. Prices and benefits appear on the website within a minute of saving.")}
        actions={
          <Link href="/plans/new" className={buttonClass("primary")}>
            <Plus className="h-4 w-4" /> {t("New package")}
          </Link>
        }
      />
      {plans.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-6 w-6" />} title={t("New package")} />
      ) : (
        <Stagger className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <StaggerItem key={plan.id}>
              <PlanCard plan={plan} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
