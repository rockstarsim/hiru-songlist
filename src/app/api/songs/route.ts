import { NextResponse } from "next/server";
import { listSongs, createSong } from "@/lib/store";
import { isAdminAuthenticated } from "@/lib/auth";
import { fetchAlbumCover } from "@/lib/itunes";
import { GENRES, type Genre, type SortKey } from "@/lib/types";

export const runtime = "nodejs";

const SORT_KEYS: SortKey[] = ["title", "artist", "genre"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortParam = searchParams.get("sort") ?? "title";
  const sortBy = SORT_KEYS.includes(sortParam as SortKey)
    ? (sortParam as SortKey)
    : "title";

  const songs = await listSongs(sortBy);
  return NextResponse.json({ songs });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }

  const body = (await request.json()) as {
    title?: string;
    artist?: string;
    genre?: string;
    albumCover?: string | null;
  };

  const title = body.title?.trim();
  const artist = body.artist?.trim();
  const genre = body.genre as Genre | undefined;

  if (!title || !artist || !genre || !GENRES.includes(genre)) {
    return NextResponse.json(
      { error: "제목, 아티스트, 장르를 올바르게 입력해 주세요." },
      { status: 400 },
    );
  }

  let albumCover = body.albumCover ?? null;
  if (!albumCover) {
    albumCover = await fetchAlbumCover(title, artist);
  }

  const song = await createSong({ title, artist, genre, albumCover });
  return NextResponse.json({ song }, { status: 201 });
}
