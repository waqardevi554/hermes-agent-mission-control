import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ACTIVE_STATUSES = ["queued", "approved", "running"];

// GET → the agent registry: seeded AgentProfile rows joined with status/
// currentTask/totalCost/recentActivity computed live from real AgentRequest
// data grouped by role. Deliberately not stored columns (that was the flaw
// in the old fictional AgentState model — denormalized fields drift from
// truth); everything here is read-time aggregation over the real bus.
// Lives under /api/hermes/* like every other real-bus endpoint — NOT at
// /api/agents, which already backs the separate, unrelated legacy
// AgentState/"Max, Sage, Knox…" decorative persona system (see AGENTS.md §6).
export async function GET() {
  const profiles = await prisma.agentProfile.findMany({ orderBy: { name: "asc" } });

  const agents = await Promise.all(
    profiles.map(async (p) => {
      const [active, totalCostAgg, recent] = await Promise.all([
        prisma.agentRequest.findFirst({
          where: { role: p.role, status: { in: ACTIVE_STATUSES } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.agentRequest.aggregate({ where: { role: p.role }, _sum: { costUsd: true }, _count: true }),
        prisma.agentRequest.findMany({
          where: { role: p.role }, orderBy: { createdAt: "desc" }, take: 5,
          select: { id: true, title: true, status: true, createdAt: true },
        }),
      ]);
      return {
        role: p.role,
        name: p.name,
        emoji: p.emoji,
        active: p.active,
        status: active ? "running" : totalCostAgg._count > 0 ? "idle" : "offline",
        currentTask: active?.title ?? null,
        totalCost: totalCostAgg._sum.costUsd,
        requestCount: totalCostAgg._count,
        recentActivity: recent,
      };
    })
  );

  return NextResponse.json({ agents });
}
