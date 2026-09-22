import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH { clientId?, type? } — dashboard-owned tags on a HermesTask row.
// Hermes's kanban CLI has no concept of either field, and the bridge's
// mirrorKanban() UPDATE never touches these columns, so they survive every
// mirror tick untouched.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (b.clientId !== undefined) data.clientId = b.clientId || null;
  if (b.type !== undefined) data.type = b.type || null;
  if (!Object.keys(data).length) return NextResponse.json({ error: "clientId or type required" }, { status: 400 });

  const existing = await prisma.hermesTask.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const task = await prisma.hermesTask.update({ where: { id }, data });
  return NextResponse.json({ task });
}
