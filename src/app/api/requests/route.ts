import { NextResponse } from "next/server";
import { createRequest, listRequests } from "@/lib/store";
import { isAdminAuthenticated } from "@/lib/auth";
import { GENRES, type Genre } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
    }
    const requests = await listRequests();
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("GET /api/requests failed", error);
    return NextResponse.json(
      { error: "신청 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      artist?: string;
      genre?: string | null;
      message?: string | null;
    };

    const title = body.title?.trim();
    const artist = body.artist?.trim();
    const genre =
      body.genre && GENRES.includes(body.genre as Genre)
        ? (body.genre as Genre)
        : null;
    const message = body.message?.trim() || null;

    if (!title || !artist) {
      return NextResponse.json(
        { error: "곡 제목과 아티스트를 입력해 주세요." },
        { status: 400 },
      );
    }

    const songRequest = await createRequest({ title, artist, genre, message });
    return NextResponse.json({ request: songRequest }, { status: 201 });
  } catch (error) {
    console.error("POST /api/requests failed", error);
    return NextResponse.json(
      { error: "신청 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
