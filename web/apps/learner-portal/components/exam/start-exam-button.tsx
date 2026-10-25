"use client";

import { ArrowRight, Loader2, PlayCircle } from "lucide-react";
import { bannerButtonClass, cn, useT } from "@educloud/ui";
import { startExamAction } from "@/app/(app)/exams/actions";
import { useMutation } from "@/components/use-mutation";

/** Start or continue an exam (the server returns the open attempt if there is one). */
export function StartExamButton({ assessmentId, resume }: { assessmentId: string; resume: boolean }) {
  const t = useT();
  const { run, pending } = useMutation();

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() =>
        run(() => startExamAction(assessmentId), {
          loading: resume ? t("Opening your exam…") : t("Starting your exam…"),
          redirected: resume ? undefined : t("Exam started. Good luck!"),
        })
      }
      className={cn(bannerButtonClass("solid"), "h-12 px-6 text-base disabled:opacity-70")}
    >
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : resume ? <ArrowRight className="h-5 w-5 rtl:rotate-180" /> : <PlayCircle className="h-5 w-5" />}
      {resume ? t("Continue exam") : t("Start exam")}
    </button>
  );
}
