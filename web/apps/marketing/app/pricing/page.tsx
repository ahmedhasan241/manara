import { PricingView, pricingMetadata } from "@educloud/ui/product/server";

export const revalidate = 60;
export const generateMetadata = pricingMetadata;

export default function PricingPage() {
  return <PricingView />;
}
