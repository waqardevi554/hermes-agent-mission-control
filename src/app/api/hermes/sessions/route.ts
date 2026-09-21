import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sessions = await prisma.hermesSession.findMany({ orderBy: { lastActiveAt: "desc" }, take: 100 });
  const lastSync = sessions[0]?.syncedAt ?? null;
  return NextResponse.json({ sessions, total: sessions.length, lastSync });
}
