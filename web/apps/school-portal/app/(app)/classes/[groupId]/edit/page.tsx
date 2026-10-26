import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { ApiError } from "@educloud/api-client";
import { PageHeader } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getT } from "@educloud/ui/locale";
import { ClassForm } from "@/components/structure-editor";
import { isUniversity } from "@/lib/academic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Edit class") };
}

export default async function EditClassPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const t = await getT();
  const { api, can, workspace } = await getContext();
  if (!can("members.manage")) notFound();
  const [group, advisors] = await Promise.all([
    api.classGroup(groupId).catch((error) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    api.members({ role: "teacher" }).then((r) => r.data.map((m) => ({ id: m.user.id, name: m.user.name }))).catch(() => []),
  ]);
  const university = isUniversity(workspace.tenant.type);
  const back = `/classes/${groupId}`;

  return (
    <>
      <PageHeader back={{ href: back, label: group.name }} icon={<Pencil />} title={university ? t("Edit section") : t("Edit class")} description={group.level.name} />
      <ClassForm levelId={group.academic_level_id} group={group} advisors={advisors} university={university} backHref={back} />
    </>
  );
}
