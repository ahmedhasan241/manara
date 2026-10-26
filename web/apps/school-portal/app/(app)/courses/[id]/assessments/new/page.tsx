import { notFound } from "next/navigation";
import { ListChecks } from "lucide-react";
import { ApiError } from "@educloud/api-client";
import { PageHeader } from "@educloud/ui";
import { getContext } from "@educloud/portal-kit/session";
import { getT } from "@educloud/ui/locale";
import { AssessmentForm } from "@/components/assessment-form";
import { createAssessment } from "@/app/actions";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Add an assessment") };
}

export default async function NewAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const { api, can } = await getContext();
  if (!can("grades.write")) notFound();
  const course = await api.course(id).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const back = `/courses/${id}?tab=grades`;

  return (
    <>
      <PageHeader back={{ href: back, label: course.title }} icon={<ListChecks />} title={t("Add an assessment")} description={t("Assignments, quizzes and exams for the gradebook.")} />
      <AssessmentForm action={createAssessment.bind(null, id)} backHref={back} />
    </>
  );
}
