import { Bell, BookOpen, GraduationCap, Sparkles, Users, Video } from "lucide-react";
import {
  Alert,
  ArchPhoto,
  Avatar,
  Badge,
  BarChart,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LiveDot,
  PageHeader,
  Select,
  Skeleton,
  Sparkline,
  Spotlight,
  Stagger,
  StaggerItem,
  StatCard,
  ThemeToggle,
} from "@educloud/ui";
import { ConfettiButton } from "@/components/confetti-button";
import { getT } from "@educloud/ui/locale";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Design system") };
}

/**
 * A living reference of the Manara UI kit: palettes, typography, components,
 * effects and 3D. Switch palette and mode to see every token change at once.
 */
export default async function DesignSystemPage() {
  const t = await getT();
  return (
    <>
      <PageHeader
        eyebrow={t("Product")}
        icon={<Sparkles />}
        title={t("Design system")}
        description={t("Every token and component used across the website, portals and admin. Change the palette or mode below — the whole kit updates live.")}
      />

      <section className="mb-10 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card className="space-y-5">
          <h2 className="font-display text-lg font-bold">{t("Theme")}</h2>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">{t("Mode")}</p>
            <ThemeToggle />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">{t("Brand scale")}</p>
            <div className="flex overflow-hidden rounded-xl">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => (
                <div key={step} className="h-12 flex-1" style={{ background: `var(--brand-${step})` }} title={`brand-${step}`} />
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              {["--surface", "--surface-2", "--line", "--ink-muted", "--nav"].map((v) => (
                <div key={v} className="flex-1">
                  <div className="h-8 rounded-lg ring-1 ring-line" style={{ background: `var(${v})` }} />
                  <p className="mt-1 truncate font-mono text-[10px] text-ink-muted">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="band-peach relative grid min-h-80 items-center gap-6 overflow-hidden p-6 sm:grid-cols-[1fr_11rem]">
          <div>
            <h2 className="font-display text-2xl font-bold">{t("Photography")}</h2>
            <p className="mt-1 max-w-xs text-sm text-ink-muted">{t("Real students, teachers and families in an arch frame with a dashed ring.")}</p>
          </div>
          <ArchPhoto photo="studentNotebook" alt="" className="max-w-[11rem]" />
        </Card>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-lg font-bold">{t("Typography")}</h2>
        <Card className="space-y-3">
          <p className="text-display-xl font-display font-bold">
            <span className="text-gradient">{t("Display XL")}</span>
          </p>
          <p className="text-display-lg font-display font-bold">{t("Display large — fluid from phone to 4K")}</p>
          <p className="text-display-md font-display font-bold">{t("Display medium")}</p>
          <p className="max-w-2xl text-ink-muted">
            {t("Body text uses Plus Jakarta Sans, with IBM Plex Sans Arabic for Arabic. Headlines scale smoothly with the viewport, so pages feel balanced on every screen. مرحبًا بالعالم — 你好，世界 — Bonjour le monde.")}
          </p>
        </Card>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-lg font-bold">{t("Buttons & badges")}</h2>
        <Card className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Button>{t("Primary")}</Button>
            <Button variant="secondary">{t("Secondary")}</Button>
            <Button variant="soft">{t("Soft")}</Button>
            <Button variant="ghost">{t("Ghost")}</Button>
            <Button variant="live">
              <Video className="h-4 w-4" /> {t("Join live")}
            </Button>
            <Button variant="danger">{t("Danger")}</Button>
            <ConfettiButton />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{t("Neutral")}</Badge>
            <Badge tone="brand">{t("Brand")}</Badge>
            <Badge tone="accent">{t("Accent")}</Badge>
            <Badge tone="success">{t("Success")}</Badge>
            <Badge tone="warning">{t("Warning")}</Badge>
            <Badge tone="danger">{t("Danger")}</Badge>
            <Badge tone="live">{t("Live")}</Badge>
            <span className="inline-flex items-center gap-2 text-sm">
              <LiveDot /> {t("Live dot")}
            </span>
            <Avatar name="Amina Rahman" />
            <Avatar name="Dr. Karim Haddad" />
            <Avatar name="Lina Chen" />
          </div>
        </Card>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-lg font-bold">{t("Stats & data")}</h2>
        <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StaggerItem>
            <StatCard label={t("Students")} value={1248} icon={<Users className="h-5 w-5" />} />
          </StaggerItem>
          <StaggerItem>
            <StatCard label={t("Courses")} value={86} icon={<BookOpen className="h-5 w-5" />} accent="accent" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label={t("Average")} value="86%" icon={<GraduationCap className="h-5 w-5" />} accent="amber" />
          </StaggerItem>
          <StaggerItem>
            <StatCard label={t("Live now")} value={3} icon={<Video className="h-5 w-5" />} accent="live" />
          </StaggerItem>
        </Stagger>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <p className="mb-3 font-semibold">{t("Bar chart")}</p>
            <BarChart label={t("Attendance by course")} max={100} format={(v) => `${v}%`} data={[{ label: t("Mathematics"), value: 94 }, { label: t("Physics"), value: 81 }, { label: t("Literature"), value: 88 }]} />
          </Card>
          <Card>
            <p className="mb-3 font-semibold">{t("Sparkline")}</p>
            <Sparkline label={t("Grade trend")} values={[62, 70, 68, 75, 81, 79, 88]} />
          </Card>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-lg font-bold">{t("Effects")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card interactive className="h-full">
            <Sparkles className="mb-3 h-6 w-6 text-brand-500" />
            <p className="font-semibold">{t("Lift card")}</p>
            <p className="text-sm text-ink-muted">{t("Rises a little and sharpens its border on hover.")}</p>
          </Card>
          <Spotlight className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-soft)]">
            <Bell className="mb-3 h-6 w-6 text-accent-500" />
            <p className="font-semibold">{t("Spotlight")}</p>
            <p className="text-sm text-ink-muted">{t("A soft light follows your cursor.")}</p>
          </Spotlight>
          <div className="gradient-border rounded-[var(--radius-card)] bg-surface p-5">
            <GraduationCap className="mb-3 h-6 w-6 text-brand-500" />
            <p className="font-semibold">{t("Gradient border")}</p>
            <p className="text-sm text-ink-muted">{t("Animated border in palette colours.")}</p>
          </div>
        </div>
      </section>

      <section className="mb-10 grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-display text-lg font-bold">{t("Forms")}</h2>
          <Field label={t("Full name")} htmlFor="ds-name" hint={t("As it should appear on certificates.")}>
            <Input id="ds-name" placeholder={t("Amina Rahman")} />
          </Field>
          <Field label={t("Role")} htmlFor="ds-role">
            <Select id="ds-role">
              <option>{t("Teacher")}</option>
              <option>{t("Lecturer")}</option>
            </Select>
          </Field>
          <Field label={t("Email")} htmlFor="ds-email" error={t("Please enter a valid email.")}>
            <Input id="ds-email" defaultValue="amina@" />
          </Field>
        </Card>
        <div className="space-y-4">
          <Alert tone="success">{t("Saved. Students have been notified.")}</Alert>
          <Alert tone="warning">{t("Attendance in Physics is below 80%.")}</Alert>
          <Alert>{t("Something went wrong. Please try again.")}</Alert>
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title={t("No courses yet")} description={t("Empty states guide people to the next step.")} />
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </section>
    </>
  );
}
