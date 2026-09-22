import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  const type = url.searchParams.get("type");
  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (type) where.type = type;

  const tasks = await prisma.hermesTask.findMany({
    where, include: { client: { select: { id: true, clientName: true } } },
    orderBy: [{ status: "asc" }, { priority: "desc" }], take: 200,
  });
  const counts: Record<string, number> = {};
  for (const t of tasks) counts[t.status] = (counts[t.status] || 0) + 1;
  const lastSync = tasks[0]?.syncedAt ?? null;
  return NextResponse.json({ tasks, counts, total: tasks.length, lastSync });
}
