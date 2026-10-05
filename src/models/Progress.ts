// ============================================================
// EMPLOYEE PORTAL REPO — src/models/Progress.ts
//
// Corrected to match the PM tool's ACTUAL schema (the earlier
// version I gave had invented fields that don't exist — this
// one matches models/Progress.js in the PM tool repo exactly).
// ============================================================

import mongoose from "mongoose";

const ProgressSchema = new mongoose.Schema(
  {
    uploadedBy: String,
    projectId: String,
    date: String,

    startDate: String,
    endDate: String,

    priority: String,
    projectName: String,
    location: String,
    customer: String,
    stage: String,

    owner: String,       // legacy free-text name — kept for old entries, no longer written to
    ownerId: String,     // Employee Portal's employeeId — exact match, no typos possible
    seenByOwner: { type: Boolean, default: false }, // NEW: powers the sidebar notification badge
    pendingPoints: String,

    status: String,
    actionTaken: String,
    department: String,
    remarks: String,
    lastUpdated: {
      type: String,
      default: () =>
        new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
    },
  },
  { timestamps: true }
);

const Progress =
  mongoose.models.Progress || mongoose.model("Progress", ProgressSchema);

export default Progress;