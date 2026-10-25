# Deploying Manara

- **API** (Laravel + WebSockets + queue + scheduler) → **Railway**, one service built from
  `api/Dockerfile`, with a MySQL database and a volume for uploads.
- **Five web apps** (Next.js) → **Vercel**, one project each.

Deploy the API first: the web apps need its address when they build.

## 1. Put the code on GitHub

Create an empty **private** repository on github.com, then from this folder:

```bash
git remote add origin https://github.com/<you>/manara.git
git push -u origin main
```

## 2. API on Railway

1. railway.com → **New Project → Deploy from GitHub repo** → pick the repository.
2. Open the new service → **Settings**:
   - **Root Directory**: `/api` (Railway then finds `api/railway.json` and the Dockerfile)
   - **Networking → Generate Domain** (port `8080`). Note it, e.g. `manara-api.up.railway.app`.
3. In the project press **+ New → Database → MySQL**.
4. On the API service: **+ Volume**, mount path `/app/storage` (keeps uploads and logs).
5. API service → **Variables** (Raw editor), paste and fill in:

```env
APP_NAME=Manara
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:...                     # run: php api/artisan key:generate --show
APP_URL=https://manara-api.up.railway.app
APP_LOCALE=ar
APP_FALLBACK_LOCALE=en

DB_CONNECTION=mysql
DB_URL=${{MySQL.MYSQL_URL}}

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local
RECORDINGS_DISK=local
MAIL_MAILER=log
LOG_LEVEL=info

# Web app addresses (fill in after step 3; comma separated, no trailing slash)
FRONTEND_URLS=https://manara-marketing.vercel.app,https://manara-admin.vercel.app,https://manara-site.vercel.app,https://manara-portal.vercel.app,https://manara-learner.vercel.app
LEARNER_URL=https://manara-learner.vercel.app
TENANT_ROOT_DOMAIN=manara.invalid

# WebSockets. The API talks to Reverb inside the container; browsers use the public domain.
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=123456                   # any number
REVERB_APP_KEY=<random 20 lowercase letters/digits>
REVERB_APP_SECRET=<random 20 lowercase letters/digits>
REVERB_HOST=127.0.0.1
REVERB_PORT=6001
REVERB_SCHEME=http

# Seeds plans, the platform admin and the Greenwood demo school once.
SEED_DEMO_DATA=true
JITSI_DOMAIN=https://meet.jit.si
```

6. Deploy. When it's up, `https://<api-domain>/up` shows a green page.

> The demo accounts all use the password `password`. On a public site, sign in and
> change them (or remove them) straight away.

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
API_URL=https://manara-api.up.railway.app
NEXT_PUBLIC_MARKETING_URL=https://manara-marketing.vercel.app
NEXT_PUBLIC_STAFF_PORTAL_URL=https://manara-portal.vercel.app
NEXT_PUBLIC_LEARNER_PORTAL_URL=https://manara-learner.vercel.app
NEXT_PUBLIC_SCHOOL_SITE_URL=https://manara-site.vercel.app
NEXT_PUBLIC_PORTAL_URL=https://manara-portal.vercel.app
NEXT_PUBLIC_REVERB_KEY=<same as REVERB_APP_KEY>
NEXT_PUBLIC_REVERB_HOST=manara-api.up.railway.app
NEXT_PUBLIC_REVERB_PORT=443
NEXT_PUBLIC_REVERB_SCHEME=https
```

If Vercel gives a project a different address than the suggested name, update these
variables (and `FRONTEND_URLS` on Railway) and redeploy.

The Greenwood demo school is then at `https://manara-site.vercel.app/greenwood`.

## Known limits

- **Large video uploads from the staff portal**: the upload goes through a Vercel function,
  which accepts at most 4.5 MB per request. Use "Paste a link" for recordings, or Zoom
  cloud recording (see README), until uploads go straight to the API.
- Mobile push needs Firebase (`FCM_PROJECT_ID`, `FCM_CREDENTIALS`) — optional.
- Railway costs about $5/month for this setup; Vercel's Hobby plan is free.
