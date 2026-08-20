export const GENRES = ["K-POP", "J-POP", "POP", "발라드", "기타"] as const;

export type Genre = (typeof GENRES)[number];

export type SortKey = "title" | "artist" | "genre";

export type Song = {
  id: string;
  title: string;
  artist: string;
  genre: Genre;
  albumCover: string | null;
  youtubeUrl: string | null;
  melonUrl: string | null;
  createdAt: string;
};

export type SongRequest = {
  id: string;
  title: string;
  artist: string;
  genre: Genre | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export type Database = {
  songs: Song[];
  requests: SongRequest[];
};
