// src/models/Notification.ts
// NEW FILE — same Mongoose/MongoDB connection as src/models/Progress.ts
// (uses the existing connectDB() from src/lib/mongodb.ts, no new env vars).
//
// This is the general alert system: task-assigned/updated, leave
// approved/rejected, expense status, birthday wishes, and anything else
// later all write a row here, and the NotificationBell component (below)
// polls it — the exact same pattern you already have for the Tasks nav
// badge (seenByOwner on Progress), just generalized to every alert type
// instead of only tasks.

import mongoose from "mongoose";

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "LEAVE_APPROVED"
  | "LEAVE_REJECTED"
  | "LEAVE_SUBMITTED"
  | "EXPENSE_APPROVED"
  | "EXPENSE_REJECTED"
  | "BIRTHDAY"
  | "ANNOUNCEMENT";

const NotificationSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "TASK_ASSIGNED",
        "TASK_UPDATED",
        "LEAVE_APPROVED",
        "LEAVE_REJECTED",
        "LEAVE_SUBMITTED",
        "EXPENSE_APPROVED",
        "EXPENSE_REJECTED",
        "BIRTHDAY",
        "ANNOUNCEMENT",
      ],
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    link: { type: String, default: "" }, // e.g. "/dashboard/tasks", "/dashboard/leaves"
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// One compound index for the common query: unread-count-for-this-employee
NotificationSchema.index({ employeeId: 1, read: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
