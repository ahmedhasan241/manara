import Link from "next/link";
import { CreditCard, ExternalLink, Globe2 } from "lucide-react";
import { serverClient } from "@educloud/api-client/server";
import { PageHeader, buttonClass } from "@educloud/ui";
import { WebsiteEditor } from "@/components/website-editor";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Website") };
}

export default async function WebsitePage() {
  const t = await getT();
  const content = await (await serverClient()).platformWebsite();
  const siteUrl = process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3010";

  return (
    <>
      <PageHeader
        eyebrow={t("Product")}
        icon={<Globe2 />}
        title={t("Website")}
        description={t("Edit the text on the product website. Packages and prices are edited under Packages.")}
        actions={
          <>
            <Link href="/plans" className={buttonClass("secondary")}>
              <CreditCard className="h-4 w-4" /> {t("Packages")}
            </Link>
            <a href={siteUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
              <ExternalLink className="h-4 w-4" /> {t("Public site")}
            </a>
          </>
        }
      />
      <WebsiteEditor content={content} siteUrl={siteUrl} />
    </>
  );
}
