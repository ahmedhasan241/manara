import { PageHeader } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { Messenger } from "@educloud/portal-kit/messenger";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Messages") };
}

export default async function MessagesPage() {
  const t = await getT();
  const { me, isStaff } = await getContext();

  return (
    <>
      <PageHeader title={t("Messages")} description={t("End-to-end encrypted. Only the people in a conversation can read it.")} />
      <Messenger me={{ id: me.id, name: me.name }} canCreateGroups={isStaff} />
    </>
  );
}
