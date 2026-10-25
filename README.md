# Manara

Multi-tenant SaaS for teachers and lecturers, schools and universities — with a free
portal for students and their families: grades, attendance, live lessons and recordings,
course materials, encrypted messaging, notifications, reports and analytics.

| Project | Who uses it | Folder | Port (dev) |
|---|---|---|---|
| API (Laravel 13) | every app | `api/` | 8001 |
| Product website | visitors: features, audiences, packages, FAQ | `web/apps/marketing` | 3010 |
| Platform admin | Manara staff: schools, all users, subscriptions, packages, website text | `web/apps/platform-admin` | 3001 |
| Subscriber websites | the public, per school | `web/apps/school-site` | 3002 |
| Staff portal | teachers, doctors/lecturers, school & university admins | `web/apps/school-portal` | 3003 |
| Learner & family portal | students, parents and guardians | `web/apps/learner-portal` | 3004 |
| Mobile app (Flutter) | students, teachers, parents | `mobile/` | — |

Shared web code lives in `web/packages`: `ui` (design system), `api-client` (typed API
calls) and `portal-kit` (session, messaging, live lessons and recordings used by both
portals). Each portal sends people to the other when their role belongs there.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it fits together and
[docs/ROADMAP.md](docs/ROADMAP.md) for what's built and what's next.

## Run it locally

Requirements: **PHP 8.4** (with the `pdo_sqlite`, `intl`, `mbstring` and `openssl`
extensions), **Composer 2**, **Node 22+**, and Flutter 3.32+ for the mobile app. No
database server is needed: development uses SQLite.

From the repository root:

```bash
npm run setup     # once: packages, .env files, keys, database with demo data
npm run dev       # starts everything; Ctrl+C stops it all
```

`npm run setup` is safe to run again (it keeps your data); `npm run setup -- --fresh`
wipes the database and reseeds the demo data.

`npm run dev` starts these in one terminal, each line prefixed with its name:

| Service | Address |
|---|---|
| API | http://localhost:8001 |
| WebSockets (Reverb) | ws://localhost:8080 |
| Queue worker and scheduler | (background) |
| Product website | http://localhost:3010 |
| Platform admin | http://localhost:3001 |
| School websites | http://localhost:3002/greenwood |
| Staff portal | http://localhost:3003 |
| Learner & family portal | http://localhost:3004 |

Run part of it with `npm run dev -- backend` (API, WebSockets, queue, scheduler),
`npm run dev -- web` (the five web apps), or any names: `npm run dev -- api learner portal`.
If a port is already taken (say you already run the API yourself) that service is
skipped with a note and the rest still start.

The API runs as four PHP workers with OPcache behind one port, because
`php artisan serve` answers one request at a time and the web apps call the API in
parallel. Change the count with `MANARA_API_WORKERS`, or the port with
`MANARA_API_PORT` (then set `API_URL` in each `web/apps/*/.env.local` to match).

The ports avoid 3000 and 8000, which other tools often use. Each web app reads
`.env.local` (created from its `.env.example` by setup): `API_URL`, the addresses of
the other apps, and for the two portals the Reverb key from `api/.env`.

Run the checks with `npm test` (API tests and web type checks).

### Online lessons (Zoom or Jitsi)

Without configuration, lessons use free Jitsi Meet rooms and teachers upload recordings
themselves. For Zoom with automatic cloud recording:

1. In the Zoom App Marketplace create a **Server-to-Server OAuth** app with the scopes
   `meeting:write:admin` and `recording:read:admin`.
2. Add an event subscription for `meeting.started`, `meeting.ended` and
   `recording.completed`, pointing at `https://<api-host>/api/v1/webhooks/zoom`
   (Zoom validates the URL automatically).
3. Set `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` and
   `ZOOM_WEBHOOK_SECRET` in `api/.env`. Recordings are copied into `RECORDINGS_DISK`
   (use `s3` in production) so they outlive Zoom's retention.

Uploads go through PHP, so raise `upload_max_filesize`/`post_max_size` (and your proxy's
body limit) to allow large lecture videos.

### Push notifications

Create a Firebase project, download a service-account JSON, and set `FCM_PROJECT_ID`
and `FCM_CREDENTIALS` (path to the JSON) in `api/.env`. Without them push is skipped
and everything else works. For the mobile app, add `google-services.json` (Android) and
`GoogleService-Info.plist` (iOS) from the same Firebase project.

### Demo accounts (from the seeder)

All use the password `password`.

| Email | Role | Sign in at |
|---|---|---|
| `owner@greenwood.test` | School owner (Greenwood High School) | staff portal :3003 |
| `teacher@greenwood.test` | Teacher | staff portal :3003 |
| `student@greenwood.test` | Student | learner portal :3004 |
| `parent@greenwood.test` | Parent of the student | learner portal :3004 |
| `admin@educloud.test` | Platform admin (must turn on two-factor first) | admin :3001 |

Locally all apps share `localhost` cookies, so signing in on one portal signs you in on
the others; use a private window to be two people at once. In production, give each
app its own domain and set `NEXT_PUBLIC_STAFF_PORTAL_URL`, `NEXT_PUBLIC_LEARNER_PORTAL_URL`,
`NEXT_PUBLIC_MARKETING_URL` and `NEXT_PUBLIC_SCHOOL_SITE_URL` so links between them work.

The Greenwood public site is at http://localhost:3002/greenwood.

### Mobile

The platform folders aren't committed yet. Generate them once:

```bash
cd mobile
flutter create . --platforms=android,ios --org app.educloud
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:8001 \
  --dart-define=REVERB_KEY=<REVERB_APP_KEY from api/.env> --dart-define=REVERB_HOST=10.0.2.2
```

Without `REVERB_KEY` the chat still works but checks for new messages every 30 seconds.
For local HTTP on Android, allow cleartext traffic to your dev host (for example
`android:usesCleartextTraffic="true"` in a debug-only manifest).

Encryption uses libsodium through the `sodium` package, which compiles it with a build
hook (Flutter 3.44+). `test/e2e_compat_test.dart` checks the app against a fixture
made by the web client; regenerate it after changing either side:

```bash
cd web
node --experimental-strip-types packages/portal-kit/scripts/make-e2e-fixture.ts ../mobile/test/fixtures/web_e2e_fixture.json
```

Then for biometric unlock add `NSFaceIDUsageDescription` to `ios/Runner/Info.plist`, and on
Android make `MainActivity` extend `FlutterFragmentActivity` and add the
`USE_BIOMETRIC` permission.

## Tests

```bash
npm test                                  # API tests + web type checks
cd web && npm run build                   # production builds
cd mobile && flutter test
```
