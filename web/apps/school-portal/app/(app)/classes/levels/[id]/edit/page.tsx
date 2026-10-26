import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import type { AcademicStage } from "@educloud/api-client";
import { PageHeader } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getT } from "@educloud/ui/locale";
import { LevelForm } from "@/components/structure-editor";
import { STAGES, isUniversity } from "@/lib/academic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Edit level") };
}

export default async function EditLevelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const { api, can } = await getContext();
  if (!can("members.manage")) notFound();
  const structure = await api.academicStructure();
  const found = structure.levels.find((l) => l.id === id);
  if (!found) notFound();
  const { groups: _groups, ...level } = found;
  const university = isUniversity(structure.type);
  const stages: AcademicStage[] = structure.stages?.length ? structure.stages : STAGES;

  return (
    <>
      <PageHeader back={{ href: "/classes", label: university ? t("Years & sections") : t("Classes & levels") }} icon={<Pencil />} title={university ? t("Edit year") : t("Edit level")} description={level.name} />
      <LevelForm level={level} stages={stages} university={university} backHref="/classes" />
    </>
  );
}
