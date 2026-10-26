import { notFound } from "next/navigation";
import { TicketPercent } from "lucide-react";
import { PageHeader } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getT } from "@educloud/ui/locale";
import { CouponForm } from "@/components/coupon-tools";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("New code") };
}

/** Creating a discount code for one online course or all of them. */
export default async function NewCouponPage() {
  const t = await getT();
  const { api, can } = await getContext();
  if (!can("courses.manage")) notFound();
  const courses = await api.courses({ page: 1 });

  return (
    <>
      <PageHeader back={{ href: "/coupons", label: t("Discount codes") }} icon={<TicketPercent />} title={t("New code")} description={t("Give learners a percentage off your online courses: for a launch, a class, or a partner.")} />
      <CouponForm courses={courses.data.map((c) => ({ id: c.id, title: c.title }))} />
    </>
  );
}
