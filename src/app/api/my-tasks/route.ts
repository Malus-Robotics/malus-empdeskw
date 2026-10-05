// ============================================================
// EMPLOYEE PORTAL REPO — src/app/api/my-tasks/route.ts
//
// GET: every Progress entry where `owner` matches the logged-in
// employee's name. Matching is case-insensitive and trimmed
// since `owner` is free text, typed by whoever logs it in the
// PM tool — exact-string matching would silently drop entries
// over a stray space or capitalization difference.
// ============================================================

import { connectDB } from "@/lib/mongodb";
import Progress from "@/models/Progress";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// Adjust this to however you actually resolve the logged-in
// employee elsewhere in this app (e.g. your /api/me route) —
// this mirrors that same session-cookie pattern.
async function getSessionEmployeeId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { employeeId?: string };
    return payload.employeeId || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const employeeId = await getSessionEmployeeId(req);
  if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employee = await prisma.employee.findUnique({ where: { employeeId } });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  await connectDB();

  // Primary: exact match on ownerId (reliable, set by the PM tool's dropdown).
  // Fallback: fuzzy name match on the legacy `owner` free-text field, for
  // entries created before ownerId existed. Once all old entries are
  // backfilled (see migration note below), the fallback can be removed.
  const entries = await Progress.find({
    $or: [
      { ownerId: employeeId },
      {
        ownerId: { $exists: false },
        owner: { $regex: `^${escapeRegex(employee.name.trim())}$`, $options: "i" },
      },
    ],
  }).sort({ date: -1 });

  // Mark as seen now that they've actually been fetched for viewing —
  // clears the sidebar badge. Fire-and-forget is fine here; worst case
  // the badge is stale by one refresh if this fails.
  const unseenIds = entries.filter(e => !e.seenByOwner).map(e => e._id);
  if (unseenIds.length) {
    Progress.updateMany({ _id: { $in: unseenIds } }, { $set: { seenByOwner: true } }).catch(() => {});
  }

  return NextResponse.json({ tasks: entries, matchedName: employee.name });
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}