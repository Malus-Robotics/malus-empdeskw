
// ============================================================
// NEW: src/app/api/admin/leaves/route.ts   (admin views + actions leaves)
// ============================================================
 
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
 
async function checkAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  return session?.value === process.env.ADMIN_SESSION_SECRET;
}
 
// GET /api/admin/leaves  — list all leaves with optional filters
export async function GET(req: NextRequest) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
    const { searchParams } = new URL(req.url);
    const status     = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");
 
    const leaves = await prisma.leave.findMany({
      where: {
        ...(status     ? { status: status as any } : {}),
        ...(employeeId ? { employeeId }            : {}),
      },
      include: {
        employee: { select: { name: true, employeeId: true, email: true } },
      },
      orderBy: { appliedOn: "desc" },
      take: 200,
    });
 
    return NextResponse.json({ success: true, leaves });
  } catch (error) {
    console.error("Admin leaves list error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
 
// PATCH /api/admin/leaves  — approve or reject a leave
export async function PATCH(req: NextRequest) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
    const { id, status, remarks } = await req.json();
 
    if (!id || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "id and status (APPROVED|REJECTED) required." }, { status: 400 });
    }
 
    const leave = await prisma.leave.findUnique({ where: { id } });
    if (!leave) return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    if (leave.status !== "PENDING") {
      return NextResponse.json({ error: "Only pending leaves can be actioned." }, { status: 409 });
    }
 
    const updated = await prisma.leave.update({
      where: { id },
      data:  { status, remarks: remarks || null },
    });
 
    return NextResponse.json({ success: true, leave: updated });
  } catch (error) {
    console.error("Admin leave update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
 
 