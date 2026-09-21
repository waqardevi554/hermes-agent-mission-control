"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";
import { GitBranch, Plus, Trash2, Zap } from "lucide-react";
import { ConsoleTopBar } from "@/components/console-topbar";
import { Panel, Pill, Button, Eyebrow, StatCard } from "@/components/ui/kit";

interface Ticket {
  title: string;
  client: string;
  tag: string;
  meta: string;
  priority?: "High" | "Med";
}

const COLUMNS: { name: string; tone: "neutral" | "accent" | "warn" | "up"; tickets: Ticket[] }[] = [
  {
    name: "Scoping & Backlog",
    tone: "neutral",
    tickets: [
      { title: "Stripe Billing Portal Integration", client: "Sintco Dental", tag: "Backend", meta: "Est. 3d · Tariq S." },
      { title: "Multi-Language Sitemap & Hreflang", client: "Nova Fitness Studio", tag: "SEO", meta: "Est. 2d · Unassigned" },
      { title: "HubSpot Custom Form Webhook Bridge", client: "Solaris Energy Co", tag: "Integration", meta: "Est. 1d · Tariq S.", priority: "High" },
    ],
  },
  {
    name: "In Progress / Active Build",
    tone: "accent",
    tickets: [
      { title: "E-Commerce Checkout Redesign v2", client: "Clara Boutique", tag: "Frontend", meta: "62% · CI/CD deploying" },
      { title: "Property Search Filter Microservice", client: "Apex Luxury Motors", tag: "Backend", meta: "Blocked · env config", priority: "High" },
      { title: "Google Ads Offline Conversion API Sync", client: "Solaris Energy Co", tag: "Integration", meta: "Python CLI · 40%" },
    ],
  },
  {
    name: "QA & Review",
    tone: "warn",
    tickets: [
      { title: "Client Portal Auth & Magic Links", client: "Sintco Dental", tag: "Security", meta: "92% coverage · 2 open PRs", priority: "High" },
      { title: "Landing Page Speed Optimization", client: "Nova Fitness Studio", tag: "Perf", meta: "Lighthouse 96/100 · Ready for QA" },
    ],
  },
  {
    name: "Production Deployed",
    tone: "up",
    tickets: [
      { title: "Corporate Website Launch", client: "Apex Luxury Motors", tag: "Launch", meta: "Deployed today" },
      { title: "Lead Gen Funnel v3", client: "Clara Boutique", tag: "Marketing", meta: "High-converting funnel live" },
    ],
  },
];

const VELOCITY = [
  { day: "Mon", builds: 3 }, { day: "Tue", builds: 5 }, { day: "Wed", builds: 4 },
  { day: "Thu", builds: 6 }, { day: "Fri", builds: 7 }, { day: "Sat", builds: 2 }, { day: "Sun", builds: 1 },
];

function toneColor(tone: "neutral" | "accent" | "warn" | "up") {
  return tone === "accent" ? "var(--accent)" : tone === "warn" ? "var(--warn)" : tone === "up" ? "var(--up)" : "var(--text-4)";
}

export default function ProjectsPage() {
  const total = COLUMNS.reduce((n, c) => n + c.tickets.length, 0);

  return (
    <>
      <ConsoleTopBar
        section="Projects & Dev"
        actions={<Button variant="accent" size="sm"><Plus className="w-3.5 h-3.5" /> New Dev Ticket</Button>}
      />

      <div className="hq-rise">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="headline text-[26px] md:text-[30px] font-semibold tracking-[-0.015em] text-[var(--text)]">
              Projects &amp; Dev Pipeline
            </h1>
            <p className="mt-1 text-[13.5px] text-[var(--text-2)]">
              Orchestration hub / dev environment · {total} total projects across 4 clients
            </p>
          </div>
          <Button variant="ghost" size="sm"><GitBranch className="w-3.5 h-3.5" /> Trigger CI/CD Pipeline</Button>
        </div>

        {/* kanban board */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 items-start">
          {COLUMNS.map((col) => (
            <div key={col.name}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: toneColor(col.tone) }} />
                <span className="eyebrow !text-[10.5px]">{col.name}</span>
                <span className="num text-[10.5px] text-[var(--text-4)] ml-auto">{col.tickets.length}</span>
              </div>
              <div className="space-y-2.5">
                {col.tickets.map((t) => (
                  <Panel key={t.title} interactive className="p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <Pill tone="neutral">{t.tag}</Pill>
                      {t.priority === "High" && <Pill tone="down">High</Pill>}
                    </div>
                    <p className="mt-2 text-[13px] font-medium text-[var(--text)] leading-snug">{t.title}</p>
                    <p className="mt-1 text-[11px] text-[var(--text-3)]">{t.client}</p>
                    <p className="mt-1.5 num text-[10.5px] text-[var(--text-4)]">{t.meta}</p>
                  </Panel>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* stats row */}
        <div className="grid lg:grid-cols-[1fr_260px_260px] gap-4">
          <Panel className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Eyebrow>Weekly Deploy Velocity</Eyebrow>
              <span className="num text-[13px] font-semibold text-[var(--text)]">28 automated builds</span>
            </div>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={VELOCITY} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                  <Bar dataKey="builds" fill="var(--accent)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <StatCard label="Target Cluster Uptime" value="2 Clusters" delta="Active" deltaTone="up" hint="stg-01, stg-02" icon={<Zap className="w-4 h-4" />} />

          <Panel className="p-4 flex flex-col justify-between">
            <div>
              <Eyebrow>Ad-Hoc Worker</Eyebrow>
              <p className="mt-2 text-[11.5px] text-[var(--text-3)]">Trigger an emergency cache-bust and edge dispatch for any active client stack.</p>
            </div>
            <Button variant="ghost" size="sm" className="mt-3 !justify-center"><Trash2 className="w-3.5 h-3.5" /> Purge Edge Cache</Button>
          </Panel>
        </div>
      </div>
    </>
  );
}
