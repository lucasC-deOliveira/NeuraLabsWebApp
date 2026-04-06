// ---------------------------------------------------------------------------
// GET /api/user — lightweight endpoint for current session user
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(null, { status: 401 });
  }
  return NextResponse.json(user);
}
