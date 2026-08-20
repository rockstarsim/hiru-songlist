import { promises as fs } from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import { head, put } from "@vercel/blob";
import { nanoid } from "nanoid";
import type { Database, Genre, Song, SongRequest, SortKey } from "./types";
import seedData from "./seed-data.json";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");
const SONGS_BLOB = "hiru-songlist/songs.json";
const REQUESTS_BLOB = "hiru-songlist/requests.json";
const LEGACY_BLOB = "hiru-songlist/db.json";

const EMPTY_DB: Database = { songs: [], requests: [] };

function getPostgresUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    ""
  );
}

function usePostgres() {
  return Boolean(getPostgresUrl());
}

function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function seedSongs(): Song[] {
  return structuredClone(seedData.songs) as Song[];
}

async function ensureSchema() {
  const sql = neon(getPostgresUrl());
  await sql`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      genre TEXT NOT NULL,
      album_cover TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS song_requests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      genre TEXT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function readFileDb(): Promise<Database> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Database;
    return {
      songs: parsed.songs?.length ? parsed.songs : seedSongs(),
      requests: parsed.requests ?? [],
    };
  } catch {
    return { songs: seedSongs(), requests: [] };
  }
}

function resolveWritablePath() {
  if (process.env.VERCEL) {
    return path.join("/tmp", "hiru-songlist-db.json");
  }
  return DATA_FILE;
}

async function writeFileDb(db: Database) {
  const target = resolveWritablePath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(db, null, 2), "utf8");
}

async function readFileDbFromWritable(): Promise<Database | null> {
  if (!process.env.VERCEL) return null;
  try {
    const raw = await fs.readFile(resolveWritablePath(), "utf8");
    const parsed = JSON.parse(raw) as Database;
    return {
      songs: parsed.songs ?? [],
      requests: parsed.requests ?? [],
    };
  } catch {
    return null;
  }
}

async function readBlobJson<T>(pathname: string): Promise<T | null> {
  try {
    const meta = await head(pathname);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function writeBlobJson(pathname: string, value: unknown) {
  await put(pathname, JSON.stringify(value, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function readBlobDb(): Promise<Database> {
  const [songsDirect, requestsDirect, legacy] = await Promise.all([
    readBlobJson<Song[]>(SONGS_BLOB),
    readBlobJson<SongRequest[]>(REQUESTS_BLOB),
    readBlobJson<Database>(LEGACY_BLOB),
  ]);

  let songs = songsDirect;
  let requests = requestsDirect;
  let shouldPersistSongs = false;
  let shouldPersistRequests = false;

  // Migrate once from legacy combined file
  if ((!songs || songs.length === 0) && legacy?.songs?.length) {
    songs = legacy.songs;
    shouldPersistSongs = true;
  }
  if ((!requests || requests.length === 0) && legacy?.requests?.length) {
    requests = legacy.requests;
    shouldPersistRequests = true;
  }

  if (!songs || songs.length === 0) {
    songs = seedSongs();
    shouldPersistSongs = true;
  }
  if (!requests) {
    requests = [];
    shouldPersistRequests = songsDirect === null && requestsDirect === null;
  }

  if (shouldPersistSongs) {
    await writeBlobJson(SONGS_BLOB, songs);
  }
  if (shouldPersistRequests || requestsDirect === null) {
    await writeBlobJson(REQUESTS_BLOB, requests);
  }

  return { songs, requests };
}

async function readJsonDb(): Promise<Database> {
  if (useBlob()) return readBlobDb();
  if (process.env.VERCEL) {
    const writable = await readFileDbFromWritable();
    if (writable) {
      return {
        songs: writable.songs.length ? writable.songs : seedSongs(),
        requests: writable.requests,
      };
    }
  }
  return readFileDb();
}

async function writeSongs(songs: Song[]) {
  if (useBlob()) {
    await writeBlobJson(SONGS_BLOB, songs);
    return;
  }
  const db = await readJsonDb();
  db.songs = songs;
  await writeFileDb(db);
}

async function writeRequests(requests: SongRequest[]) {
  if (useBlob()) {
    await writeBlobJson(REQUESTS_BLOB, requests);
    return;
  }
  const db = await readJsonDb();
  db.requests = requests;
  await writeFileDb(db);
}

function normalizeSong(song: Song): Song {
  return {
    ...song,
    albumCover: song.albumCover ?? null,
    youtubeUrl: song.youtubeUrl ?? null,
    melonUrl: song.melonUrl ?? null,
  };
}

function sortSongs(songs: Song[], sortBy: SortKey): Song[] {
  return [...songs]
    .map(normalizeSong)
    .sort((a, b) =>
      a[sortBy].localeCompare(b[sortBy], "ko", { sensitivity: "base" }),
    );
}

export async function listSongs(sortBy: SortKey = "title"): Promise<Song[]> {
  if (usePostgres()) {
    await ensureSchema();
    const sql = neon(getPostgresUrl());
    const rows = await sql`
      SELECT id, title, artist, genre, album_cover AS "albumCover",
             created_at AS "createdAt"
      FROM songs
    `;
    return sortSongs(rows as Song[], sortBy);
  }

  const db = await readJsonDb();
  return sortSongs(db.songs, sortBy);
}

export async function createSong(input: {
  title: string;
  artist: string;
  genre: Genre;
  albumCover: string | null;
  youtubeUrl?: string | null;
  melonUrl?: string | null;
}): Promise<Song> {
  const song: Song = {
    id: nanoid(),
    title: input.title.trim(),
    artist: input.artist.trim(),
    genre: input.genre,
    albumCover: input.albumCover,
    youtubeUrl: input.youtubeUrl?.trim() || null,
    melonUrl: input.melonUrl?.trim() || null,
    createdAt: new Date().toISOString(),
  };

  if (usePostgres()) {
    await ensureSchema();
    const sql = neon(getPostgresUrl());
    await sql`
      INSERT INTO songs (id, title, artist, genre, album_cover, created_at)
      VALUES (${song.id}, ${song.title}, ${song.artist}, ${song.genre}, ${song.albumCover}, ${song.createdAt})
    `;
    return song;
  }

  const db = await readJsonDb();
  db.songs.push(song);
  await writeSongs(db.songs);
  return song;
}

export async function updateSong(
  id: string,
  input: {
    title: string;
    artist: string;
    genre: Genre;
    albumCover: string | null;
    youtubeUrl?: string | null;
    melonUrl?: string | null;
  },
): Promise<Song | null> {
  if (usePostgres()) {
    await ensureSchema();
    const sql = neon(getPostgresUrl());
    const rows = await sql`
      UPDATE songs
      SET title = ${input.title.trim()},
          artist = ${input.artist.trim()},
          genre = ${input.genre},
          album_cover = ${input.albumCover}
      WHERE id = ${id}
      RETURNING id, title, artist, genre, album_cover AS "albumCover",
                created_at AS "createdAt"
    `;
    const row = rows[0] as Song | undefined;
    return row
      ? normalizeSong({
          ...row,
          youtubeUrl: input.youtubeUrl?.trim() || null,
          melonUrl: input.melonUrl?.trim() || null,
        })
      : null;
  }

  const db = await readJsonDb();
  const idx = db.songs.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  db.songs[idx] = normalizeSong({
    ...db.songs[idx],
    title: input.title.trim(),
    artist: input.artist.trim(),
    genre: input.genre,
    albumCover: input.albumCover,
    youtubeUrl:
      input.youtubeUrl !== undefined
        ? input.youtubeUrl?.trim() || null
        : db.songs[idx].youtubeUrl ?? null,
    melonUrl:
      input.melonUrl !== undefined
        ? input.melonUrl?.trim() || null
        : db.songs[idx].melonUrl ?? null,
  });
  await writeSongs(db.songs);
  return db.songs[idx];
}

export async function deleteSong(id: string): Promise<boolean> {
  if (usePostgres()) {
    await ensureSchema();
    const sql = neon(getPostgresUrl());
    const rows = await sql`
      DELETE FROM songs WHERE id = ${id} RETURNING id
    `;
    return rows.length > 0;
  }

  const db = await readJsonDb();
  const next = db.songs.filter((s) => s.id !== id);
  if (next.length === db.songs.length) return false;
  await writeSongs(next);
  return true;
}

export async function getSong(id: string): Promise<Song | null> {
  if (usePostgres()) {
    await ensureSchema();
    const sql = neon(getPostgresUrl());
    const rows = await sql`
      SELECT id, title, artist, genre, album_cover AS "albumCover",
             created_at AS "createdAt"
      FROM songs WHERE id = ${id}
    `;
    return (rows[0] as Song) ?? null;
  }

  const db = await readJsonDb();
  return db.songs.find((s) => s.id === id) ?? null;
}

export async function listRequests(): Promise<SongRequest[]> {
  if (usePostgres()) {
    await ensureSchema();
    const sql = neon(getPostgresUrl());
    const rows = await sql`
      SELECT id, title, artist, genre, message, status,
             created_at AS "createdAt"
      FROM song_requests
      ORDER BY created_at DESC
    `;
    return rows as SongRequest[];
  }

  const db = await readJsonDb();
  return [...db.requests].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function createRequest(input: {
  title: string;
  artist: string;
  genre: Genre | null;
  message: string | null;
}): Promise<SongRequest> {
  const request: SongRequest = {
    id: nanoid(),
    title: input.title.trim(),
    artist: input.artist.trim(),
    genre: input.genre,
    message: input.message?.trim() || null,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  if (usePostgres()) {
    await ensureSchema();
    const sql = neon(getPostgresUrl());
    await sql`
      INSERT INTO song_requests (id, title, artist, genre, message, status, created_at)
      VALUES (${request.id}, ${request.title}, ${request.artist}, ${request.genre}, ${request.message}, ${request.status}, ${request.createdAt})
    `;
    return request;
  }

  // Read requests file only when possible to avoid song/request write races
  if (useBlob()) {
    const existing =
      (await readBlobJson<SongRequest[]>(REQUESTS_BLOB)) ??
      (await readBlobJson<Database>(LEGACY_BLOB))?.requests ??
      [];
    const next = [...existing, request];
    await writeBlobJson(REQUESTS_BLOB, next);
    return request;
  }

  const db = await readJsonDb();
  db.requests.push(request);
  await writeRequests(db.requests);
  return request;
}

export async function updateRequestStatus(
  id: string,
  status: SongRequest["status"],
): Promise<SongRequest | null> {
  if (usePostgres()) {
    await ensureSchema();
    const sql = neon(getPostgresUrl());
    const rows = await sql`
      UPDATE song_requests
      SET status = ${status}
      WHERE id = ${id}
      RETURNING id, title, artist, genre, message, status,
                created_at AS "createdAt"
    `;
    return (rows[0] as SongRequest) ?? null;
  }

  const requests = await listRequests();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  requests[idx] = { ...requests[idx], status };
  await writeRequests(requests);
  return requests[idx];
}

export async function deleteRequest(id: string): Promise<boolean> {
  if (usePostgres()) {
    await ensureSchema();
    const sql = neon(getPostgresUrl());
    const rows = await sql`
      DELETE FROM song_requests WHERE id = ${id} RETURNING id
    `;
    return rows.length > 0;
  }

  const requests = await listRequests();
  const next = requests.filter((r) => r.id !== id);
  if (next.length === requests.length) return false;
  await writeRequests(next);
  return true;
}
