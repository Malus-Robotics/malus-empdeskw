
// ============================================================
// NEW: src/app/api/leaves/route.ts   (employee submits leave)
// ============================================================
 
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
 
function getEmployeeId(req: NextRequest): string | null {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { employeeId: string };
    return decoded.employeeId;
  } catch { return null; }
}
 
// POST /api/leaves  — apply for leave
export async function POST(req: NextRequest) {
  try {
    const employeeId = getEmployeeId(req);
    if (!employeeId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
 
    const body = await req.json();
    const { type, from, to, days, reason, contactNo } = body;
 
    if (!type || !from || !to || !days || !reason) {
      return NextResponse.json({ success: false, error: "type, from, to, days and reason are required." }, { status: 400 });
    }
 
    // Prevent duplicate pending leave for same dates
    const overlap = await prisma.leave.findFirst({
      where: {
        employeeId,
        status: "PENDING",
        from: { lte: new Date(to) },
        to:   { gte: new Date(from) },
      },
    });
 
    if (overlap) {
      return NextResponse.json({ success: false, error: "You already have a pending leave application that overlaps these dates." }, { status: 409 });
    }
 
    const leave = await prisma.leave.create({
      data: {
        employeeId,
        type:      type.toUpperCase(),
        from:      new Date(from),
        to:        new Date(to),
        days:      Number(days),
        reason,
        contactNo: contactNo || null,
        status:    "PENDING",
      },
    });
 
    return NextResponse.json({ success: true, leave });
  } catch (error) {
    console.error("Leave apply error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
 
// GET /api/leaves  — fetch all leaves for logged-in employee
export async function GET(req: NextRequest) {
  try {
    const employeeId = getEmployeeId(req);
    if (!employeeId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
 
    const leaves = await prisma.leave.findMany({
      where:   { employeeId },
      orderBy: { appliedOn: "desc" },
    });
 
    return NextResponse.json({ success: true, leaves });
  } catch (error) {
    console.error("Leave fetch error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
 
// DELETE /api/leaves?id=xxx  — cancel a PENDING leave
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