import { Logo, rich } from "@educloud/ui";
import { getT } from "@educloud/ui/locale";

export default async function Home() {
  const t = await getT();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo className="text-xl" />
      <p className="max-w-md text-ink-muted">
        {rich(t("Subscriber websites are served at <code>{address}</code>. In development, open", { address: `your-school.${process.env.TENANT_ROOT_DOMAIN ?? "educloud.test"}` }), { code: (w) => <code>{w}</code> })}{" "}
        <a className="text-brand-600 underline" href="/greenwood">
          /greenwood
        </a>
        .
      </p>
    </main>
  );
}
