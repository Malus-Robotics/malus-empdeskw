import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* ── Generate a collision-safe Employee ID ───────────────────────────────── */
async function generateEmployeeId(): Promise<string> {
  const year = new Date().getFullYear();

  const base = await prisma.employee.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt:  new Date(`${year + 1}-01-01`),
      },
    },
  });

  for (let offset = 0; offset < 50; offset++) {
    const serial = String(base + 1 + offset).padStart(4, "0");
    const id     = `MRPL-${year}-${serial}`;
    const taken  = await prisma.employee.findUnique({ where: { employeeId: id }, select: { id: true } });
    if (!taken) return id;
  }

  return `MRPL-${year}-${Date.now().toString().slice(-6)}`;
}

/* ── POST /api/admin/employees/create ────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const { name, email, department } = await req.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { success: false, error: "Name and email are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.endsWith("@malusrobotics.com")) {
      return NextResponse.json(
        { success: false, error: "Must be a @malusrobotics.com email." },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await prisma.employee.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An employee with this email already exists." },
        { status: 409 }
      );
    }

    const employeeId = await generateEmployeeId();

    const employee = await prisma.employee.create({
      data: {
        employeeId,
        name:       name.trim(),
        email:      normalizedEmail,
        department: department?.trim() || null,
        // password intentionally omitted — employee sets it via /register
      },
    });

    return NextResponse.json({
      success: true,
      employee: {
        id:         employee.id,
        employeeId: employee.employeeId,
        name:       employee.name,
        email:      employee.email,
        department: employee.department,
      },
    });

  } catch (error: any) {
    console.error("Admin create employee error:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "A conflict occurred. Please try again." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create employee." },
      { status: 500 }
    );
  }
}