// src/app/api/leaves/route.ts
// REPLACES the route.ts you pasted — same shape (POST apply / GET list /
// DELETE cancel), with the actual 2026 Leave Policy rules enforced
// server-side instead of just accepting whatever the client sends:
//
//   - day count is recomputed server-side from working days (excludes
//     weekly offs + declared holidays), never trusted from the client
//   - Earned Leave: max 3 days per quarter (Section 8), max 3 consecutive
//     days (Section 8), sandwich-rule check against the holiday calendar
//     and the employee's own other leave dates (Section 9)
//   - Sick Leave: capped at the 7-day annual entitlement (Section 5)
//   - overlap check (same as your original)
//
// Validation failures return a normal {success:false, error} the existing
// LeavePage.tsx already knows how to render in its error box.

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  LeaveType,
  workingDaysBetween,
  touchesHolidayBoundary,
  QUARTERLY_LIMIT_DAYS,
  MAX_CONSECUTIVE_DAYS,
  QUARTERLY_LIMIT_APPLIES_TO,
  SANDWICH_RULE_APPLIES_TO,
  SICK_LEAVE_ANNUAL_ENTITLEMENT,
  quarterKey,
} from "@/lib/leavePolicy";

function getEmployeeId(req: NextRequest): string | null {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { employeeId: string };
    return decoded.employeeId;
  } catch {
    return null;
  }
}

// POST /api/leaves — apply for leave
export async function POST(req: NextRequest) {
  try {
    const employeeId = getEmployeeId(req);
    if (!employeeId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { type, from, to, reason, contactNo } = body as {
      type: LeaveType; from: string; to: string; reason: string; contactNo?: string;
    };

    if (!type || !from || !to || !reason?.trim()) {
      return NextResponse.json({ success: false, error: "type, from, to and reason are required." }, { status: 400 });
    }
    if (!["SICK", "EARNED", "COMPENSATORY"].includes(type)) {
      return NextResponse.json({ success: false, error: "Invalid leave type." }, { status: 400 });
    }
    if (new Date(to) < new Date(from)) {
      return NextResponse.json({ success: false, error: "End date can't be before start date." }, { status: 400 });
    }

    // Day count is ALWAYS computed server-side — never trust the client's
    // number. Excludes weekly offs (alt-Saturdays/Sundays) and holidays.
    const days = workingDaysBetween(from, to);
    if (days === 0) {
      return NextResponse.json({ success: false, error: "The selected range contains no working days." }, { status: 400 });
    }

    // Overlap check (same as original)
    const overlap = await prisma.leave.findFirst({
      where: {
        employeeId,
        status: "PENDING",
        from: { lte: new Date(to) },
        to: { gte: new Date(from) },
      },
    });
    if (overlap) {
      return NextResponse.json({ success: false, error: "You already have a pending leave application that overlaps these dates." }, { status: 409 });
    }

    // Section 8 — quarterly limit + max-consecutive, EARNED only
    if (QUARTERLY_LIMIT_APPLIES_TO.includes(type)) {
      if (days > MAX_CONSECUTIVE_DAYS) {
        return NextResponse.json({
          success: false,
          error: `Earned Leave is normally capped at ${MAX_CONSECUTIVE_DAYS} consecutive working days. Contact HR for an exception.`,
        }, { status: 400 });
      }

      const qKey = quarterKey(from);
      const quarterLeaves = await prisma.leave.findMany({
        where: {
          employeeId,
          type: type as any,
          status: { in: ["PENDING", "APPROVED"] },
        },
      });
      const usedThisQuarter = quarterLeaves
        .filter((l) => quarterKey(l.from.toISOString()) === qKey)
        .reduce((sum, l) => sum + l.days, 0);

      if (usedThisQuarter + days > QUARTERLY_LIMIT_DAYS) {
        return NextResponse.json({
          success: false,
          error: `Earned Leave is capped at ${QUARTERLY_LIMIT_DAYS} days per quarter. You've already used/requested ${usedThisQuarter} day(s) this quarter.`,
        }, { status: 400 });
      }
    }

    // Section 9 — sandwich rule, EARNED only. Flags (doesn't hard-block,
    // since the policy allows HR/manager exceptions) when the request sits
    // immediately against a holiday on one side AND the employee already
    // has another leave entry immediately on the other side of that same
    // holiday — the actual "both sides" pattern the rule targets.
    let sandwichWarning: string | null = null;
    if (SANDWICH_RULE_APPLIES_TO.includes(type)) {
      const { dayBefore, dayAfter } = touchesHolidayBoundary(from, to);
      if (dayBefore || dayAfter) {
        const otherLeaves = await prisma.leave.findMany({
          where: { employeeId, status: { in: ["PENDING", "APPROVED"] } },
        });
        const otherDateKeys = new Set(
          otherLeaves.flatMap((l) => {
            const keys: string[] = [];
            const cur = new Date(l.from);
            const end = new Date(l.to);
            while (cur <= end) { keys.push(cur.toISOString().split("T")[0]); cur.setDate(cur.getDate() + 1); }
            return keys;
          })
        );
        // dayBefore is the holiday right before `from` — the sandwich
        // pattern needs a leave day right before THAT holiday too.
        if (dayBefore) {
          const holidayDate = new Date(dayBefore);
          const checkDate = new Date(holidayDate);
          checkDate.setDate(checkDate.getDate() - 1);
          if (otherDateKeys.has(checkDate.toISOString().split("T")[0])) {
            sandwichWarning = `This request borders ${dayBefore}, and you already have leave on the day before that holiday too — this looks like a sandwich-leave pattern (Section 9). It's been submitted, but may need Reporting Manager / HR approval.`;
          }
        }
        if (dayAfter && !sandwichWarning) {
          const holidayDate = new Date(dayAfter);
          const checkDate = new Date(holidayDate);
          checkDate.setDate(checkDate.getDate() + 1);
          if (otherDateKeys.has(checkDate.toISOString().split("T")[0])) {
            sandwichWarning = `This request borders ${dayAfter}, and you already have leave on the day after that holiday too — this looks like a sandwich-leave pattern (Section 9). It's been submitted, but may need Reporting Manager / HR approval.`;
          }
        }
      }
    }

    // Section 5 — Sick Leave annual cap
    if (type === "SICK") {
      const year = new Date(from).getFullYear();
      const yearStart = new Date(`${year}-01-01`);
      const yearEnd = new Date(`${year}-12-31`);
      const sickThisYear = await prisma.leave.findMany({
        where: {
          employeeId,
          type: "SICK" as any,
          status: { in: ["PENDING", "APPROVED"] },
          from: { gte: yearStart, lte: yearEnd },
        },
      });
      const usedThisYear = sickThisYear.reduce((sum, l) => sum + l.days, 0);
      if (usedThisYear + days > SICK_LEAVE_ANNUAL_ENTITLEMENT) {
        return NextResponse.json({
          success: false,
          error: `Sick Leave is capped at ${SICK_LEAVE_ANNUAL_ENTITLEMENT} days per year. You've already used/requested ${usedThisYear} day(s) this year.`,
        }, { status: 400 });
      }
    }

    const leave = await prisma.leave.create({
      data: {
        employeeId,
        type: type as any,
        from: new Date(from),
        to: new Date(to),
        days,
        reason: reason.trim(),
        contactNo: contactNo?.trim() || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, leave, warning: sandwichWarning });
  } catch (error) {
    console.error("Leave apply error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

// GET /api/leaves — fetch all leaves for logged-in employee
export async function GET(req: NextRequest) {
  try {
    const employeeId = getEmployeeId(req);
    if (!employeeId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const leaves = await prisma.leave.findMany({
      where: { employeeId },
      orderBy: { appliedOn: "desc" },
    });

    return NextResponse.json({ success: true, leaves });
  } catch (error) {
    console.error("Leave fetch error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/leaves?id=xxx — cancel a PENDING leave
export async function DELETE(req: NextRequest) {
  try {
    const employeeId = getEmployeeId(req);
    if (!employeeId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Leave ID required" }, { status: 400 });

    const leave = await prisma.leave.findUnique({ where: { id } });

    if (!leave || leave.employeeId !== employeeId) {
      return NextResponse.json({ success: false, error: "Leave not found" }, { status: 404 });
    }
    if (leave.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "Only pending leaves can be cancelled." }, { status: 409 });
    }

    await prisma.leave.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Leave cancelled." });
  } catch (error) {
    console.error("Leave cancel error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
