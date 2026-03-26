import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session     = cookieStore.get("admin_session");

    if (!session || session.value !== process.env.ADMIN_SESSION_SECRET) {
      return NextResponse.json({ authorized: false }, { status: 401 });
    }

    return NextResponse.json({ authorized: true });
  } catch {
    return NextResponse.json({ authorized: false }, { status: 500 });
  }
}