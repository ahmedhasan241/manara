import { Suspense } from "react";
import { MotionProvider } from "@educloud/ui";
import { AuthDialog } from "@/components/site/auth-dialog";

/** Full-screen course player: no site header or footer. */
export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      {children}
      <Suspense>
        <AuthDialog />
      </Suspense>
    </MotionProvider>
  );
}
