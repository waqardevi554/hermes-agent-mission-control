import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // e.g. "awaiting_approval"
  const kind = url.searchParams.get("kind"); // e.g. "report.review"
  const clientId = url.searchParams.get("clientId");
  const take = Math.min(Number(url.searchParams.get("take") || 50), 200);
  const where: Record<string, unknown> = {};
  if (status) where.status = { in: status.split(",") };
  if (kind) where.kind = { in: kind.split(",") };
  if (clientId) where.clientId = clientId;
  const requests = await prisma.agentRequest.findMany({
    where, orderBy: { createdAt: "desc" }, take,
  });
  // scoped to the same kind/clientId filters, so a filtered view (e.g. Reporting's
  // kind=report.review inbox) shows its own pending count, not the global one.
  const pending = await prisma.agentRequest.count({ where: { ...where, status: "awaiting_approval" } });
  return NextResponse.json({ requests, pending });
}
