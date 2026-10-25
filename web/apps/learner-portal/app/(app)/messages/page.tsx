import { PageHeader } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { Messenger } from "@educloud/portal-kit/messenger";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Messages") };
}

export default async function MessagesPage() {
  const t = await getT();
  const { me, workspace } = await requireAudience("learner", "/staff-account");

  return (
    <>
      <PageHeader
        eyebrow={t("Private")}
        title={workspace.role === "parent" ? t("Message teachers") : t("Messages")}
        description={t("End-to-end encrypted. Only the people in a conversation can read it.")}
      />
      <Messenger me={{ id: me.id, name: me.name }} canCreateGroups={false} />
    </>
  );
}
