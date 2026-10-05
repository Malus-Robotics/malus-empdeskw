// ============================================================
// EMPLOYEE PORTAL REPO — src/lib/mongodb.ts
//
// Connects to the same MongoDB Atlas database your project
// management tool uses. Add MONGODB_URI to your .env — get the
// exact connection string from wherever the PM tool's own
// .env.local has it, since it needs to be the same database.
// ============================================================

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing in .env.local");
}

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  await mongoose.connect(MONGODB_URI!);
}