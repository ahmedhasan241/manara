import { notFound, redirect } from "next/navigation";
import { DoorOpen } from "lucide-react";
import { PageHeader } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getT } from "@educloud/ui/locale";
import { ClassForm } from "@/components/structure-editor";
import { isUniversity } from "@/lib/academic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Add a class") };
}

/** Adding a class (?level= picks its level). Without any level yet, add a level first. */
export default async function NewClassPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const t = await getT();
  const { api, can } = await getContext();
  if (!can("members.manage")) notFound();
  const { level } = await searchParams;
  const [structure, advisors] = await Promise.all([
    api.academicStructure(),
    api.members({ role: "teacher" }).then((r) => r.data.map((m) => ({ id: m.user.id, name: m.user.name }))).catch(() => []),
  ]);
  if (structure.levels.length === 0) redirect("/classes/levels/new");
  const university = isUniversity(structure.type);
  const levels = [...structure.levels].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)).map((l) => ({ id: l.id, name: university && l.department ? `${l.department} · ${l.name}` : l.name }));

  return (
    <>
      <PageHeader
        back={{ href: "/classes", label: university ? t("Years & sections") : t("Classes & levels") }}
        icon={<DoorOpen />}
        title={university ? t("Add a section") : t("Add a class")}
        description={t("Students belong to one class. Subjects can be taught to a whole class.")}
      />
      <ClassForm levels={levels} levelId={levels.some((l) => l.id === level) ? level : undefined} advisors={advisors} university={university} backHref="/classes" />
    </>
  );
}
