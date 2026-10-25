"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Radio } from "lucide-react";
import type { LiveLesson } from "@educloud/api-client";
import { getEcho } from "./echo";
import { useT } from "@educloud/ui";

interface LessonEvent {
  id: string;
  course_id: string;
  title: string;
  status: LiveLesson["status"];
}

/**
 * A banner across the top of every page while any of your lessons is live.
 * Updates the moment a lesson starts or ends, via Reverb.
 */
export function LiveNowBanner({ userId, initial }: { userId: number; initial: LiveLesson[] }) {
  const t = useT();
  const router = useRouter();
  const [live, setLive] = useState<LessonEvent[]>(initial);

  useEffect(() => setLive(initial), [initial]);

  useEffect(() => {
    const channel = getEcho()?.private(`users.${userId}`);
    channel?.listen(".lesson.updated", (e: LessonEvent) => {
      setLive((current) => (e.status === "live" ? [...current.filter((l) => l.id !== e.id), e] : current.filter((l) => l.id !== e.id)));
      router.refresh();
    });
    return () => {
      channel?.stopListening(".lesson.updated");
    };
  }, [router, userId]);

  return (
    <AnimatePresence>
      {live.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="relative overflow-hidden bg-live-500 text-white">
            <div aria-hidden className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_25%,rgb(255_255_255_/_0.18)_50%,transparent_75%)] bg-[length:200%_100%]" />
            <Link href={live.length === 1 ? `/live/${live[0]!.id}` : "/live"} className="relative mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 text-sm font-semibold sm:px-8">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20">
                <Radio className="h-4 w-4 animate-pulse" />
              </span>
              <span className="min-w-0 flex-1 truncate">
                {live.length === 1 ? t("Live now: {title}", { title: live[0]!.title }) : t("{count} lessons are live now", { count: live.length })}
              </span>
              <span className="hidden items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-live-600 sm:inline-flex">
                {t("Join")}{" "}<ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </span>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
