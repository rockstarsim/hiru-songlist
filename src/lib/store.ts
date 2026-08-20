import { promises as fs } from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import { put, list } from "@vercel/blob";
import { nanoid } from "nanoid";
import type { Database, Genre, Song, SongRequest, SortKey } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");
const BLOB_PATH = "hiru-songlist/db.json";

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
      songs: parsed.songs ?? [],
      requests: parsed.requests ?? [],
    };
  } catch {
    return structuredClone(EMPTY_DB);
  }
}

async function writeFileDb(db: Database) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

async function readBlobDb(): Promise<Database> {
  const { blobs } = await list({ prefix: BLOB_PATH });
  const blob = blobs.find((b) => b.pathname === BLOB_PATH);
  if (!blob) {
    const seed = await readFileDb();
    if (seed.songs.length > 0 || seed.requests.length > 0) {
      await writeBlobDb(seed);
      return seed;
    }
    return structuredClone(EMPTY_DB);
  }
  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return structuredClone(EMPTY_DB);
  const parsed = (await res.json()) as Database;
  return {
    songs: parsed.songs ?? [],
    requests: parsed.requests ?? [],
  };
}

async function writeBlobDb(db: Database) {
  await put(BLOB_PATH, JSON.stringify(db, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function readJsonDb(): Promise<Database> {
  if (useBlob()) return readBlobDb();
  return readFileDb();
}

async function writeJsonDb(db: Database) {
  if (useBlob()) {
    await writeBlobDb(db);
    return;
  }
  await writeFileDb(db);
}

function sortSongs(songs: Song[], sortBy: SortKey): Song[] {
  return [...songs].sort((a, b) =>
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
}): Promise<Song> {
  const song: Song = {
    id: nanoid(),
    title: input.title.trim(),
    artist: input.artist.trim(),
    genre: input.genre,
    albumCover: input.albumCover,
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
  await writeJsonDb(db);
  return song;
}

export async function updateSong(
  id: string,
  input: {
    title: string;
    artist: string;
    genre: Genre;
    albumCover: string | null;
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
    return (rows[0] as Song) ?? null;
  }

  const db = await readJsonDb();
  const idx = db.songs.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  db.songs[idx] = {
    ...db.songs[idx],
    title: input.title.trim(),
    artist: input.artist.trim(),
    genre: input.genre,
    albumCover: input.albumCover,
  };
  await writeJsonDb(db);
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
  db.songs = next;
  await writeJsonDb(db);
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

  const db = await readJsonDb();
  db.requests.push(request);
  await writeJsonDb(db);
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

  const db = await readJsonDb();
  const idx = db.requests.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  db.requests[idx] = { ...db.requests[idx], status };
  await writeJsonDb(db);
  return db.requests[idx];
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

  const db = await readJsonDb();
  const next = db.requests.filter((r) => r.id !== id);
  if (next.length === db.requests.length) return false;
  db.requests = next;
  await writeJsonDb(db);
  return true;
}
