import Link from "next/link";
import { notFound } from "next/navigation";
import { Hourglass } from "lucide-react";
import { ApiError, type ExamAttempt } from "@educloud/api-client";
import { Card, buttonClass } from "@educloud/ui";
import { requireAudience } from "@educloud/portal-kit/session";
import { getT } from "@educloud/ui/locale";
import { ExamPlayer } from "@/components/exam/exam-player";
import { ExamResults } from "@/components/exam/exam-results";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Online exam") };
}

export default async function ExamAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const t = await getT();
  const { attemptId } = await params;
  const { api, workspace } = await requireAudience("learner", "/staff-account");
  const isParent = workspace.role === "parent";

  // The server hands in an overdue attempt when it is opened, so this is always current.
  const attempt: ExamAttempt = await api.examAttempt(attemptId).catch((error) => {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  });

  if (attempt.status === "in_progress") {
    if (!isParent) return <ExamPlayer attempt={attempt} />;
    return (
      <Card className="mx-auto max-w-xl text-center">
        <Hourglass className="mx-auto mb-3 h-8 w-8 text-warning" />
        <p className="font-display text-lg font-semibold">{attempt.exam.title}</p>
        <p className="mt-1 text-sm text-ink-muted">{t("Your child is taking this exam right now. Results appear here once it's handed in.")}</p>
        <Link href={`/exams/${attempt.exam.id}`} className={`${buttonClass("secondary")} mt-5`}>
          {t("Exam overview")}
        </Link>
      </Card>
    );
  }

  const overview = isParent ? null : await api.examOverview(attempt.exam.id).catch(() => null);
  return <ExamResults attempt={attempt} canRetake={!!overview?.can_start} isParent={isParent} />;
}
