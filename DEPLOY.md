# Deploying Manara

- **API** (Laravel + WebSockets + queue + scheduler) → **Render**, one Docker service built
  from `api/Dockerfile`, with a Postgres database. Both are defined in `render.yaml`.
- **Five web apps** (Next.js) → **Vercel**, one project each.

Deploy the API first: the web apps need its address when they build.

## 1. Put the code on GitHub

Create an empty **private** repository on github.com, then from this folder:

```bash
git remote add origin https://github.com/<you>/manara.git
git push -u origin main
```

## 2. API on Render

1. dashboard.render.com → **New → Blueprint** → connect GitHub and pick the repository.
   Render reads `render.yaml` and proposes `manara-api` (web service) and `manara-db` (Postgres).
2. It asks for the two variables left blank; fill them once the Vercel addresses are known
   (a placeholder like `https://example.com` is fine for the first deploy):
   - `FRONTEND_URLS` — the five Vercel addresses, comma separated, no trailing slash
   - `LEARNER_URL` — the learner portal address
3. **Apply**. The first build takes about 10 minutes. When it's live,
   `https://manara-api.onrender.com/up` (your service's address) shows a green page.

Everything else (app key, database URL, Reverb keys, seeding the demo data once) is
set by the blueprint.

> The demo accounts all use the password `password`. On a public site, sign in and
> change them (or remove them) straight away.

**Free plan:** the API sleeps after 15 minutes without visitors (the next request takes
about a minute), the free database expires after 30 days, and uploaded files are lost on
each deploy. For a permanent site switch the service to *Starter* and the database to a
paid plan, and add a disk mounted at `/app/storage`.

The same Docker image also runs on Railway (`api/railway.json`) or any Docker host.

## 3. Web apps on Vercel

For **each** row below: vercel.com → **Add New → Project** → import the same GitHub
repository → set **Root Directory** to the folder → add the environment variables → Deploy.
Leave "Include files outside the root directory" on (the apps share `web/packages`).

| Project name (suggested) | Root Directory |
|---|---|
| `manara-marketing` | `web/apps/marketing` |
| `manara-admin` | `web/apps/platform-admin` |
| `manara-site` | `web/apps/school-site` |
| `manara-portal` | `web/apps/school-portal` |
| `manara-learner` | `web/apps/learner-portal` |

Environment variables (same for all five; the `REVERB` ones matter only for the two portals):

```env
API_URL=https://manara-api.onrender.com
NEXT_PUBLIC_MARKETING_URL=https://manara-marketing.vercel.app
NEXT_PUBLIC_STAFF_PORTAL_URL=https://manara-portal.vercel.app
NEXT_PUBLIC_LEARNER_PORTAL_URL=https://manara-learner.vercel.app
NEXT_PUBLIC_SCHOOL_SITE_URL=https://manara-site.vercel.app
NEXT_PUBLIC_PORTAL_URL=https://manara-portal.vercel.app
NEXT_PUBLIC_REVERB_KEY=42e5b655e0e004d1bbdd
NEXT_PUBLIC_REVERB_HOST=manara-api.onrender.com
NEXT_PUBLIC_REVERB_PORT=443
NEXT_PUBLIC_REVERB_SCHEME=https
```

If Vercel gives a project a different address than the suggested name, update these
variables (and `FRONTEND_URLS` on Render) and redeploy.

The Greenwood demo school is then at `https://manara-site.vercel.app/greenwood`.

## Known limits

- **Large video uploads from the staff portal**: the upload goes through a Vercel function,
  which accepts at most 4.5 MB per request. Use "Paste a link" for recordings, or Zoom
  cloud recording (see README), until uploads go straight to the API.
- Mobile push needs Firebase (`FCM_PROJECT_ID`, `FCM_CREDENTIALS`) — optional.
- Render's free plan limits are listed in step 2; Vercel's Hobby plan is free.
