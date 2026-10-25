import { getT } from "@educloud/ui/locale";
export default async function NotFound() {
  const t = await getT();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-semibold">{t("School not found")}</h1>
      <p className="text-ink-muted">{t("Check the web address and try again.")}</p>
    </main>
  );
}
