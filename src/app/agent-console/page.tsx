"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Edit3,
  Lock,
  Send,
  ShieldAlert,
  Terminal,
  XCircle,
} from "lucide-react";
import { ConsoleTopBar } from "@/components/console-topbar";
import { Panel, Pill, Button, Eyebrow } from "@/components/ui/kit";

const MODES = ["Conservative", "Balanced", "Fully Autonomous"] as const;

const EXECUTION_LOG = [
  { t: "11:42:03", line: 'tool_call: send_message channel="whatsapp" status=queued' },
  { t: "11:41:58", line: "memory_retrieval: 12 relevant docs · client=solaris-energy" },
  { t: "11:41:40", line: "policy_check: budget_delta=$500 threshold=$500 → pass" },
  { t: "11:41:22", line: "check_budget_pacing() → spend_rate 1.34x baseline" },
  { t: "11:41:05", line: 'evaluate_intent(msg) → intent="budget_increase" conf=0.94' },
];

export default function AgentConsolePage() {
  const [mode, setMode] = useState<(typeof MODES)[number]>("Balanced");

  return (
    <>
      <ConsoleTopBar
        section="Agent Console"
        actions={
          <>
            <Button variant="ghost" size="sm">Clear Context</Button>
            <Button variant="primary" size="sm"><Lock className="w-3.5 h-3.5" /> Kill Switch</Button>
          </>
        }
      />

      <div className="hq-rise">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <h1 className="headline text-[24px] md:text-[28px] font-semibold tracking-[-0.015em] text-[var(--text)]">
              Hermes Agent Console
            </h1>
            <Pill tone="accent">HRS v2.4</Pill>
            <Pill tone="up">Active &amp; Listening</Pill>
          </div>

          {/* autonomy mode segmented control */}
          <div className="inline-flex items-center rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface-1)] p-0.5">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors ${
                  mode === m ? "bg-[var(--primary)] text-white" : "text-[var(--text-2)] hover:text-[var(--text)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
          {/* conversation thread */}
          <Panel className="!p-0 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--line)] flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold text-[var(--text)]">Fatima Noor — Solaris Energy Co</p>
                <p className="text-[11.5px] text-[var(--text-3)]">WhatsApp · Today, 09:14 AM</p>
              </div>
              <Pill tone="neutral">Approval Required</Pill>
            </div>

            <div className="p-5 space-y-4">
              {/* inbound client message */}
              <div className="max-w-[85%]">
                <div className="rounded-[var(--r-md)] rounded-tl-none bg-[var(--surface-2)] border border-[var(--line)] px-4 py-2.5">
                  <p className="text-[13px] text-[var(--text)]">
                    Hi team, we&rsquo;re seeing strong traction on the weekend campaign — can we push our budget by
                    $500 from Friday through Sunday?
                  </p>
                </div>
                <p className="mt-1 text-[10.5px] num text-[var(--text-4)]">09:14 AM</p>
              </div>

              {/* scratchpad reasoning */}
              <Panel className="!bg-[var(--surface-3)] p-3.5">
                <div className="flex items-center justify-between">
                  <Eyebrow>Hermes Agent Scratchpad</Eyebrow>
                  <span className="num text-[11px] text-[var(--text-3)]">Confidence 94%</span>
                </div>
                <p className="mt-2 text-[12px] text-[var(--text-2)] leading-relaxed">
                  Detected weekend budget pacing spike (1.34x baseline). Policy evaluation: increase exceeds the
                  $500 autonomous-execution threshold — drafted a reply and queued the budget change for
                  operator approval rather than auto-executing.
                </p>
                <label className="mt-3 flex items-center gap-2 text-[12px] text-[var(--text-2)]">
                  <input type="checkbox" defaultChecked className="accent-[var(--accent)]" />
                  Auto-adjust Meta Ads Set Budget ($150 → $500) simultaneously upon approval
                </label>
              </Panel>

              {/* generated response */}
              <div className="max-w-[85%] ml-auto">
                <div className="rounded-[var(--r-md)] rounded-tr-none bg-[var(--primary)] px-4 py-2.5">
                  <p className="text-[13px] text-white">
                    Hi Fatima — great catch. I&rsquo;ve reviewed the campaign pacing: converting at 4.1x ROAS, an
                    extra $500 for the weekend would yield an estimated 65&ndash;75 qualified inquiries.
                    I&rsquo;ve queued the budget adjustment, ready to activate now.
                  </p>
                </div>
                <p className="mt-1 text-[10.5px] num text-[var(--text-4)] text-right">Hermes Generated Response</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="accent" size="sm"><CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; Send via WhatsApp</Button>
                <Button variant="ghost" size="sm"><Edit3 className="w-3.5 h-3.5" /> Edit Reply</Button>
                <Button variant="ghost" size="sm"><XCircle className="w-3.5 h-3.5" /> Reject &amp; Reply Manually</Button>
              </div>
            </div>

            <div className="border-t border-[var(--line)] p-3 flex items-center gap-2">
              <input
                placeholder="Type a manual override message…"
                className="flex-1 bg-transparent border border-[var(--line)] rounded-[var(--r-sm)] px-3 py-2 text-[13px] text-[var(--text)] placeholder-[var(--text-3)] outline-none focus:border-[var(--line-strong)]"
              />
              <Button variant="primary" size="sm"><Send className="w-3.5 h-3.5" /> Send Direct</Button>
            </div>
          </Panel>

          {/* right column */}
          <div className="space-y-4">
            <Panel className="!p-0 overflow-hidden !bg-[#14161a] !border-[#2a2d33]">
              <div className="px-4 py-3 border-b border-[#2a2d33] flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a0a3a8]">
                  Autonomous Execution Log
                </span>
              </div>
              <div className="p-4 space-y-2 max-h-[280px] overflow-y-auto">
                {EXECUTION_LOG.map((e, i) => (
                  <p key={i} className="font-mono text-[11px] leading-relaxed">
                    <span className="text-[#6b6e74]">[{e.t}]</span>{" "}
                    <span className="text-[#c9cdd3]">{e.line}</span>
                  </p>
                ))}
              </div>
            </Panel>

            <Panel className="p-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-[var(--text-3)]" />
                <Eyebrow>Direct Operator Command Prompt</Eyebrow>
              </div>
              <p className="mt-2 text-[11.5px] text-[var(--text-3)]">
                Dispatch natural-language directives to Hermes via chain-of-approval.
              </p>
              <textarea
                rows={3}
                placeholder="e.g. Pause all Meta campaigns for Nova Fitness until Monday…"
                className="mt-3 w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-[var(--r-sm)] px-3 py-2 text-[12.5px] text-[var(--text)] placeholder-[var(--text-3)] outline-none focus:border-[var(--line-strong)] resize-none"
              />
              <Button variant="primary" size="sm" className="mt-2 w-full !justify-center">
                <Send className="w-3.5 h-3.5" /> Dispatch Task
              </Button>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
