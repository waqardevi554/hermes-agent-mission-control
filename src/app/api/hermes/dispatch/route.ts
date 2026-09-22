import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Approximate keyword fallback when a dispatch doesn't specify a role —
// same "good enough, not authoritative" spirit as /projects' uiColumnFor().
function inferRole(title: string): string {
  const t = title.toLowerCase();
  if (/research|look ?up|find out|investigate/.test(t)) return "researcher";
  if (/write|draft|copy|caption|script/.test(t)) return "writer";
  if (/campaign|ad spend|budget|optimi[sz]e|meta ads|google ads/.test(t)) return "campaign-optimizer";
  if (/qa|review|check|verify|audit/.test(t)) return "qa";
  if (/report|summary|digest/.test(t)) return "reporter";
  return "general";
}

// POST { kind?, title, prompt?, sideEffecting?, clientId?, role? } → queue work for Hermes.
// Side-effecting work waits for approval; safe work is queued immediately.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const title = (b.title || b.prompt || "").toString().trim();
  if (!title) return NextResponse.json({ error: "title or prompt required" }, { status: 400 });
  const sideEffecting = Boolean(b.sideEffecting);
  const row = await prisma.agentRequest.create({
    data: {
      origin: "web",
      kind: (b.kind || "oneshot").toString(),
      title: title.slice(0, 200),
      prompt: (b.prompt ?? b.title ?? "").toString() || null,
      sideEffecting,
      status: sideEffecting ? "awaiting_approval" : "queued",
      clientId: b.clientId ? b.clientId.toString() : null,
      role: b.role ? b.role.toString() : inferRole(title),
    },
  });
  return NextResponse.json({ request: row });
}
