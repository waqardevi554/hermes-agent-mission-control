import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const take = Math.min(Number(url.searchParams.get("take") || 40), 100);
  const source = url.searchParams.get("source"); // "bridge" | "hermes" | omitted (both)
  const events = await prisma.agentEvent.findMany({
    where: source ? { source } : undefined,
    orderBy: { createdAt: "desc" },
    take,
  });
  return NextResponse.json({ events });
}
