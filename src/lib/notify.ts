// src/lib/notify.ts
// NEW FILE — the single function every route calls to raise an alert.
// Call this from wherever a leave gets approved/rejected, an expense gets
// actioned, a task gets assigned (from the PM tool's employees-proxy flow),
// or the birthday cron fires. It never throws on failure — a notification
// that fails to write should not break the action that triggered it (e.g.
// an admin approving leave shouldn't get a 500 because Mongo hiccuped).

import { connectDB } from "@/lib/mongodb";
import Notification, { NotificationType } from "@/models/Notification";

export async function notify(
  employeeId: string,
  type: NotificationType,
  title: string,
  body: string = "",
  link: string = ""
) {
  try {
    await connectDB();
    await Notification.create({ employeeId, type, title, body, link });
  } catch (err) {
    console.error("notify() failed:", err);
  }
}

// Convenience wrappers — use these at call sites so the message copy stays
// consistent everywhere instead of being re-typed per route.
export const notifyLeaveApproved = (employeeId: string, leaveType: string, from: string, to: string) =>
  notify(
    employeeId,
    "LEAVE_APPROVED",
    "Leave approved",
    `Your ${leaveType} leave from ${from} to ${to} has been approved.`,
    "/dashboard/leaves"
  );

export const notifyLeaveRejected = (employeeId: string, leaveType: string, from: string, to: string, reason?: string) =>
  notify(
    employeeId,
    "LEAVE_REJECTED",
    "Leave rejected",
    `Your ${leaveType} leave from ${from} to ${to} was rejected.${reason ? ` Reason: ${reason}` : ""}`,
    "/dashboard/leaves"
  );

export const notifyTaskAssigned = (employeeId: string, projectName: string, stage: string) =>
  notify(
    employeeId,
    "TASK_ASSIGNED",
    "New task assigned",
    `${projectName}: ${stage}`,
    "/dashboard/tasks"
  );

export const notifyExpenseApproved = (employeeId: string, amount: number, description: string) =>
  notify(
    employeeId,
    "EXPENSE_APPROVED",
    "Expense approved",
    `₹${amount.toLocaleString("en-IN")} — ${description}`,
    "/dashboard/expense"
  );

export const notifyExpenseRejected = (employeeId: string, amount: number, description: string, reason?: string) =>
  notify(
    employeeId,
    "EXPENSE_REJECTED",
    "Expense rejected",
    `₹${amount.toLocaleString("en-IN")} — ${description}${reason ? ` · ${reason}` : ""}`,
    "/dashboard/expense"
  );

export const notifyBirthday = (employeeId: string, name: string) =>
  notify(
    employeeId,
    "BIRTHDAY",
    "🎉 Happy Birthday!",
    `Wishing you a fantastic day, ${name}! — Team Malus Robotics`,
    "/dashboard"
  );
