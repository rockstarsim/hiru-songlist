"use client";

import { useMemo, useState } from "react";
import type { Genre, Song, SortKey } from "@/lib/types";
import { GENRES } from "@/lib/types";
import { SongPreview } from "./SongPreview";

type Props = {
  initialSongs: Song[];
  isAdmin?: boolean;
  onChanged?: () => void;
};

export function SongList({ initialSongs, isAdmin = false, onChanged }: Props) {
  const [songs, setSongs] = useState(initialSongs);
  const [sortBy, setSortBy] = useState<SortKey>("title");
  const [genreFilter, setGenreFilter] = useState<Genre | "전체">("전체");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Song | null>(null);

  async function resort(nextSort: SortKey) {
    setSortBy(nextSort);
    const res = await fetch(`/api/songs?sort=${nextSort}`);
    const data = await res.json();
    setSongs(data.songs);
  }

  const visible = useMemo(() => {
    return songs.filter((song) => {
      const matchesGenre =
        genreFilter === "전체" || song.genre === genreFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q);
      return matchesGenre && matchesQuery;
    });
  }, [songs, genreFilter, query]);

  async function handleDelete(id: string) {
    if (!confirm("이 곡을 삭제할까요?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/songs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "삭제에 실패했습니다.");
        return;
      }
      setSongs((prev) => prev.filter((s) => s.id !== id));
      onChanged?.();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="song-panel">
      <div className="toolbar">
        <label className="field grow">
          <span>검색</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목 또는 아티스트"
          />
        </label>
        <label className="field">
          <span>정렬</span>
          <select
            value={sortBy}
            onChange={(e) => void resort(e.target.value as SortKey)}
          >
            <option value="title">제목</option>
            <option value="artist">아티스트</option>
            <option value="genre">장르</option>
          </select>
        </label>
        <label className="field">
          <span>장르</span>
          <select
            value={genreFilter}
            onChange={(e) =>
              setGenreFilter(e.target.value as Genre | "전체")
            }
          >
            <option value="전체">전체</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="count-line">{visible.length}곡 · 곡을 누르면 미리보기</p>

      <ul className="song-grid">
        {visible.map((song) => (
          <li key={song.id} className="song-item">
            <button
              type="button"
              className="song-hit"
              onClick={() => setSelected(song)}
            >
              <div className="cover-wrap">
                {song.albumCover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={song.albumCover}
                    alt={`${song.title} 앨범 커버`}
                    className="cover"
                  />
                ) : (
                  <div className="cover placeholder" aria-hidden>
                    ♪
                  </div>
                )}
                <span className="play-cue" aria-hidden>
                  ▶
                </span>
              </div>
              <div className="song-meta">
                <h3>{song.title}</h3>
                <p className="artist">{song.artist}</p>
                <span className="genre-tag">{song.genre}</span>
              </div>
            </button>
            {isAdmin && (
              <div className="song-actions">
                <a className="text-btn" href={`/admin?edit=${song.id}`}>
                  수정
                </a>
                <button
                  type="button"
                  className="text-btn danger"
                  disabled={busyId === song.id}
                  onClick={() => void handleDelete(song.id)}
                >
                  삭제
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {visible.length === 0 && (
        <p className="empty">아직 등록된 곡이 없습니다.</p>
      )}

      {selected && (
        <SongPreview song={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
