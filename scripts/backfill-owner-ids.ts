// ============================================================
// EMPLOYEE PORTAL REPO — scripts/backfill-owner-ids.ts
// One-time script. Run with: npx tsx scripts/backfill-owner-ids.ts
//
// Matches existing Progress.owner (free-text name) against real
// Employees, and sets ownerId where an exact (case-insensitive,
// trimmed) match is found. Prints anything it couldn't match so
// you can fix those by hand.
// ============================================================

import "dotenv/config";
import { connectDB } from "../src/lib/mongodb";
import Progress from "../src/models/Progress";
import { prisma } from "../src/lib/prisma";

async function main() {
  await connectDB();

  const employees = await prisma.employee.findMany({ select: { employeeId: true, name: true } });
  const nameMap = new Map(employees.map(e => [e.name.trim().toLowerCase(), e.employeeId]));

  const unmatched: string[] = [];
  let updated = 0;

  const entries = await Progress.find({ ownerId: { $exists: false } });

  for (const entry of entries) {
    const key = (entry.owner || "").trim().toLowerCase();
    const employeeId = nameMap.get(key);
    if (employeeId) {
      entry.ownerId = employeeId;
      await entry.save();
      updated++;
    } else if (entry.owner) {
      unmatched.push(entry.owner);
    }
  }

  console.log(`Updated ${updated} entries.`);
  if (unmatched.length) {
    console.log("Could not match these owner names to any employee:");
    console.log([...new Set(unmatched)].join("\n"));
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });