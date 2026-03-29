import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
 
async function checkAdmin() {
  const cookieStore = await cookies();
  const session     = cookieStore.get("admin_session");
  return session?.value === process.env.ADMIN_SESSION_SECRET;
}
 
export async function GET() {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
    const announcements = await prisma.announcement.findMany({
      orderBy: { date: "desc" },
    });
 
    return NextResponse.json({ success: true, announcements });
  } catch (error) {
    console.error("Admin announcements list error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
 
export async function POST(req: NextRequest) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
    const body = await req.json();
    const { title, body: annBody, type, date } = body;
 
    if (!title?.trim() || !annBody?.trim() || !type || !date) {
      return NextResponse.json(
        { error: "title, body, type and date are required." },
        { status: 400 }
      );
    }
 
    const validTypes = ["holiday", "alert", "info", "urgent"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }
 
    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        body:  annBody.trim(),
        type,
        date:  new Date(date),
      },
    });
 
    return NextResponse.json({ success: true, announcement });
  } catch (error) {
    console.error("Admin announcement create error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
 
export async function DELETE(req: NextRequest) {
  try {
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
 
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
 
    await prisma.announcement.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Announcement deleted." });
  } catch (error) {
    console.error("Admin announcement delete error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
 