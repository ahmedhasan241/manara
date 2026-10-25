export { loadContent, type SiteContent } from "@educloud/ui/product/server";

export const portals = {
  staff: process.env.NEXT_PUBLIC_STAFF_PORTAL_URL ?? "http://localhost:3003",
  learner: process.env.NEXT_PUBLIC_LEARNER_PORTAL_URL ?? "http://localhost:3004",
};
