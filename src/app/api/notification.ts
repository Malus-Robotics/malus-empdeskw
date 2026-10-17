// src/app/api/notifications/route.ts
// NEW FILE
// GET  -> { notifications: [...latest 30], unreadCount: number }
// PATCH -> body { id?: string, all?: boolean } marks one (or all) as read
//
// Auth follows the exact pattern already proven in /api/my-tasks: read the
// "token" cookie, jwt.verify with JWT_SECRET, pull employeeId from payload.
// Fails quiet (empty list / count 0) on any auth problem, same as
// /api/my-tasks/unread-count, so a stale/missing cookie never throws a
// visible error for something as low-stakes as a notification bell.

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import Notification from "@/models/Notification";

function getEmployeeId(req: NextRequest): string | null {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return null;
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { employeeId: string };
    return payload.employeeId || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const employeeId = getEmployeeId(req);
  if (!employeeId) return NextResponse.json({ notifications: [], unreadCount: 0 });

  try {
    await connectDB();
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ employeeId }).sort({ createdAt: -1 }).limit(30).lean(),
      Notification.countDocuments({ employeeId, read: false }),
    ]);
    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error("GET /api/notifications failed:", err);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

export async function PATCH(req: NextRequest) {
  const employeeId = getEmployeeId(req);
  if (!employeeId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { id, all } = await req.json();
    await connectDB();

    if (all) {
      await Notification.updateMany({ employeeId, read: false }, { $set: { read: true } });
      return NextResponse.json({ success: true });
    }

    if (id) {
      await Notification.updateOne({ _id: id, employeeId }, { $set: { read: true } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
  } catch (err) {
    console.error("PATCH /api/notifications failed:", err);
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 });
  }
}
