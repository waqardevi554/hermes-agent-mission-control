// One-off seed for the AgentProfile registry (dashboard-side role classification,
// see prisma/schema.prisma's AgentProfile model). Run manually: node scripts/seed-agent-profiles.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROFILES = [
  { role: "researcher", name: "Researcher", emoji: "🔎" },
  { role: "writer", name: "Writer", emoji: "✍️" },
  { role: "campaign-optimizer", name: "Campaign Optimizer", emoji: "📈" },
  { role: "qa", name: "QA", emoji: "✅" },
  { role: "reporter", name: "Reporter", emoji: "📊" },
  { role: "general", name: "General", emoji: "🤖" },
];

for (const p of PROFILES) {
  await prisma.agentProfile.upsert({
    where: { role: p.role },
    update: { name: p.name, emoji: p.emoji },
    create: p,
  });
  console.log(`seeded: ${p.role}`);
}

await prisma.$disconnect();
