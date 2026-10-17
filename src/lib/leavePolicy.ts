// src/lib/leavePolicy.ts
// NEW FILE — single source of truth for the Malus Robotics 2026 Leave &
// Holiday Policy (effective 01 Jan 2026), transcribed from
// Malus_Robotics_Leave_Policy_2026.pdf. Both the Leave page UI and the
// /api/leaves route import from here so the rule only lives in one place.
//
// WHAT'S DELIBERATELY NOT AUTOMATED YET (flagged, not guessed):
// The policy's Earned Leave (EL) accrual rule — "3 consecutive weeks
// (21 scheduled working days) without taking leave earns 1 EL day,
// credited the following year" — requires reading attendance/leave
// history to compute a running streak. That's a real feature (it needs
// your Attendance records, not just Leave records) and is intentionally
// left out of this pass so it isn't guessed at. For now, EARNED and
// COMPENSATORY balances are shown as "managed by HR" rather than
// computed, and the UI says so plainly rather than inventing a number.
// Say the word and I'll build the attendance-driven EL accrual engine
// as a follow-up.

export type LeaveType = "SICK" | "EARNED" | "COMPENSATORY";

export const LEAVE_TYPES: LeaveType[] = ["SICK", "EARNED", "COMPENSATORY"];

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  SICK: "Sick Leave",
  EARNED: "Earned Leave",
  COMPENSATORY: "Compensation Leave",
};

export const LEAVE_TYPE_SHORT: Record<LeaveType, string> = {
  SICK: "SL",
  EARNED: "EL",
  COMPENSATORY: "Comp-off",
};

export const LEAVE_TYPE_COLOR: Record<LeaveType, string> = {
  SICK: "var(--red)",
  EARNED: "var(--green)",
  COMPENSATORY: "var(--yellow)",
};

export const LEAVE_TYPE_DESCRIPTION: Record<LeaveType, string> = {
  SICK: "For personal illness, medical treatment or recovery. Inform your manager/HR as early as reasonably possible.",
  EARNED: "For planned personal leave. Earned through 3 consecutive weeks (21 scheduled working days) worked without taking leave; credited the following year. Prior approval required except in genuine emergencies.",
  COMPENSATORY: "Available when you're required and approved to work on a declared holiday or weekly off — one compensatory day off, or one day's pay, as approved.",
};

// Section 5 — Sick Leave: fixed annual entitlement.
export const SICK_LEAVE_ANNUAL_ENTITLEMENT = 7;

// Section 8 — Leave Planning and Quarterly Limit. Applies to planned
// personal/earned leave only — sick leave and genuine emergency leave are
// explicitly treated separately and are NOT subject to this cap.
export const QUARTERLY_LIMIT_DAYS = 3;
export const MAX_CONSECUTIVE_DAYS = 3;
export const QUARTERLY_LIMIT_APPLIES_TO: LeaveType[] = ["EARNED"];
export const SANDWICH_RULE_APPLIES_TO: LeaveType[] = ["EARNED"];

// Section 7 — Weekly Off: alternate Saturdays. 1st & 3rd Saturday of each
// month are weekly offs; 2nd, 4th and 5th Saturdays are working days
// unless separately declared otherwise. Sundays are always off.
export function isWeeklyOff(date: Date): boolean {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0) return true;
  if (day === 6) {
    const occurrence = Math.ceil(date.getDate() / 7); // 1st..5th Saturday of the month
    return occurrence === 1 || occurrence === 3;
  }
  return false;
}

// Section 14 — 2026 Holiday Calendar (Maharashtra Government notification,
// as circulated by Malus Robotics). Keep this list updated each year —
// it's the only part of this file that needs a yearly refresh.
export const HOLIDAYS_2026: { date: string; name: string }[] = [
  { date: "2026-01-26", name: "Republic Day" },
  { date: "2026-02-15", name: "Mahashivratri" },
  { date: "2026-02-19", name: "Chhatrapati Shivaji Maharaj Jayanti" },
  { date: "2026-03-03", name: "Holi (Second Day)" },
  { date: "2026-03-19", name: "Gudhi Padwa" },
  { date: "2026-03-21", name: "Ramzan-Id (Id-Ul-Fitra)" },
  { date: "2026-03-26", name: "Ram Navami" },
  { date: "2026-03-31", name: "Mahavir Janmakalyanak" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-04-14", name: "Dr. Babasaheb Ambedkar Jayanti" },
  { date: "2026-05-01", name: "Maharashtra Din / Buddha Pournima" },
  { date: "2026-05-28", name: "Bakri Id (Id-Uz-Zuha)" },
  { date: "2026-06-26", name: "Moharum" },
  { date: "2026-08-15", name: "Independence Day / Parsi New Year" },
  { date: "2026-08-26", name: "Id-E-Milad" },
  { date: "2026-09-14", name: "Ganesh Chaturthi" },
  { date: "2026-10-02", name: "Mahatma Gandhi Jayanti" },
  { date: "2026-10-20", name: "Dasara" },
  { date: "2026-11-08", name: "Diwali Amavasya (Laxmi Pujan)" },
  { date: "2026-11-10", name: "Diwali (Bali Pratipada)" },
  { date: "2026-11-24", name: "Guru Nanak Jayanti" },
  { date: "2026-12-25", name: "Christmas" },
];

const HOLIDAY_SET = new Set(HOLIDAYS_2026.map((h) => h.date));

function toDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function isHoliday(date: Date): boolean {
  return HOLIDAY_SET.has(toDateKey(date));
}

export function holidayName(date: Date): string | null {
  return HOLIDAYS_2026.find((h) => h.date === toDateKey(date))?.name ?? null;
}

// Counts actual working days in [from, to] inclusive — excludes weekly
// offs (alternate Saturdays + Sundays) and declared holidays. This is what
// actually gets deducted from quota, since the policy's quarterly/
// consecutive limits are about working days taken as leave, not raw
// calendar span.
export function workingDaysBetween(fromStr: string, toStr: string): number {
  if (!fromStr || !toStr) return 0;
  const from = new Date(fromStr);
  const to = new Date(toStr);
  if (to < from) return 0;

  let count = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    if (!isWeeklyOff(cursor) && !isHoliday(cursor)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

// Section 9 — Sandwich Rule: planned leave shouldn't be taken immediately
// on both sides of an already-declared holiday (e.g. holiday Monday, leave
// on both Friday and Tuesday). This checks the requested range's immediate
// neighbours; checking "already-approved leave on the other side" needs the
// caller to pass the employee's other leave dates (done server-side in the
// API route, which has DB access).
export function touchesHolidayBoundary(fromStr: string, toStr: string): {
  dayBefore: string | null; // date string of the holiday immediately before `from`, if any
  dayAfter: string | null;  // date string of the holiday immediately after `to`, if any
} {
  const from = new Date(fromStr);
  const to = new Date(toStr);
  const before = new Date(from);
  before.setDate(before.getDate() - 1);
  const after = new Date(to);
  after.setDate(after.getDate() + 1);

  return {
    dayBefore: isHoliday(before) ? toDateKey(before) : null,
    dayAfter: isHoliday(after) ? toDateKey(after) : null,
  };
}

// Given a date, return the ISO quarter key "2026-Q1".."2026-Q4" — used to
// group leave applications for the quarterly-limit check.
export function quarterKey(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}
