import { NextResponse } from "next/server";
import { deleteSong, getSong, updateSong } from "@/lib/store";
import { isAdminAuthenticated } from "@/lib/auth";
import { fetchAlbumCover } from "@/lib/itunes";
import { GENRES, type Genre } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const song = await getSong(id);
  if (!song) {
    return NextResponse.json({ error: "곡을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ song });
}

export async function PUT(request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getSong(id);
  if (!existing) {
    return NextResponse.json({ error: "곡을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = (await request.json()) as {
    title?: string;
    artist?: string;
    genre?: string;
    albumCover?: string | null;
    youtubeUrl?: string | null;
    melonUrl?: string | null;
    refreshCover?: boolean;
  };

  const title = body.title?.trim() ?? existing.title;
  const artist = body.artist?.trim() ?? existing.artist;
  const genre = (body.genre as Genre | undefined) ?? existing.genre;

  if (!GENRES.includes(genre)) {
    return NextResponse.json({ error: "장르가 올바르지 않습니다." }, { status: 400 });
  }

  let albumCover =
    body.albumCover !== undefined ? body.albumCover : existing.albumCover;

  if (body.refreshCover || (!albumCover && (title !== existing.title || artist !== existing.artist))) {
    albumCover = await fetchAlbumCover(title, artist);
  }

  const song = await updateSong(id, {
    title,
    artist,
    genre,
    albumCover,
    youtubeUrl:
      body.youtubeUrl !== undefined ? body.youtubeUrl : existing.youtubeUrl,
    melonUrl: body.melonUrl !== undefined ? body.melonUrl : existing.melonUrl,
  });
  return NextResponse.json({ song });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteSong(id);
  if (!ok) {
    return NextResponse.json({ error: "곡을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
