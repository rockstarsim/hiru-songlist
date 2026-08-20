import { NextResponse } from "next/server";
import { checkAdminCode, signAdminToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim() ?? "";

  if (!checkAdminCode(code)) {
    return NextResponse.json(
      { error: "관리자 코드가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("hiru_admin", signAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
