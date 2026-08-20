import { NextResponse } from "next/server";
import { checkAdminCode, setAdminSession } from "@/lib/auth";

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

  await setAdminSession();
  return NextResponse.json({ ok: true });
}
