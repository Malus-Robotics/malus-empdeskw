import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
 
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    jwt.verify(token, process.env.JWT_SECRET!);
 
    const announcements = await prisma.announcement.findMany({
      orderBy: { date: "desc" },
      take: 10,
    });
 
    return NextResponse.json({ success: true, announcements });
  } catch (error) {
    console.error("Announcements fetch error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
 