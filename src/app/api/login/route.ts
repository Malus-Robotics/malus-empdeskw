


// ============================================================
// FIXED: src/app/api/login/route.ts
// FIX: bcrypt.compare was missing await — any password passed!
// ============================================================
 
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
 
export async function POST(req: Request) {
  try {
    const { employeeId, password } = await req.json();
 
    if (!employeeId || !password) {
      return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 400 });
    }
 
    const employee = await prisma.employee.findUnique({ where: { employeeId } });
 
    if (!employee || !employee.password) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }
 
    // FIX: was missing await — bcrypt.compare returns a Promise, not a boolean
    const valid = await bcrypt.compare(password, employee.password);
 
    if (!valid) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }
 
    const token = jwt.sign(
      { employeeId: employee.employeeId },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );
 
    const res = NextResponse.json({ success: true });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });
 
    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
 