# AGENTS.md — Hermy HQ / Tasheer HQ

Read this before touching anything in this repo. It's written for an agent with
zero prior context on this project.

## 1. What this is, in one paragraph

This directory (`/opt/hermyhq`) is a self-hosted Next.js dashboard — originally
an open-source template called **"Hermy HQ"** — that acts as a web "mission
control" cockpit for a separate, local AI agent called **Hermes**. The website
and Hermes never talk directly; they communicate through a shared Postgres
database used as a message bus, relayed by a small companion process called
the **bridge**. This instance belongs to **Waqar Younis Bhatti**, founder of
**Tasheer Digital** (a Pakistan-based digital marketing agency, est. March
2022, serving Pakistan + international clients incl. Australia/Canada). It is
deployed live at **https://agents.tasheerdigital.com**.

**Do not confuse this with `/root/.hermes`** — that's the actual Hermes agent
(a different, separate CLI-based system: its own config, skills, WhatsApp
integration, memory). This repo is only the *website* half of the pair.

## 2. Current project status (important — read before building)

- The app is running **exactly as cloned from the upstream template** — still
  branded "Hermy HQ", generic blue accent, Geist fonts, no client data.
- On 2026-09-20 an agent did a quick brand re-skin (gold accent, Montserrat/
  Inter fonts, "Tasheer HQ" text, seeded a Sintco Dental row) to explore
  customization. **This was fully rolled back same-day** at the user's
  request — see git history / this file — because the actual plan is a
  **complete custom UI rebuild**, using this repo only as the underlying
  foundation (Next.js/Prisma/bridge architecture, auth, message-bus plumbing),
  not as a skin to reskin.
- **Design system decision is OPEN and unresolved.** An agent asked the user
  whether the rebuild should be light-mode (matching Tasheer's actual brand
  system used in invoices/landing pages — see §7) or dark-mode (dashboard
  convention, adapting Tasheer's gold/black into a dark UI), and what the
  design-system phase should produce (tokens+primitives only, vs tokens +
  a visual `/style-guide` review page). The user did not pick an option and
  the conversation paused. **Do not assume an answer — ask, or check with the
  user, before committing to a theme direction.**
- No custom screens have been built yet. This is still pre-rebuild.

## 3. Directory location & services

- Project root: **`/opt/hermyhq`**
- Companion bridge: **`/opt/hermyhq/hermes-bridge`** (separate `package.json`,
  runs on the same machine as Hermes — currently the same VPS)
- Runs as two systemd services (both `User=root`):
  - **`hermyhq-web`** — `npx next start -H 127.0.0.1 -p 3300`, working dir
    `/opt/hermyhq`, env from `/opt/hermyhq/.env`. Reverse-proxied externally to
    `https://agents.tasheerdigital.com`.
  - **`hermyhq-bridge`** — `node /opt/hermyhq/hermes-bridge/bridge.mjs`,
    working dir `/opt/hermyhq/hermes-bridge`, env from
    `/opt/hermyhq/hermes-bridge/.env`.
  - Manage with `systemctl {status,restart} hermyhq-web` /
    `hermyhq-bridge`. Both `Restart=always`.
- Git remote: `https://github.com/sharbelxyz/hermes-agent-mission-control.git`
  (the upstream template's repo — this is a clone/fork on the VPS, not
  necessarily the user's own fork; check before pushing).
- No `AGENTS.md`/`CLAUDE.md` existed before this file.

## 4. Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 (`@theme inline` in `globals.css`), no component library — everything hand-built
- **Data:** Prisma ORM 6 + PostgreSQL (local Postgres on the VPS, db name `hermyhq`)
- **Auth:** NextAuth v4, Google OAuth provider only, gated by an email allowlist (`ALLOWED_EMAILS`) — see `src/middleware.ts`
- **Charts:** Recharts · **DnD:** react-dnd · **Icons:** lucide-react
- **Also present but currently unused:** `grammy` (Telegram bot framework — installed, no bot code written yet), `src-tauri/` (a Tauri desktop-app shell, unexplored)
- **Node:** v20+ required (22 recommended). Sharp is available in `node_modules` (useful for any image work without installing anything).

## 5. Architecture — the message bus

```
Hermy HQ (Next.js, this repo)  <---->  Postgres (shared)  <---->  hermes-bridge  <---->  hermes CLI (/root/.hermes)
```

- **Website → agent:** website inserts an `AgentRequest` row. Non-side-effecting
  requests are `queued`; anything with side effects is `awaiting_approval` and
  sits in the in-app **Approval Inbox** until a human approves it.
- **Bridge → agent:** the bridge polls Postgres for `queued`/`approved`
  requests, runs them via the `hermes` CLI, writes results back.
  **It never auto-runs `awaiting_approval` rows** — this is the safety
  boundary and must not be bypassed or worked around.
- **Agent → website:** the bridge mirrors Hermes's kanban board into
  `HermesTask`, cron/health into `DataStore`, its memory wiki into
  `HermesMemory`, and activity into `AgentEvent` — all read-only from the
  website's side.
- Nothing on the Hermes/bridge side is exposed to the internet; only outbound
  access to Postgres + the local `hermes` CLI is needed.

## 6. Data model (`prisma/schema.prisma`)

Roughly four families of models:

1. **Auth** — `Account`, `Session`, `User`, `VerificationToken` (standard NextAuth/Prisma adapter tables)
2. **Content OS / creative tooling** — `Draft`, `TweetMetric`, `Idea`, `ContentCalendar`, `YoutubeIdea`, `YoutubeScript`, `YoutubeFeedback`, `LongformScript`, `Article`, `SavedTitle`, `ContentRequest`, `BattleRoyaleBot`
3. **Hermes bus** — `AgentState`, `AgentBusMessage`, `AgentRequest`, `AgentEvent`, `HermesTask`, `HermesMemory`, `DataStore`, `Brief`, `Mission` (this is the message-bus plumbing described in §5 — treat carefully, it's load-bearing infra, not a feature to redesign casually)
4. **Client Pulse** — `ClientPulseClient`, `ClientPulseChat`, `ClientPulseMessage`, `ClientPulseAnalysis`, `ClientPulseAlert` (see §8 — this is the module most directly relevant to an agency rebuild, and it's currently an empty shell)

## 7. Tasheer Digital — brand & business context

Full design spec lives outside this repo, at
**`/root/.hermes/assets/tasheer_digital_design_system.md`** (YAML frontmatter
with exact color/type/spacing tokens + prose explanation), and a ready-to-drop
CSS variables file at
**`/root/.hermes/skills/creative/tasheer-digital-design-system/references/tasheer-tokens.css`**.
Read both before designing anything Tasheer-branded. Skill doc:
`/root/.hermes/skills/creative/tasheer-digital-design-system/SKILL.md`.

**Important caveat:** that design system was built for **light-mode marketing
collateral** (invoices, landing pages, proposals, decks) — it has no dark-mode
variant and no semantic status colors (success/warning/error). Hermy HQ's
current base is a **dark, data-dense dashboard**. Reconciling these two is the
open decision in §2 — don't silently pick one.

Key tokens, for quick reference:
- Primary: `#000000` (black) · Secondary/CTA: Golden-Orange, `#F5B84B` (brand value) / `#FCBF51` (implemented token) · Background: `#F8F9FA`
- Fonts: **Montserrat** (headlines, 600/700) + **Inter** (body/UI, 400/600), loaded via Google Fonts
- Radius: 4px buttons/inputs, 8px cards/modals · Base spacing unit: 8px
- Logo assets: `/root/.hermes/assets/logos/` — `logo-black.png`/`logo-white.png` (marks for light/dark bg), `logo-final.png` (hero, on black), `logo-240x240.png` (compact, with wordmark, for favicons/avatars)

Business facts (from Honcho memory — see §9 for how to query more):
- Founder: **Waqar Younis Bhatti**. Login: `waqaryounasbhatti@gmail.com` (matches `ALLOWED_EMAILS`).
- Agency specialty: Meta/Facebook & Instagram advertising, full-funnel.
- Services offered: Social Media Marketing, Meta/Facebook Ads, PPC, Lead Gen, SEO, Content Marketing, Email Marketing, Web Design & Dev, CRO, ORM, Digital Strategy.
- Verticals served: e-commerce, dental/medical, solar/energy, education, B2B/manufacturing, local retail, clothing/sportswear.
- Recurring client: **Sintco Dental** (dental supplies, Canadian market) — Meta ads + performance reporting.
- Waqar also runs a side business selling dental surgical instruments (forceps) via Shopify + the Dentira marketplace — unrelated to the agency but shares infra (n8n workflows named "Dentira..." exist).
- Expanding agency scope into bookkeeping/financial ops (client invoicing, expense tracking, monthly P&L, FBR/tax-prep), currently tracked manually in Google Sheets — a plausible future Hermy HQ module.

## 8. Client Pulse — the client-health board (currently a shell)

Route: `/client-pulse` (`src/app/client-pulse/page.tsx`), API:
`src/app/api/client-pulse/route.ts` + `.../map-chat/route.ts`.

Concept: per-client health scorecards (sentiment / response-SLA / check-in
cadence / renewal-risk, rolled into one `overallScore` + a
healthy/watch/needs_attention/urgent category), sourced from Telegram client
chats and Notion client records.

**What exists:** the Prisma models, the read-only API route, the frontend
page, and a `map-chat` admin route to link a Telegram chat to a client
(protected by `CLIENT_PULSE_ADMIN_SECRET`).

**What does NOT exist (needs building):**
1. A Notion → `ClientPulseClient` sync (pull client roster/PM/services/renewal dates). `NOTION_API_KEY` env var is defined but currently **blank** in `.env`.
2. Telegram ingestion → `ClientPulseChat`/`ClientPulseMessage`. The `grammy` Telegram bot library is installed but **no bot code has been written**. `.gitignore` has a pre-existing entry for `/services/client-pulse-bot/dist/`, implying the intended location for this — but `services/` doesn't exist yet.
3. An LLM scoring job that actually populates `ClientPulseAnalysis` (this is what the dashboard renders — without it, any seeded client shows with no score).

None of this pipeline lives in this repo currently; it would run either as a
new service here or (per the bus architecture) as a Hermes-side cron writing
directly to the shared Postgres.

## 9. Honcho memory (cross-session agent memory — extra context, not authoritative)

Business/personal context about Waqar and Tasheer Digital is stored in a
**Honcho** MCP memory system, separate from this repo. If the Honcho connector
is available in your session:
- Workspace **`hermes2`**, peer **`waqar-bhatti`** — the rich one (business
  facts, preferences, ongoing threads). Query with `get_peer_context` /
  `chat` tools.
- Workspace **`claude_code`** exists but was empty as of 2026-09-20 (no
  messages/conclusions) — don't expect Claude-Code-session history there.
- There is also a `plugin:honcho:honcho` MCP *plugin* (distinct from the
  "Honcho" *connector*) that has repeatedly **failed to connect** in past
  sessions — if you hit the same failure, use the connector, not the plugin.
- Treat Honcho output as useful context, not ground truth — verify anything
  load-bearing (e.g. exact client names/dates) with the user before acting on
  it.

## 10. Environment variables (`.env`, git-ignored — see `.env.example` for the annotated template)

Required core (site won't run without these): `DATABASE_URL`, `POSTGRES_URL`
(same Postgres, used by different tooling), `NEXTAUTH_URL`, `NEXTAUTH_SECRET`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAILS`,
`NEXT_PUBLIC_OWNER_NAME`, `NEXT_PUBLIC_BASE_URL`.

Hermes/bridge shared vars: `HERMES_BOARD`, `HERMES_BIN`, `HERMES_WIKI`,
`BRIEF_HOUR`, `INTERNAL_API_SECRET`, `CRON_SECRET`.

Optional, currently **blank** in production `.env` (features silently
disabled until filled in): `OPENAI_API_KEY`, `OPENROUTER_API_KEY`,
`XAI_API_KEY`, `BRAVE_API_KEY`, `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`,
`TWITTER_BEARER_TOKEN`, `NOTION_API_KEY`, `CLIENT_PULSE_ADMIN_SECRET`,
`HL_WALLET`.

**Never print, log, or commit real values from `.env`.** It's correctly
git-ignored; keep it that way. Correction for the record: an earlier session
mistakenly claimed `NOTION_API_KEY` and `CLIENT_PULSE_ADMIN_SECRET` were
"set" — they are not; both are blank.

## 11. Auth model

`src/middleware.ts` gates every route except `/login`, `/api/auth/*`,
`/api/garden` (public embeddable charts), and static assets. In development
(`NODE_ENV=development`) auth is **fully bypassed** — don't mistake local
`npm run dev` behavior for production behavior. Internal/agent calls can
bypass auth with header `x-internal-secret` matching `INTERNAL_API_SECRET`.
Google sign-in is further restricted to emails in `ALLOWED_EMAILS`
(`src/lib/auth.ts`).

## 12. UI structure & conventions (as inherited from the template — subject to the open rebuild decision in §2)

- `src/app/` — one directory per route: `agents`, `api`, `articles`,
  `client-pulse`, `content-os`, `garden`, `hermes`, `ideas`, `login`,
  `longform`, `memory-wiki`, `tasks`, `watchlist-radar`, `x`, `x-analytics`,
  `x-content`, `youtube`.
- `src/components/ui/kit.tsx` — the shared primitive kit ("Calm Luxury
  primitive kit" — Panel, SectionHeader, Eyebrow, Skeleton, EmptyState, Pill,
  count-up hooks, etc.). Every page is meant to build from this, not
  reinvent primitives per-page.
- `src/app/globals.css` — design tokens under a `:root` block labeled
  "PREMIUM DESIGN SYSTEM · Hermy HQ · Calm Luxury (Linear × Stripe)":
  monochrome dark surface ladder, hairline borders, tabular numerals, **one**
  desaturated accent color, semantic-only status colors (`--up`/`--down`/`--warn`).
  This is the structural system referred to in §2 as "the foundation" — the
  open question is whether to keep this structure and re-skin its values, or
  replace it with something derived fresh from Tasheer's light-mode system.
- `src/components/sidebar.tsx`, `src/app/login/page.tsx`,
  `src/components/OfficeView.tsx` are the three places generic "Hermy HQ"
  branding text/letter-badges currently render in-app (confirmed as of
  2026-09-20 — grep for "Hermy HQ" to re-check if this file is stale).
- `src/app/favicon.ico` + (if present) `src/app/icon.png` — Next.js App
  Router auto-serves these as the site favicon; no manual `<link>` needed.

## 13. Commands

```sh
npm install               # install deps
npm run dev                # local dev server (localhost:3000, auth bypassed)
npm run build               # prisma generate && next build — do this before restarting the live service
npm run start               # next start (what systemd runs, via npx)
npx prisma db push          # sync schema to Postgres (no migration files in use — push-based workflow)
npx prisma studio            # visual DB browser
npm run lint
```

After any change meant to go live: `npm run build` in `/opt/hermyhq`, then
`systemctl restart hermyhq-web`. Sanity-check with
`curl -s http://127.0.0.1:3300/login` before trusting it.

## 14. Working conventions / house rules learned this session

- **Ask before big-blast-radius UI/theme decisions** — the design system
  affects every future screen; guessing wrong means redoing everything. The
  user paused mid-decision on light-vs-dark (§2) rather than pick — respect
  that and don't default to an assumption.
- **This is a live production service** (real domain, real Google OAuth,
  real Postgres). Treat `npm run build` + `systemctl restart hermyhq-web` as
  a real deploy, not a sandbox action — check `git status` before and after,
  and prefer small verifiable diffs.
- The user explicitly distinguishes "customize/reskin the existing template"
  (rejected) from "rebuild the UI from scratch using this repo as
  foundation" (current intent) — infrastructure (Prisma models, the bus,
  auth, the bridge) stays; the visual/UX layer is up for a full redo.
- Pre-existing, unrelated-to-any-of-this git noise you'll see in `git
  status`: a modified `package-lock.json` and untracked
  `hermes-bridge/node_modules/` + `hermes-bridge/package-lock.json`. These
  predate this work — don't assume you caused them, don't clean them up
  without checking with the user first.
