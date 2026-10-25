import { serverClient } from "@educloud/api-client/server";
import { PageHeader } from "@educloud/ui";
import { WebsiteEditor } from "@/components/website-editor";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Website") };
}

export default async function WebsitePage() {
  const t = await getT();
  const content = await (await serverClient()).platformWebsite();

  return (
    <>
      <PageHeader eyebrow={t("Product")} title={t("Website")} description={t("Edit the text on the product website. Packages and prices are edited under Packages.")} />
      <WebsiteEditor content={content} siteUrl={process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3010"} />
    </>
  );
}
