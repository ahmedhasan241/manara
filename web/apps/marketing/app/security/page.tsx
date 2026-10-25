import { SecurityView, securityMetadata } from "@educloud/ui/product/server";

export const generateMetadata = securityMetadata;

export default function SecurityPage() {
  return <SecurityView />;
}
