"use client";

import {
  Activity,
  ArrowUpRight,
  RefreshCw,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { ConsoleTopBar } from "@/components/console-topbar";
import {
  SectionHeader,
  Panel,
  Pill,
  Button,
  StatCard,
  AlertBanner,
  ActivityLogPanel,
  Eyebrow,
  type ActivityLogEntry,
} from "@/components/ui/kit";

/* ── Mock data — swap for real Prisma/API reads once this screen
   is reviewed (ClientPulseClient, AgentEvent, HermesTask). ── */

const CLIENT_HEALTH = [
  { client: "Sintco Dental", channels: ["Meta"], spend: "$1,240/day", target: 28, actual: 41, status: "Review" as const },
  { client: "Nova Fitness Studio", channels: ["Meta", "Google"], spend: "$860/day", target: 32, actual: 29, status: "On Pace" as const },
  { client: "Solaris Energy Co", channels: ["Google"], spend: "$2,100/day", target: 54, actual: 88, status: "Review" as const },
  { client: "Bright Smile Dental", channels: ["Meta"], spend: "$540/day", target: 22, actual: 21, status: "On Pace" as const },
  { client: "Clara Boutique", channels: ["Meta", "TikTok"], spend: "$410/day", target: 18, actual: 24, status: "Pacing" as const },
];

const AUDIT_STREAM: ActivityLogEntry[] = [
  { id: "1", tone: "accent", timestamp: "11:42 AM", message: <>Adjusted Meta ad-set budget for <b className="text-[var(--text)]">Sintco Dental</b> (+$150/day) after CPA drift detected.</> },
  { id: "2", tone: "neutral", timestamp: "10:58 AM", message: <>Synced Google Ads account for <b className="text-[var(--text)]">Solaris Energy Co</b> — no anomalies found.</> },
  { id: "3", tone: "down", timestamp: "10:20 AM", message: <>Flagged webhook staging failure on <b className="text-[var(--text)]">Nova Fitness</b> deploy pipeline.</> },
  { id: "4", tone: "neutral", timestamp: "9:05 AM", message: "Generated weekly performance digest for 5 active accounts." },
  { id: "5", tone: "up", timestamp: "8:40 AM", message: "Auto-approved routine budget sync (Balanced autonomy)." },
];

const MILESTONES = [
  { title: "Sintco Dental — Landing Page v2", meta: "DNS cutover", due: "Oct 24", tone: "accent" as const },
  { title: "Nova Fitness — CRM Webhook Migration", meta: "Blocked · review needed", due: "Overdue", tone: "down" as const },
  { title: "Solaris Energy — Offline Conversion QA & Staging Deploy", meta: "In progress", due: "Oct 27", tone: "neutral" as const },
  { title: "Monthly Hetzner Kernel Upgrades & Security Patch", meta: "Scheduled", due: "Oct 30", tone: "neutral" as const },
];

function statusTone(status: string): "up" | "warn" | "down" {
  if (status === "On Pace") return "up";
  if (status === "Pacing") return "warn";
  return "down";
}

export default function OverviewPage() {
  return (
    <>
      <ConsoleTopBar
        section="Overview"
        actions={
          <Button variant="accent" size="sm">
            <Sparkles className="w-3.5 h-3.5" /> New Mission Brief
          </Button>
        }
      />

      <div className="hq-rise">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="headline text-[26px] md:text-[30px] font-semibold tracking-[-0.015em] text-[var(--text)]">
              Mission Control Overview
            </h1>
            <p className="mt-1 text-[13.5px] text-[var(--text-2)] max-w-xl">
              Live agency telemetry, urgent alerts, and pending autonomous agent actions.
            </p>
          </div>
          <Button variant="ghost" size="sm">
            <RefreshCw className="w-3.5 h-3.5" /> Run Diagnostic
          </Button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Client Campaigns" value="14" delta="+2" deltaTone="up" hint="this month" icon={<Activity className="w-4 h-4" />} />
          <StatCard label="Total Ad Spend Managed" value="$64,280" delta="+18.2%" deltaTone="up" hint="MoM" icon={<ArrowUpRight className="w-4 h-4" />} />
          <StatCard label="Autonomous Actions" value="142" delta="118 auto" deltaTone="neutral" hint="approved" icon={<Sparkles className="w-4 h-4" />} />
          <StatCard label="Dev Sprints / Builds" value="5" delta="4 deploying" deltaTone="neutral" hint="this week" icon={<Rocket className="w-4 h-4" />} />
        </div>

        {/* alerts */}
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <AlertBanner
            tone="warn"
            title="Pacing alert — Sintco Dental"
            description="Meta daily cap accelerated; spend projected to exhaust budget by 16:30 today."
            action={<Button size="sm" variant="ghost">Adjust Budget</Button>}
          />
          <AlertBanner
            tone="down"
            title="Dev blocker — Nova Fitness webhook staging"
            description="CRM webhook migration failing; staging deploy blocked on env config."
            action={<Button size="sm" variant="ghost">Restart Container</Button>}
          />
        </div>

        {/* main split */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-5 mb-6 items-start">
          <Panel className="!p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold text-[var(--text)] headline">Urgent Client &amp; Campaign Health</p>
                <p className="text-[12px] text-[var(--text-3)] mt-0.5">5 accounts flagged for review this cycle</p>
              </div>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    {["Client", "Channels", "Daily Spend", "Target / Act. CPA", "Status", ""].map((h) => (
                      <th key={h} className="eyebrow !text-[10px] px-5 py-2.5 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CLIENT_HEALTH.map((row) => (
                    <tr key={row.client} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                      <td className="px-5 py-3 text-[13px] font-medium text-[var(--text)] whitespace-nowrap">{row.client}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          {row.channels.map((c) => <Pill key={c} tone="neutral">{c}</Pill>)}
                        </div>
                      </td>
                      <td className="px-5 py-3 num text-[13px] text-[var(--text-2)] whitespace-nowrap">{row.spend}</td>
                      <td className="px-5 py-3 num text-[13px] whitespace-nowrap">
                        <span className="text-[var(--text-3)]">${row.target}</span>
                        <span className="text-[var(--text-4)]"> / </span>
                        <span className={row.actual > row.target ? "text-[var(--down)]" : "text-[var(--up)]"}>${row.actual}</span>
                      </td>
                      <td className="px-5 py-3"><Pill tone={statusTone(row.status)}>{row.status}</Pill></td>
                      <td className="px-5 py-3 text-right"><Button size="sm" variant="ghost">Adjust</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <ActivityLogPanel title="Hermes Agent Audit Stream" entries={AUDIT_STREAM} className="lg:max-h-[420px]" />
        </div>

        {/* milestones + quick ops */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          <Panel className="!p-0 overflow-hidden">
            <SectionHeader label="Roadmap" title="Upcoming Milestones & Deployments" className="!mb-0 px-5 pt-4" />
            <div className="divide-y divide-[var(--line)]">
              {MILESTONES.map((m) => (
                <div key={m.title} className="px-5 py-3.5 flex items-center gap-3">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: m.tone === "down" ? "var(--down)" : m.tone === "accent" ? "var(--accent)" : "var(--text-4)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[var(--text)] truncate">{m.title}</p>
                    <p className="text-[11.5px] text-[var(--text-3)] mt-0.5">{m.meta}</p>
                  </div>
                  <span className="num text-[11.5px] text-[var(--text-3)] shrink-0">{m.due}</span>
                </div>
              ))}
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel className="p-4">
              <Eyebrow>Quick Ops Actions</Eyebrow>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="ghost" size="sm" className="!justify-start"><Wand2 className="w-3.5 h-3.5" /> Generate Digest</Button>
                <Button variant="ghost" size="sm" className="!justify-start"><RefreshCw className="w-3.5 h-3.5" /> Sync Ad Accounts</Button>
                <Button variant="ghost" size="sm" className="!justify-start"><ShieldCheck className="w-3.5 h-3.5" /> Trigger VPS Backup</Button>
                <Button variant="ghost" size="sm" className="!justify-start"><Send className="w-3.5 h-3.5" /> High-Autonomy</Button>
              </div>
            </Panel>
            <Panel className="p-4">
              <div className="flex items-center justify-between">
                <Eyebrow>Hetzner Server Fleet</Eyebrow>
                <Pill tone="up">All Online</Pill>
              </div>
              <p className="mt-2 text-[12px] text-[var(--text-3)]">3/3 bare-metal nodes reporting healthy · 99.98% uptime (30d)</p>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
