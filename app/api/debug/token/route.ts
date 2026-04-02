import { NextResponse } from "next/server";
import { auth } from "@/lib/server/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.json({ refreshToken: session.refreshToken ?? null });
}
