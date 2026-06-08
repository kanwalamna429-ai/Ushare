# UShàre Social Poster

A universal social media auto-posting tool. Manage campaigns, schedule posts, connect platforms, and generate AI content — all from a single admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port set via workflow)
- `pnpm --filter @workspace/social-poster run dev` — run the frontend (port set via workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui (at `artifacts/social-poster/`)
- API: Express 5 (at `artifacts/api-server/`)
- DB: PostgreSQL + Drizzle ORM
- AI: Google Gemini (`@google/genai`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/api-zod/src/generated/api.ts` — Zod validators (generated)
- `lib/api-client-react/src/generated/` — React Query hooks (generated)
- `lib/db/src/schema/` — Drizzle ORM table definitions
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/social-poster/src/pages/` — React pages

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Replit built-in or Supabase) |
| `ADMIN_USERNAME` | Admin login username (default: `admin`) |
| `ADMIN_PASSWORD` | Admin login password (default: `changeme`) |
| `GEMINI_API_KEY` | Google Gemini API key for AI content generation |
| `SESSION_SECRET` | Session signing secret |

## Admin Credentials

Default credentials (override via env vars):
- Username: `admin`
- Password: `changeme`

You can also change username and password from **Settings → Admin Username** and **Settings → Security** in the app UI.

## Deploy to Render

A `render.yaml` file is included for Render deployment. Steps:
1. Create a Render account and connect your GitHub repo
2. Render will detect `render.yaml` and create two services:
   - `ushare-api` — Express API server
   - `ushare-frontend` — Static React site
3. Set the required env vars in the Render dashboard for `ushare-api`:
   - `DATABASE_URL` (your Supabase connection string)
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `GEMINI_API_KEY`
4. Update the rewrite URL in `render.yaml` with the actual `ushare-api` service URL after first deploy

## Architecture decisions

- Auth uses session cookies + env var credentials (no database users table)
- Username and password can be overridden at runtime via the Settings UI (persists for process lifetime; set env vars for permanent changes)
- Gemini API is used for AI content generation; gracefully degrades if key is missing
- Scheduler runs every minute via node-cron, picks up active campaigns and processes pending URLs

## Gotchas

- After any DB schema change, run `pnpm --filter @workspace/db run push`
- The `render.yaml` rewrite rule uses a placeholder URL — update it after Render assigns a URL to `ushare-api`
- `ADMIN_USERNAME`/`ADMIN_PASSWORD` env var changes require a server restart; UI changes only persist for the current process

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
