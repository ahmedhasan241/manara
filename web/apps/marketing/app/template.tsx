import { PageTransition } from "@educloud/ui";

/** Re-mounts on every navigation, giving each page a soft enter animation. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
