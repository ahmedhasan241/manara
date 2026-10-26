import { notFound } from "next/navigation";
import { Layers } from "lucide-react";
import type { AcademicStage } from "@educloud/api-client";
import { PageHeader } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getT } from "@educloud/ui/locale";
import { LevelForm } from "@/components/structure-editor";
import { STAGES, isUniversity } from "@/lib/academic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Add a level") };
}

export default async function NewLevelPage() {
  const t = await getT();
  const { api, can } = await getContext();
  if (!can("members.manage")) notFound();
  const structure = await api.academicStructure();
  const university = isUniversity(structure.type);
  const stages: AcademicStage[] = structure.stages?.length ? structure.stages : STAGES;
  const nextPosition = Math.max(0, ...structure.levels.map((l) => l.position + 1));

  return (
    <>
      <PageHeader
        back={{ href: "/classes", label: university ? t("Years & sections") : t("Classes & levels") }}
        icon={<Layers />}
        title={university ? t("Add a year") : t("Add a level")}
        description={university ? t("A year of study, e.g. Year 1 in the Engineering department.") : t("A grade or level, e.g. Grade 10. Classes belong to a level.")}
      />
      <LevelForm stages={stages} university={university} nextPosition={nextPosition} backHref="/classes" />
    </>
  );
}
