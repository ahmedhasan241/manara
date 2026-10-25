# Manara — Architecture

Manara is a multi-tenant SaaS for teachers, schools and universities: grades,
attendance, course materials, messaging, notifications, reports and analytics.

## Projects

| Folder | Stack | Who uses it | Purpose |
|---|---|---|---|
| `api/` | Laravel 13, PHP 8.4 | every client | Single REST API, multi-tenant, auth, RBAC, business logic |
| `web/apps/marketing` | Next.js 16, React 19 | public | Product website: audiences, features, packages, FAQ, sign-up; text from `/api/v1/marketing` |
| `web/apps/platform-admin` | Next.js 16, React 19 | Manara staff | Schools and teachers, every user, subscriptions, packages, website text, system health |
| `web/apps/school-site` | Next.js 16, React 19 | public, per tenant | Each subscriber's public website (`{slug}.manara.app`) |
| `web/apps/school-portal` | Next.js 16, React 19 | owners, admins, teachers/lecturers | Staff portal: courses, gradebook, attendance, live lessons, materials, messages, analytics |
| `web/apps/learner-portal` | Next.js 16, React 19 | students, parents/guardians | Learner & family portal: progress overview, grades, attendance, live lessons, recordings, messages; child switcher for parents |
| `web/packages/portal-kit` | React, Next.js | both portals | Session and role routing, encrypted messenger, live lessons and recordings UI, realtime |
| `web/packages/api-client` | TypeScript | all web apps | Typed fetch client for the API |
| `web/packages/ui` | React + Tailwind 4 | all web apps | Shared components, theme tokens, dark mode |
| `mobile/` | Flutter 3 | students, teachers, parents | iOS/Android app with offline sync and biometric unlock |

```
           ┌─────────────┐  ┌────────────────┐  ┌─────────────┐  ┌───────────────┐  ┌────────┐
           │  marketing  │  │ platform-admin │  │ school-site │  │ school-portal │  │ mobile │
           └──────┬──────┘  └───────┬────────┘  └──────┬──────┘  └───────┬───────┘  └───┬────┘
                  └─────────────────┴──── HTTPS / JSON ─┴─────────────────┴──────────────┘
                                               │
                                     ┌─────────▼─────────┐     ┌──────────────┐
                                     │   Laravel API     │────▶│ Reverb (WS)  │ real-time
                                     │  /api/v1/...      │     └──────────────┘
                                     └───┬─────┬─────┬───┘
                                MySQL/PG │     │Redis│ queues, cache    S3: files, backups
```

## Multi-tenancy

- **Single database, shared schema.** Every tenant-owned table has `tenant_id`.
  The `BelongsToTenant` trait adds a global scope and fills `tenant_id` on create,
  so a query can never read another tenant's rows by accident.
- The tenant is resolved by the `ResolveTenant` middleware from the
  `X-Tenant` header (apps, mobile) or the request subdomain (school sites).
- Tenant types: `teacher` (one educator), `school`, `university`. The type changes
  defaults (labels, terms vs semesters), not the data model.
- Why shared schema: cheapest to run, one migration path, scales well past
  thousands of tenants. Large customers can move to a dedicated database later by
  swapping the connection per tenant.

## Identity, security and privacy

- **Auth:** Laravel Sanctum bearer tokens for every client. Tokens are scoped to
  one tenant membership.
- **MFA:** TOTP (RFC 6238, any authenticator app) with recovery codes. Required
  for owners/admins once enabled by the tenant; optional for others.
- **Biometrics (mobile):** fingerprint/Face ID unlock the token stored in the
  secure keystore. The server never sees biometric data.
- **RBAC:** a user joins a tenant through `memberships` with one role:
  `owner`, `admin`, `teacher`, `student`, `parent`. Permissions per role live in
  `App\Enums\Role` and are checked with Gates (`Gate::authorize('grades.write')`).
  Students see only their own records. Parents follow one or more children through
  `guardianships`; the `X-Student` header picks which child a request is about (default:
  the first), and a child that isn't theirs is ignored.
- **Suspension:** platform staff can suspend any user; their tokens are revoked and
  every authenticated request is refused (`EnsureActiveUser`). Platform staff
  are flagged `is_platform_admin` and use separate `/platform/*` routes.
- **Encryption at rest:** sensitive columns (national IDs, phone, guardian data,
  notes) use Laravel `encrypted` casts (AES-256-GCM, app key). Storage disks and DB
  volumes are encrypted at the provider.
- **End-to-end encrypted messaging** (libsodium on every client):
  - Each user has one X25519 key pair. The API stores the public key and a backup of
    the private key encrypted with a key derived from the user's *messaging passphrase*
    (Argon2id → XSalsa20-Poly1305). The server can't open it.
  - Each message gets a fresh XChaCha20-Poly1305 key. The body is encrypted once; the
    message key is sealed (`crypto_box_seal`) to every participant's public key and
    stored in `messages.keys`. The API checks that every participant with a key got
    a copy, so no one is silently left out.
  - **Chat backup and multi-device sync:** history stays on the server as ciphertext
    and syncs to any device; entering the passphrase on a new device restores the key
    and therefore the whole history. Users can also download an encrypted backup file.
  - Push alerts for messages never contain message text, only the sender.
  - Trade-off: no forward secrecy (a leaked private key exposes past messages). A
    Signal-style ratchet can replace the per-message sealing later without changing
    the rest of the system.
- **Audit log:** every write on academic records goes to `activity_logs`
  (who, what, when, IP). Users can view their own login/security activity.
- **GDPR:** data export (`/me/export`), account deletion with a 30-day grace
  period, consent records, data processing per tenant region, retention settings.

## Core domain

```
Tenant ─┬─ Membership(user, role) ─ User
        ├─ AcademicTerm
        ├─ Course ─┬─ Enrollment(student)
        │          ├─ Assessment ─ Grade(student, score)
        │          ├─ ClassSession ─ Attendance(student, status)
        │          └─ Material(file, visibility)
        ├─ Announcement / Notification
        ├─ Conversation ─ Message (E2E ciphertext)
        ├─ ReportSchedule ─ GeneratedReport
        └─ Subscription ─ Plan
```

## Offline sync

Mobile and the portal (PWA) keep a local store. Writes made offline get a
client-generated UUID and are queued.

- `GET  /api/v1/sync/pull?since=<cursor>` returns everything changed since the
  cursor (attendance, grades, materials metadata, announcements) plus a new cursor.
- `POST /api/v1/sync/push` takes a batch of changes keyed by UUID. Each change is
  idempotent; conflicts resolve **last-writer-wins by `client_updated_at`**, and
  the API returns rejected changes with the server version.

## Real-time and notifications

- Laravel Reverb (WebSockets) broadcasts on one private channel per user,
  `users.{id}`: new messages, grades, announcements and system alerts. Channel auth
  is `POST /api/broadcasting/auth` with the Sanctum token (the portal proxies it so
  the token stays in an httpOnly cookie). The portal also re-syncs every minute, so
  nothing is lost while the socket is down.
- Notifications go out through database (in-app bell), broadcast (live toast),
  mail (urgent announcements, system alerts) and push via FCM HTTP v1 (grades,
  important announcements, deadlines, messages, system alerts). Each conversation
  can be muted per user.
- Platform staff get a critical alert when a queued job fails (at most once per job
  type every 10 minutes).

## Online lessons

```
teacher schedules ──▶ VideoProvider.createMeeting (Zoom API / Jitsi room)
                      notify students + parents (in-app, email)
15 min before ──────▶ lessons:tick (scheduler, every minute) → "starting soon" push
host starts ────────▶ status live (button or Zoom meeting.started webhook)
                      broadcast lesson.updated → "Live now" banner, push "Live now"
student joins ──────▶ POST /join records attendee, returns join URL (open 10 min early)
lesson ends ────────▶ status ended (button, webhook, or closed 2 h after its slot)
                      class session + attendance created: joined = present
recording ready ────▶ Zoom recording.completed → DownloadZoomRecording job → storage
                      or teacher upload / link → published → students notified
students watch ─────▶ POST /play → signed stream URL (4 h), view counted
```

- Providers live behind `App\Services\Video\VideoProvider`; `VIDEO_PROVIDER` picks one,
  defaulting to Zoom when its credentials are set. Host links and passcodes are
  encrypted at rest and only returned to staff.
- Zoom webhooks are verified with the `x-zm-signature` HMAC and a 5-minute timestamp
  window; recording downloads are idempotent per Zoom file id.

## Reports and analytics

- On-demand exports in CSV and PDF (grades, attendance, engagement).
- `ReportSchedule` rows (daily/weekly/monthly) are run by the scheduler and
  emailed to admins; files are kept in storage.
- Portal analytics: grade trends per student/course over time, attendance rate,
  at-risk students. Platform analytics: active tenants, MRR, engagement, API health.

## Frontend conventions

- Next.js App Router, server components by default, Tailwind 4, shared `ui` package.
- **Design system (`@educloud/ui`)** — browse it live at `/design` in the platform admin.
  - Two independent theme switches on `<html>`: mode (`.dark`; light/dark/system) and
    palette (`data-palette`: Nebula, Aurora, Ocean, Sunset, Sakura, Ember). Each palette
    sets the brand scale, accent, sidebar colours and glow; brand-500 keeps white text at
    WCAG AA. `ThemeScript` (server component) applies both before first paint. Apps pick
    a default palette (admin: Ocean, learner portal: Sakura, others: Nebula); people
    change it from the Appearance menu, the command palette or Settings.
  - Fluid type (`text-display-xl/lg/md`), glass, gradient text and animated gradient
    borders, palette-tinted backgrounds.
  - Motion (`motion` library): page transitions, staggered lists, count-ups, tilt cards,
    cursor spotlights, magnetic buttons, rotating words, marquee, confetti. All honour
    `prefers-reduced-motion`; cursor effects switch off on touch screens.
  - 3D (`@educloud/ui/three`): a three.js scene in palette colours, loaded on demand,
    paused off-screen, with a CSS fallback when WebGL or motion isn't available.
- **App shell:** collapsible sidebar; glass top bar with breadcrumb, ⌘K/Ctrl+K command
  palette (pages, courses, quick actions, theme and palette switching), language,
  appearance, notifications and account menus; on phones a compact top bar, drawer and
  bottom tab bar with safe-area padding.
- **Languages:** English, العربية, Français, Español, Português, 中文. The locale comes
  from the `locale` cookie, else `Accept-Language`; `<html lang dir>` is set on the
  server and the whole shell mirrors for right-to-left. The shell and navigation are
  translated everywhere; page bodies are translated progressively (see ROADMAP).
- WCAG 2.2 AA: semantic HTML, focus states, contrast-checked tokens, reduced motion.
- Mobile-first layouts tested at 375px, 768–800px and 1200–1440px; the portals are
  installable as PWAs.

## Operations

- CI (GitHub Actions): PHP tests (Pest/PHPUnit), Pint, TypeScript typecheck,
  lint and build for each web app, `flutter analyze` and `flutter test`.
- Monitoring: Sentry for errors (API, web, mobile), Laravel Pulse for
  performance, `/up` health check for the load balancer.
- Database: managed MySQL 8 / PostgreSQL with daily automated backups and PITR;
  file storage on S3 with versioning.
- High availability: stateless API containers behind a load balancer, Redis for
  sessions/cache/queues, Horizon for queue workers.
- API docs: OpenAPI generated with Scribe (`php artisan scribe:generate`).
