#!/usr/bin/env node
/**
 * Hermy HQ ↔ Hermes bridge.
 *
 * Runs colocated with Hermes. Talks to the shared Postgres (the same
 * DATABASE_URL the website uses) — nothing is exposed to the internet. Two jobs:
 *
 *   PULL  (Hermes → website): mirror the kanban board into HermesTask;
 *         cron jobs into both raw DataStore text (fallback) and structured
 *         HermesCronJob rows; session metadata into HermesSession; health
 *         into DataStore; and best-effort real activity (via `hermes logs`,
 *         noise-filtered — see mirrorActivity()) into AgentEvent
 *         (source="hermes", distinct from this bridge's own source="bridge"
 *         events).
 *   PUSH  (website → Hermes): pick up AgentRequest rows that are `queued`
 *         (safe) or `approved` (human-approved side-effecting), run them
 *         through the `hermes` CLI, and write results back. Failures retry
 *         with backoff (retryCount/maxRetries/nextRetryAt) before landing
 *         on a terminal `failed` status.
 *
 * Requires: the `hermes` binary on PATH, and env DATABASE_URL.
 * Optional env: HERMES_BOARD (default "default"), BRIDGE_POLL_MS (5000),
 *               BRIDGE_MIRROR_MS (30000), HERMES_BIN (default "hermes").
 */
import pg from "pg";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const execFileP = promisify(execFile);
const HERMES = process.env.HERMES_BIN || "hermes";
const BOARD = process.env.HERMES_BOARD || "default";
const POLL_MS = Number(process.env.BRIDGE_POLL_MS || 5000);
const MIRROR_MS = Number(process.env.BRIDGE_MIRROR_MS || 30000);
const RUN_TIMEOUT_MS = Number(process.env.BRIDGE_RUN_TIMEOUT_MS || 240000);
const WIKI_DIR = process.env.HERMES_WIKI || path.join(os.homedir(), ".hermes", "wiki");
const BRIEF_HOUR = Number(process.env.BRIEF_HOUR || 8);   // local hour to auto-generate the daily brief
// "report: " cron jobs are schedule-only markers on the Hermes side (see
// maybeGenerateReports() below) — this no-op script + --no-agent keeps Hermes
// from independently running a real (costly, duplicate) agent on that schedule.
// `hermes cron create --script` requires a path relative to ~/.hermes/scripts/
// (verified live: an absolute path is rejected), so this is just the filename —
// the file itself lives at ~/.hermes/scripts/report-schedule-marker.sh.
const REPORT_MARKER_SCRIPT = "report-schedule-marker.sh";
const REPORT_NAME_PREFIX = "report: ";
const BRIEF_PROMPT =
  "You are the operator's chief of staff. Produce today's brief. Read your memory wiki open-loops " +
  "(~/.hermes/wiki), the kanban board, and recent activity. Output ONLY valid JSON (no prose, no code fences) " +
  'in exactly this shape: {"greeting":"one warm line","summary":"2-3 sentences on where things stand",' +
  '"sections":[{"label":"Needs your decision","items":["..."]},{"label":"Top priorities","items":["..."]},' +
  '{"label":"Recently shipped","items":["..."]},{"label":"Next actions","items":["..."]}]}. ' +
  "Keep every item short, concrete, and specific. Omit a section if it has nothing.";
let lastBriefDate = null;

const DB_URL = process.env.DATABASE_URL || "";
if (!DB_URL) { console.error("DATABASE_URL is required (use the direct postgres:// URL, not a prisma:// Accelerate URL)"); process.exit(1); }
if (DB_URL.startsWith("prisma://") || DB_URL.startsWith("prisma+")) {
  console.error("DATABASE_URL is a Prisma Accelerate URL; the bridge needs a DIRECT postgres:// connection string (e.g. POSTGRES_URL).");
  process.exit(1);
}
// Cloud Postgres (Prisma Postgres/Neon/Supabase/RDS) needs SSL; localhost doesn't.
const isLocal = /@(localhost|127\.0\.0\.1)/.test(DB_URL);
const pool = new pg.Pool({ connectionString: DB_URL, max: 4, ssl: isLocal ? undefined : { rejectUnauthorized: false } });

const log = (...a) => console.log(new Date().toISOString(), ...a);
const q = (text, params) => pool.query(text, params);

async function hermes(args, { timeout = 30000 } = {}) {
  const { stdout } = await execFileP(HERMES, args, { timeout, maxBuffer: 8 * 1024 * 1024 });
  return stdout;
}

// Same as hermes(["-z", prompt]) but also captures per-invocation token/cost
// usage via --usage-file. `estimated_cost_usd` is unreliable (verified live:
// returned a large negative value for a trivial prompt — an upstream Hermes
// bug in cost estimation for openrouter/auto) — callers must validate it
// themselves before storing; token counts are reliable.
async function hermesOneshot(prompt, { timeout = RUN_TIMEOUT_MS } = {}) {
  const usageFile = path.join(os.tmpdir(), `hermes-usage-${randomUUID()}.json`);
  try {
    const stdout = await hermes(["-z", prompt, "--usage-file", usageFile], { timeout });
    let usage = null;
    try { usage = JSON.parse(fs.readFileSync(usageFile, "utf8")); } catch { /* no usage file written */ }
    return { stdout, usage };
  } finally {
    try { fs.unlinkSync(usageFile); } catch { /* already gone, or never written */ }
  }
}

// Hermes has a separate, pre-existing skill (agency-agents-router, a
// 273-agent specialist roster — nothing to do with this dashboard's own
// AgentProfile registry) that prepends a one-line routing note to most
// agency/marketing answers, e.g. "No specialist from the roster fits this
// — ..." or "Using <Specialist> (<Division>) for this — ...", followed by
// a blank line, a "---" separator, and the actual deliverable. Verified
// live (2026-09-22) this fires on most real dispatches and makes truncated
// previews (Activity Log, Command Center) read like a failure even though
// the task succeeded. Cosmetic-only strip — this is the SKILL.md's own
// documented convention, not something to parse defensively for every
// possible phrasing; the "roster" keyword + "---" separator are reliable
// enough given the skill's own required format ("name the specialist in
// one line, then deliver the actual work").
function stripRosterPreamble(text) {
  const m = text.match(/^([^\n]{0,300}\broster\b[^\n]{0,300})\n+---\n+([\s\S]*)$/i);
  return m ? m[2].trim() : text;
}

async function emit(kind, title, { detail = null, agent = "hermes", level = "info", meta = null, source = "bridge" } = {}) {
  await q(
    `INSERT INTO "AgentEvent" (id, kind, title, detail, agent, level, source, meta, "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())`,
    [randomUUID(), kind, title.slice(0, 200), detail, agent, level, source, meta ? JSON.stringify(meta) : null]
  );
}

async function setStore(key, data) {
  await q(
    `INSERT INTO "DataStore" (key, data, "updatedAt") VALUES ($1,$2, now())
     ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, "updatedAt" = now()`,
    [key, JSON.stringify(data)]
  );
}

/* ─────────────── PULL: mirror Hermes → Postgres ─────────────── */
async function mirrorKanban() {
  let tasks = [];
  try {
    // NB: this Hermes CLI wants --board BEFORE the subcommand.
    const out = await hermes(["kanban", "--board", BOARD, "list", "--json"], { timeout: 15000 });
    const parsed = JSON.parse(out || "[]");
    tasks = Array.isArray(parsed) ? parsed : parsed.tasks || [];
  } catch (e) { log("kanban list failed:", e.message.split("\n")[0]); return; }

  const seen = new Set();
  for (const t of tasks) {
    const id = String(t.id ?? t.task_id ?? "");
    if (!id) continue;
    seen.add(id);
    await q(
      `INSERT INTO "HermesTask" (id, board, title, assignee, status, priority, result, "updatedAt", "syncedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7, now(), now())
       ON CONFLICT (id) DO UPDATE SET
         title=EXCLUDED.title, assignee=EXCLUDED.assignee, status=EXCLUDED.status,
         priority=EXCLUDED.priority, result=EXCLUDED.result, "syncedAt"=now()`,
      [id, BOARD, String(t.title ?? "untitled").slice(0, 300), t.assignee ?? null,
       String(t.status ?? "todo"), t.priority != null ? Number(t.priority) : null,
       t.result ? String(t.result).slice(0, 2000) : null]
    );
  }
  // prune tasks that vanished from the board
  if (seen.size) {
    await q(`DELETE FROM "HermesTask" WHERE board=$1 AND id <> ALL($2::text[])`, [BOARD, [...seen]]);
  } else {
    await q(`DELETE FROM "HermesTask" WHERE board=$1`, [BOARD]);
  }
}

async function mirrorCrons() {
  let out;
  try {
    out = await hermes(["cron", "list", "--all"], { timeout: 15000 });
  } catch (e) { log("cron list failed:", e.message.split("\n")[0]); return; }

  // Keep the raw-text mirror as-is — /api/hermes/crons falls back to this if the
  // structured parse below comes up empty (e.g. CLI output format drifts again).
  const lines = out.split("\n").map((l) => l.trimEnd()).filter(Boolean);
  await setStore("hermes-crons", { jobs: lines, raw: out.slice(0, 8000), syncedAt: new Date().toISOString() });

  // Structured parse: each job is a "<id> [status]" header line followed by
  // indented "Key:   Value" lines until the next header or EOF.
  const jobs = [];
  let cur = null;
  const headerRe = /^\s*([a-f0-9]{8,})\s+\[(\w+)\]/;
  const fieldRe = /^\s{2,}([A-Za-z ]+):\s*(.*)$/;
  for (const line of out.split("\n")) {
    const h = line.match(headerRe);
    if (h) {
      if (cur) jobs.push(cur);
      cur = { id: h[1], active: h[2] === "active", fields: {} };
      continue;
    }
    if (!cur) continue;
    const f = line.match(fieldRe);
    if (f) cur.fields[f[1].trim()] = f[2].trim();
  }
  if (cur) jobs.push(cur);
  if (!jobs.length) return; // nothing parsed — leave HermesCronJob table as last-known-good

  const seen = new Set();
  for (const j of jobs) {
    seen.add(j.id);
    const nextRunAt = j.fields["Next run"] ? new Date(j.fields["Next run"]) : null;
    // "Last run" is formatted like "2026-09-21T08:00:12.356659+02:00  ok" — split the trailing status word off.
    const lastRunRaw = j.fields["Last run"] || null;
    const lastRunMatch = lastRunRaw ? lastRunRaw.match(/^(\S+)\s*(.*)$/) : null;
    const lastRunAt = lastRunMatch && !isNaN(new Date(lastRunMatch[1]).getTime()) ? new Date(lastRunMatch[1]) : null;
    const lastRunStatus = lastRunMatch ? (lastRunMatch[2] || null) : null;
    const skills = (j.fields["Skills"] || "").split(",").map((s) => s.trim()).filter(Boolean);
    await q(
      `INSERT INTO "HermesCronJob" (id, name, schedule, active, "nextRunAt", "lastRunAt", "lastRunStatus", "deliverTargets", skills, "monitorScript", "updatedAt", "syncedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now(), now())
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, schedule=EXCLUDED.schedule, active=EXCLUDED.active,
         "nextRunAt"=EXCLUDED."nextRunAt", "lastRunAt"=EXCLUDED."lastRunAt", "lastRunStatus"=EXCLUDED."lastRunStatus",
         "deliverTargets"=EXCLUDED."deliverTargets", skills=EXCLUDED.skills, "monitorScript"=EXCLUDED."monitorScript",
         "updatedAt"=now(), "syncedAt"=now()`,
      [j.id, j.fields["Name"] || j.id, j.fields["Schedule"] || "", j.active,
       nextRunAt && !isNaN(nextRunAt.getTime()) ? nextRunAt : null, lastRunAt, lastRunStatus,
       j.fields["Deliver"] || null, skills, j.fields["Monitor"] || null]
    );
  }
  await q(`DELETE FROM "HermesCronJob" WHERE id <> ALL($1::text[])`, [[...seen]]);
}

/* ─────────────── Sessions (metadata mirror) ─────────────── */
async function mirrorSessions() {
  let out;
  try {
    out = await hermes(["sessions", "list", "--limit", "50"], { timeout: 15000 });
  } catch (e) { log("sessions list failed:", e.message.split("\n")[0]); return; }

  const lines = out.split("\n").filter((l) => l.trim() && !/^[─-]{5,}$/.test(l.trim()));
  const dataLines = lines.filter((l) => !l.trim().startsWith("Title"));

  const parseAgo = (s) => {
    const m = s.match(/^(\d+)([mhd])\s+ago$/i);
    if (!m) return null;
    const n = Number(m[1]);
    const ms = m[2] === "m" ? 60_000 : m[2] === "h" ? 3_600_000 : 86_400_000;
    return new Date(Date.now() - n * ms);
  };

  const seen = new Set();
  for (const line of dataLines) {
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length < 3) continue;
    const id = parts[parts.length - 1];
    if (!id) continue;
    seen.add(id);
    const lastActiveAt = parts.length >= 3 ? parseAgo(parts[parts.length - 2]) : null;
    const source = parts.length >= 4 ? parts[parts.length - 3] : null;
    const title = parts.slice(0, parts.length - (parts.length >= 4 ? 3 : 2)).join(" ") || id;
    await q(
      `INSERT INTO "HermesSession" (id, title, source, "lastActiveAt", "syncedAt")
       VALUES ($1,$2,$3,$4, now())
       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, source=EXCLUDED.source,
         "lastActiveAt"=EXCLUDED."lastActiveAt", "syncedAt"=now()`,
      [id, title, source, lastActiveAt]
    );
  }
  if (seen.size) await q(`DELETE FROM "HermesSession" WHERE id <> ALL($1::text[])`, [[...seen]]);
}

/* ─────────────── Real activity mirror (best-effort — see note) ─────────────── */
// `hermes logs --component tools/agent` returned nothing useful in testing: every
// CLI invocation re-registers ~50 plugins and floods agent.log with init noise
// before any real work happens, and the component tags didn't isolate actual
// tool-call/reasoning lines for this invocation pattern (`hermes -z ...`, a fresh
// process per call). Rather than build a fragile scraper chasing an internal log
// format, this is a deliberately modest noise filter: known boilerplate patterns
// are dropped, anything else (including all WARNING/ERROR lines) is kept. This
// will surface real signal when there is any, but should not be trusted as a
// complete picture of Hermes's internal activity — flagged as a known limitation.
const LOG_NOISE_RE = /registered .* provider:|capability_check |Plugin discovery complete|memory trim: reason=|dashboard-auth[:-]|HTTP Request: .* "HTTP\/1\.1 200 OK"$/;
const LOG_LINE_RE = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+\s+(\w+)\s+([\w.]+):\s*(.*)$/;

async function mirrorActivity() {
  let out;
  try {
    out = await hermes(["logs", "--since", "10m", "-n", "500"], { timeout: 15000 });
  } catch (e) { log("logs fetch failed:", e.message.split("\n")[0]); return; }

  const { rows } = await q(`SELECT data FROM "DataStore" WHERE key='hermes-activity-cursor'`);
  const cursor = rows[0]?.data?.lastTimestamp ? new Date(rows[0].data.lastTimestamp) : new Date(0);
  let maxTs = cursor;
  const toEmit = [];

  for (const line of out.split("\n")) {
    const m = line.match(LOG_LINE_RE);
    if (!m) continue;
    const [, tsStr, level, logger, message] = m;
    const ts = new Date(tsStr.replace(" ", "T"));
    if (isNaN(ts.getTime()) || ts <= cursor) continue;
    if (ts > maxTs) maxTs = ts;
    const isNoise = LOG_NOISE_RE.test(line);
    if (isNoise && level === "INFO") continue; // always keep WARNING/ERROR regardless of pattern
    toEmit.push({ ts, level, logger, message });
  }

  for (const r of toEmit.slice(-50)) { // cap per tick so a big backlog can't flood the feed
    const lvl = r.level === "ERROR" ? "down" : r.level === "WARNING" ? "warn" : "info";
    await emit("activity", r.message.slice(0, 200), { detail: r.logger, level: lvl, source: "hermes" });
  }
  if (toEmit.length || maxTs > cursor) {
    await setStore("hermes-activity-cursor", { lastTimestamp: maxTs.toISOString() });
  }
}

async function mirrorCost() {
  for (const args of [["insights", "--days", "7"], ["insights"]]) {
    try {
      const out = await hermes(args, { timeout: 15000 });
      await setStore("hermes-cost", { summary: out.slice(0, 4000), syncedAt: new Date().toISOString() });
      return;
    } catch { /* try next arg shape */ }
  }
}

async function mirrorHealth() {
  let online = false, gateway = "unknown", detail = "";
  try {
    const out = await hermes(["status"], { timeout: 12000 });
    detail = out.slice(0, 4000);
    online = /online|running|connected/i.test(out);
    gateway = /gateway[^\n]*(running|online)/i.test(out) ? "running" : "stopped";
  } catch (e) { detail = e.message.split("\n")[0]; }
  await setStore("hermes-health", { online, gateway, detail, lastSeen: new Date().toISOString() });
}

/* ─────────────── Memory Wiki (warm tier: git-tracked markdown) ─────────────── */
function parseEntry(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fm = {}; let body = md;
  if (m) {
    body = m[2];
    for (const line of m[1].split("\n")) {
      const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
      if (!kv) continue;
      const v = kv[2].trim();
      if (v.startsWith("[") && v.endsWith("]")) fm[kv[1]] = v.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
      else fm[kv[1]] = v === "null" || v === "" ? null : v;
    }
  }
  return { fm, body: body.trim() };
}
function walkMd(dir, out = []) {
  let items = [];
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) { if (it.name !== ".git") walkMd(full, out); }
    else if (it.name.endsWith(".md") && it.name !== "INDEX.md") out.push(full);
  }
  return out;
}
async function mirrorWiki() {
  if (!fs.existsSync(WIKI_DIR)) return;
  const seen = new Set();
  for (const file of walkMd(WIKI_DIR)) {
    const rel = path.relative(WIKI_DIR, file);
    const id = rel.replace(/\.md$/, "");
    seen.add(id);
    let raw = ""; try { raw = fs.readFileSync(file, "utf8"); } catch { continue; }
    const { fm, body } = parseEntry(raw);
    await q(
      `INSERT INTO "HermesMemory" (id, path, type, title, status, confidence, provenance, tags, links, body, "validFrom", "validTo", "updatedAt", "syncedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now(), now())
       ON CONFLICT (id) DO UPDATE SET path=EXCLUDED.path, type=EXCLUDED.type, title=EXCLUDED.title,
         status=EXCLUDED.status, confidence=EXCLUDED.confidence, provenance=EXCLUDED.provenance,
         tags=EXCLUDED.tags, links=EXCLUDED.links, body=EXCLUDED.body,
         "validFrom"=EXCLUDED."validFrom", "validTo"=EXCLUDED."validTo", "syncedAt"=now()`,
      [id, rel, fm.type || "fact", fm.title || id, fm.status || "active", fm.confidence || null,
       fm.provenance || null, Array.isArray(fm.tags) ? fm.tags : [], Array.isArray(fm.links) ? fm.links : [],
       body, fm.valid_from || null, fm.valid_to || null]
    );
  }
  if (seen.size) await q(`DELETE FROM "HermesMemory" WHERE id <> ALL($1::text[])`, [[...seen]]);
  else await q(`DELETE FROM "HermesMemory"`);
}
function writeWikiEntry(e) {
  const rel = e.path || `${e.type || "note"}s/${e.id}.md`;
  const full = path.join(WIKI_DIR, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const now = new Date().toISOString().slice(0, 10);
  const lines = [
    "---", `id: ${e.id}`, `type: ${e.type || "note"}`, `title: ${e.title}`,
    `status: ${e.status || "active"}`,
    e.confidence ? `confidence: ${e.confidence}` : null,
    `provenance: ${e.provenance || "dashboard"}`,
    `tags: [${(e.tags || []).join(", ")}]`, `links: [${(e.links || []).join(", ")}]`,
    `updated: ${now}`, "---", "", e.body || "", "",
  ].filter((l) => l !== null);
  fs.writeFileSync(full, lines.join("\n"), "utf8");
  return rel;
}
async function gitCommitWiki(msg) {
  try {
    if (!fs.existsSync(path.join(WIKI_DIR, ".git"))) await execFileP("git", ["-C", WIKI_DIR, "init"]).catch(() => {});
    await execFileP("git", ["-C", WIKI_DIR, "add", "-A"]).catch(() => {});
    await execFileP("git", ["-C", WIKI_DIR, "commit", "-m", msg]).catch(() => {});
  } catch { /* ignore */ }
}

/* ─────────────── Chief-of-staff daily brief ─────────────── */
async function generateBriefing() {
  const raw = (await hermes(["-z", BRIEF_PROMPT], { timeout: RUN_TIMEOUT_MS })).trim();
  let brief;
  try {
    const jsonStr = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const m = jsonStr.match(/\{[\s\S]*\}/);
    brief = JSON.parse(m ? m[0] : jsonStr);
  } catch { brief = { summary: raw.slice(0, 1500), sections: [] }; }
  brief.generatedAt = new Date().toISOString();
  await setStore("hermes-briefing", brief);
  await emit("status", "Daily brief generated", { level: "up" });
}
async function maybeDailyBrief() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (now.getHours() >= BRIEF_HOUR && lastBriefDate !== today) {
    lastBriefDate = today;
    try { await generateBriefing(); } catch (e) { log("daily brief err", e.message); }
  }
}

/* ─────────────── Reporting (item 5: bridge-driven, HermesCronJob = schedule only) ───────────────
 * "report: <type>: <clientName>" HermesCronJob rows (mirrored from a Hermes-side
 * no-agent/no-op cron, see REPORT_MARKER_SCRIPT) are schedule markers only. This
 * function checks them each mirror tick and, when due, does the actual drafting
 * itself via hermesOneshot() — a small, fixed set of prompts, not a generic
 * template system — then inserts an awaiting_approval AgentRequest that surfaces
 * in the existing ApprovalInbox with zero new UI. A per-job DataStore cursor
 * (keyed on the exact due nextRunAt) stops the same due date from re-drafting
 * on every 30s tick before Hermes's own schedule advances nextRunAt again.
 */
const REPORT_PROMPTS = {
  "weekly-status": (clientName) =>
    `Draft a concise weekly status update for the agency's client "${clientName}". Include: work completed ` +
    "this week, what's in progress, any blockers needing the client's input, and what's planned next week. " +
    "Write it as a ready-to-send client-facing message — clear, professional, no filler. Output only the " +
    "report text, no preamble, no markdown code fences.",
  "monthly-summary": (clientName) =>
    `Draft a concise monthly performance summary for the agency's client "${clientName}". Include: key ` +
    "results/deliverables this month, notable wins, any open issues, and priorities for next month. Write " +
    "it as a ready-to-send client-facing message — clear, professional, no filler. Output only the report " +
    "text, no preamble, no markdown code fences.",
};

async function generateReportDraft(reportType, clientName, clientId) {
  const buildPrompt = REPORT_PROMPTS[reportType] || REPORT_PROMPTS["weekly-status"];
  const prompt = buildPrompt(clientName);
  const { stdout, usage } = await hermesOneshot(prompt);
  const draft = stripRosterPreamble(stdout.trim());
  const cost = usage && Number.isFinite(usage.estimated_cost_usd) && usage.estimated_cost_usd >= 0
    ? usage.estimated_cost_usd : null;
  await q(
    `INSERT INTO "AgentRequest"
       (id, origin, kind, title, prompt, "sideEffecting", status, result, "clientId",
        "costUsd", "inputTokens", "outputTokens", model, provider, "createdAt", "updatedAt")
     VALUES ($1,'hermes','report.review',$2,$3,true,'awaiting_approval',$4,$5,$6,$7,$8,$9,$10, now(), now())`,
    [randomUUID(), `Report draft: ${clientName} (${reportType})`.slice(0, 200), prompt, draft, clientId,
     cost, usage?.input_tokens ?? null, usage?.output_tokens ?? null, usage?.model ?? null, usage?.provider ?? null]
  );
  await emit("run", `Report drafted: ${clientName} (${reportType})`, { level: "up" });
}

async function maybeGenerateReports() {
  const { rows: jobs } = await q(
    `SELECT * FROM "HermesCronJob" WHERE active = true AND name LIKE $1 AND "nextRunAt" IS NOT NULL AND "nextRunAt" <= now()`,
    [`${REPORT_NAME_PREFIX}%`]
  );
  for (const job of jobs) {
    const cursorKey = `report-cursor:${job.id}`;
    const { rows: cursorRows } = await q(`SELECT data FROM "DataStore" WHERE key=$1`, [cursorKey]);
    const dueIso = job.nextRunAt.toISOString();
    if (cursorRows[0]?.data?.lastHandledNextRunAt === dueIso) continue; // already drafted for this due date

    // name format: "report: <type>: <clientName>" (set by the dashboard's /reporting create form)
    const rest = job.name.slice(REPORT_NAME_PREFIX.length);
    const sep = rest.indexOf(":");
    const reportType = sep >= 0 ? rest.slice(0, sep).trim() : "weekly-status";
    const clientName = (sep >= 0 ? rest.slice(sep + 1) : rest).trim();

    try {
      const { rows: clientRows } = await q(`SELECT id FROM "Client" WHERE "clientName" = $1 LIMIT 1`, [clientName]);
      await generateReportDraft(reportType, clientName, clientRows[0]?.id || null);
    } catch (e) {
      log("report draft failed:", job.id, e.message);
    }
    await setStore(cursorKey, { lastHandledNextRunAt: dueIso });
  }
}

/* ─────────────── PUSH: run website requests via Hermes ─────────────── */
async function runRequest(r) {
  await q(`UPDATE "AgentRequest" SET status='running', "startedAt"=now(), "updatedAt"=now() WHERE id=$1`, [r.id]);
  await emit("run", `Started: ${r.title}`, { level: "info", meta: { requestId: r.id, kind: r.kind } });
  try {
    let result = "";
    let usage = null;
    if (r.kind === "oneshot" || r.kind === "chat") {
      const out = await hermesOneshot(r.prompt || r.title);
      result = stripRosterPreamble(out.stdout.trim());
      usage = out.usage;
    } else if (r.kind === "kanban") {
      result = (await hermes(["kanban", "--board", BOARD, "create", "--json", r.title], { timeout: 20000 })).trim();
    } else if (r.kind.startsWith("cron.")) {
      const op = r.kind.split(".")[1];
      const a = JSON.parse(r.prompt || "{}");
      const isReportMarker = op === "create" && String(a.name || "").startsWith(REPORT_NAME_PREFIX);
      const argv =
        isReportMarker ? ["cron", "create", a.schedule, "--name", a.name, "--no-agent", "--script", REPORT_MARKER_SCRIPT]
        : op === "create" ? ["cron", "create", a.schedule, a.prompt || a.name].filter(Boolean)
        : op === "run"    ? ["cron", "run", a.id || a.name]
        : op === "pause"  ? ["cron", "pause", a.id || a.name]
        : op === "resume" ? ["cron", "resume", a.id || a.name]
        : op === "remove" ? ["cron", "remove", a.id || a.name]
        : op === "edit"   ? ["cron", "edit", a.id || a.name]
        : null;
      if (!argv) throw new Error(`unknown cron op ${op}`);
      result = (await hermes(argv, { timeout: 20000 })).trim();
      await mirrorCrons();
    } else if (r.kind === "memory.write") {
      const e = JSON.parse(r.prompt || "{}");
      const rel = writeWikiEntry(e);
      await gitCommitWiki(`wiki: update ${rel} (via dashboard)`);
      await mirrorWiki();
      result = `wrote ${rel}`;
    } else if (r.kind === "briefing.generate") {
      await generateBriefing();
      lastBriefDate = new Date().toISOString().slice(0, 10);
      result = "brief updated";
    } else if (r.kind === "report.review") {
      // Drafted by maybeGenerateReports() with result already populated at
      // insert time; approval just marks it done — no further execution.
      result = r.result || "";
    } else {
      throw new Error(`unknown kind ${r.kind}`);
    }

    const cost = usage && Number.isFinite(usage.estimated_cost_usd) && usage.estimated_cost_usd >= 0
      ? usage.estimated_cost_usd : null;
    // COALESCE with the existing column so kinds that don't produce fresh usage
    // here (e.g. report.review, whose usage was already stored at draft time by
    // maybeGenerateReports()) don't get their cost/token fields clobbered to NULL.
    await q(
      `UPDATE "AgentRequest" SET status='done', result=$2, "finishedAt"=now(), "updatedAt"=now(),
         "costUsd"=COALESCE($3,"costUsd"), "inputTokens"=COALESCE($4,"inputTokens"),
         "outputTokens"=COALESCE($5,"outputTokens"), model=COALESCE($6,model), provider=COALESCE($7,provider)
       WHERE id=$1`,
      [r.id, result.slice(0, 8000), cost, usage?.input_tokens ?? null, usage?.output_tokens ?? null,
       usage?.model ?? null, usage?.provider ?? null]
    );
    await emit("run", `Done: ${r.title}`, { level: "up", detail: result.slice(0, 400), meta: { requestId: r.id } });
  } catch (e) {
    const msg = (e.stderr || e.message || "error").toString().split("\n")[0].slice(0, 600);
    const retryCount = (r.retryCount || 0) + 1;
    const maxRetries = r.maxRetries ?? 3;
    if (retryCount <= maxRetries) {
      const backoffMs = [30_000, 120_000, 600_000][retryCount - 1] || 600_000;
      const nextRetryAt = new Date(Date.now() + backoffMs);
      await q(
        `UPDATE "AgentRequest" SET status='queued', "retryCount"=$2, "nextRetryAt"=$3, error=$4, "updatedAt"=now() WHERE id=$1`,
        [r.id, retryCount, nextRetryAt, msg]
      );
      await emit("run", `Retry ${retryCount}/${maxRetries}: ${r.title}`, { level: "warn", detail: msg, meta: { requestId: r.id } });
      log("request retry scheduled:", r.id, `${retryCount}/${maxRetries}`, msg);
    } else {
      await q(`UPDATE "AgentRequest" SET status='failed', error=$2, "finishedAt"=now(), "updatedAt"=now() WHERE id=$1`, [r.id, msg]);
      await emit("run", `Failed: ${r.title}`, { level: "down", detail: msg, meta: { requestId: r.id } });
      log("request failed:", r.id, msg);
    }
  }
}

async function processQueue() {
  const { rows } = await q(
    `SELECT * FROM "AgentRequest"
     WHERE status IN ('queued','approved') AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= now())
     ORDER BY "createdAt" ASC LIMIT 3`
  );
  for (const r of rows) await runRequest(r);
}

/* ─────────────── loops ─────────────── */
async function mirrorTick() {
  try { await mirrorKanban(); } catch (e) { log("mirrorKanban err", e.message); }
  try { await mirrorCrons(); } catch (e) { log("mirrorCrons err", e.message); }
  try { await mirrorSessions(); } catch (e) { log("mirrorSessions err", e.message); }
  try { await mirrorHealth(); } catch (e) { log("mirrorHealth err", e.message); }
  try { await mirrorWiki(); } catch (e) { log("mirrorWiki err", e.message); }
  try { await mirrorCost(); } catch (e) { log("mirrorCost err", e.message); }
  try { await mirrorActivity(); } catch (e) { log("mirrorActivity err", e.message); }
  try { await maybeDailyBrief(); } catch (e) { log("maybeDailyBrief err", e.message); }
  try { await maybeGenerateReports(); } catch (e) { log("maybeGenerateReports err", e.message); }
}

async function main() {
  log(`hermes-bridge up · board=${BOARD} · poll=${POLL_MS}ms · mirror=${MIRROR_MS}ms`);
  await emit("status", "Bridge connected", { level: "up" });
  await mirrorTick();
  setInterval(() => mirrorTick().catch((e) => log("mirror loop", e.message)), MIRROR_MS);
  // queue loop
  const tick = async () => { try { await processQueue(); } catch (e) { log("queue loop", e.message); } finally { setTimeout(tick, POLL_MS); } };
  tick();
}
main().catch((e) => { console.error("fatal", e); process.exit(1); });
