import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    github: !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
  });
}
