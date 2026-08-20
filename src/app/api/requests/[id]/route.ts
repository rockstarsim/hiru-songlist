import { NextResponse } from "next/server";
import {
  createSong,
  deleteRequest,
  updateRequestStatus,
  listRequests,
} from "@/lib/store";
import { isAdminAuthenticated } from "@/lib/auth";
import { fetchAlbumCover } from "@/lib/itunes";
import type { Genre } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    status?: "pending" | "approved" | "rejected";
    addToList?: boolean;
  };

  if (!body.status) {
    return NextResponse.json({ error: "상태를 지정해 주세요." }, { status: 400 });
  }

  const updated = await updateRequestStatus(id, body.status);
  if (!updated) {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
  }

  let song = null;
  if (body.addToList && body.status === "approved") {
    const genre = (updated.genre ?? "기타") as Genre;
    const albumCover = await fetchAlbumCover(updated.title, updated.artist);
    song = await createSong({
      title: updated.title,
      artist: updated.artist,
      genre,
      albumCover,
    });
  }

  return NextResponse.json({ request: updated, song });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteRequest(id);
  if (!ok) {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(_request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const { id } = await params;
  const requests = await listRequests();
  const found = requests.find((r) => r.id === id);
  if (!found) {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ request: found });
}
