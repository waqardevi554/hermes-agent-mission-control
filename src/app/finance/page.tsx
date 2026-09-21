"use client";

import { useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { ConsoleTopBar } from "@/components/console-topbar";
import { Panel, Pill, Button, Eyebrow, StatCard } from "@/components/ui/kit";

const INVOICES = [
  { id: "INV-2024-051", client: "Sintco Dental", pkg: "Q4 Retainer", amount: "$4,500", status: "Paid" as const, date: "Oct 24" },
  { id: "INV-2024-050", client: "Apex Luxury Motors", pkg: "Performance Mgmt", amount: "$3,000", status: "Paid" as const, date: "Oct 22" },
  { id: "INV-2024-049", client: "Nova Fitness Studio", pkg: "Q4 Lead Package", amount: "$1,800", status: "Scheduled" as const, date: "Oct 30" },
  { id: "INV-2024-048", client: "Solaris Energy Co", pkg: "Q4 Maintenance & Lease", amount: "$5,500", status: "Overdue" as const, date: "Oct 15" },
];

const DEALS = {
  Discovery: [
    { name: "Meridian Fintech Co", value: "$8,500", tag: "Won Likely" },
    { name: "GreenLeaf E-Commerce", value: "$5,500", tag: "Cold Call" },
    { name: "Atlas Clean Energy", value: "$4,000", tag: "Discovery Call" },
  ],
  "Proposal Sent": [
    { name: "Coastal Yacht Charters", value: "$22,000", tag: "Formal Proposal" },
    { name: "Sterling Legal Consultants", value: "$8,000", tag: "Web Ads" },
  ],
  Closing: [
    { name: "Falcon Global Solutions", value: "$17,000", tag: "Contract Sent" },
    { name: "Aura Aesthetic Clinic", value: "$2,000", tag: "Verbal Agreed" },
  ],
};

const OUTFLOW = [
  { label: "Ops Cost", pct: 44, amount: "$3,240", color: "var(--primary)" },
  { label: "Ad Tech / Tools", pct: 28, amount: "$2,100", color: "var(--accent)" },
  { label: "Payroll / Contractors", pct: 28, amount: "$2,080", color: "var(--text-3)" },
];

const invoiceTone: Record<string, "up" | "warn" | "down"> = { Paid: "up", Scheduled: "warn", Overdue: "down" };

export default function FinancePage() {
  const [tab, setTab] = useState<"All" | "Paid" | "Scheduled" | "Overdue">("All");
  const filtered = INVOICES.filter((i) => tab === "All" || i.status === tab);

  return (
    <>
      <ConsoleTopBar
        section="Finance & Pipeline"
        actions={<Button variant="ghost" size="sm"><RefreshCw className="w-3.5 h-3.5" /> Sync QuickBooks</Button>}
      />

      <div className="hq-rise">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="headline text-[26px] md:text-[30px] font-semibold tracking-[-0.015em] text-[var(--text)]">
              Financial Engine
            </h1>
            <p className="mt-1 text-[13.5px] text-[var(--text-2)]">Tasheer Digital agency operating ledger — retainers, invoices, and deal pipeline.</p>
          </div>
          <Pill tone="neutral">Tax &amp; Audit Expert Synced</Pill>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Monthly Recurring Revenue" value="$38,400" delta="+5.1%" deltaTone="up" hint="MoM" />
          <StatCard label="Collected This Month" value="$52,650" delta="Retainers + Bonus" deltaTone="neutral" />
          <StatCard label="Outstanding Pipeline" value="$11,200" delta="1 overdue" deltaTone="down" />
          <StatCard label="Deal Pipeline" value="$48,500" delta="7 active" deltaTone="neutral" hint="negotiations" />
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start mb-6">
          <div className="space-y-5">
            <Panel className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Eyebrow>Retainer Health &amp; Subscriptions</Eyebrow>
                <span className="num text-[12px] text-[var(--text-3)]">100% billing retention Q4</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[var(--r-sm)] border border-[var(--line)] p-3">
                  <p className="num text-[20px] font-semibold text-[var(--text)] headline">4</p>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">Growth retainers active</p>
                </div>
                <div className="rounded-[var(--r-sm)] border border-[var(--line)] p-3">
                  <p className="num text-[20px] font-semibold text-[var(--text)] headline">$21,500</p>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">Performance mgmt MRR</p>
                </div>
                <div className="rounded-[var(--r-sm)] border border-[var(--line)] p-3">
                  <p className="num text-[20px] font-semibold text-[var(--text)] headline">$4,500</p>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">Web dev retainer</p>
                </div>
              </div>
            </Panel>

            <Panel className="!p-0 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
                <p className="text-[15px] font-semibold text-[var(--text)] headline">Ledger &amp; Invoices</p>
                <div className="flex gap-1.5">
                  {(["All", "Paid", "Scheduled", "Overdue"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-colors ${
                        tab === t ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "text-[var(--text-2)] border-[var(--line)] hover:border-[var(--line-strong)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      {["Invoice #", "Client & Package", "Amount", "Status", "Date"].map((h) => (
                        <th key={h} className="eyebrow !text-[10px] px-5 py-2.5 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => (
                      <tr key={inv.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                        <td className="px-5 py-3 num text-[12.5px] text-[var(--text-3)] whitespace-nowrap">{inv.id}</td>
                        <td className="px-5 py-3">
                          <p className="text-[13px] font-medium text-[var(--text)]">{inv.client}</p>
                          <p className="text-[11px] text-[var(--text-3)]">{inv.pkg}</p>
                        </td>
                        <td className="px-5 py-3 num text-[13px] text-[var(--text)] whitespace-nowrap">{inv.amount}</td>
                        <td className="px-5 py-3"><Pill tone={invoiceTone[inv.status]}>{inv.status}</Pill></td>
                        <td className="px-5 py-3 num text-[12px] text-[var(--text-3)] whitespace-nowrap">{inv.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel className="p-4">
              <Eyebrow>Deal Funnel &amp; Pipeline</Eyebrow>
              <div className="mt-3 space-y-4">
                {Object.entries(DEALS).map(([stage, deals]) => (
                  <div key={stage}>
                    <p className="eyebrow !text-[10px] mb-1.5">Stage · {stage}</p>
                    <div className="space-y-1.5">
                      {deals.map((d) => (
                        <div key={d.name} className="flex items-center justify-between rounded-[var(--r-sm)] border border-[var(--line)] px-2.5 py-1.5">
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-[var(--text)] truncate">{d.name}</p>
                            <p className="text-[10.5px] text-[var(--text-3)]">{d.tag}</p>
                          </div>
                          <span className="num text-[12px] font-semibold text-[var(--text)] shrink-0">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-4">
              <Eyebrow>Fast Deal Capture</Eyebrow>
              <div className="mt-3 space-y-2">
                <input placeholder="Client name" className="w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--r-sm)] px-3 py-2 text-[12.5px] text-[var(--text)] placeholder-[var(--text-3)] outline-none focus:border-[var(--line-strong)]" />
                <input placeholder="Estimated value ($)" className="w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--r-sm)] px-3 py-2 text-[12.5px] text-[var(--text)] placeholder-[var(--text-3)] outline-none focus:border-[var(--line-strong)]" />
                <select className="w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--r-sm)] px-3 py-2 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--line-strong)]">
                  <option>Stage 1 · Discovery</option>
                  <option>Stage 2 · Proposal Sent</option>
                  <option>Stage 3 · Closing</option>
                </select>
                <Button variant="accent" size="sm" className="w-full !justify-center"><Plus className="w-3.5 h-3.5" /> Create Deal</Button>
              </div>
            </Panel>
          </div>
        </div>

        {/* outflow + margin */}
        <div className="grid lg:grid-cols-[1fr_260px_260px] gap-4">
          <Panel className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Eyebrow>Monthly Outflow Breakdown</Eyebrow>
              <span className="num text-[13px] font-semibold text-[var(--text)]">Total $7,420</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden flex w-full">
              {OUTFLOW.map((o) => (
                <div key={o.label} style={{ width: `${o.pct}%`, background: o.color }} />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {OUTFLOW.map((o) => (
                <div key={o.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.color }} />
                  <div className="min-w-0">
                    <p className="text-[10.5px] text-[var(--text-3)] truncate">{o.label}</p>
                    <p className="num text-[11.5px] text-[var(--text)]">{o.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <StatCard label="Agency Net Margin" value="74.2%" delta="Optimal Tax Tier" deltaTone="up" />
          <StatCard label="Monthly Overhead" value="$7,420" delta="18.2mo runway" deltaTone="neutral" />
        </div>
      </div>
    </>
  );
}
