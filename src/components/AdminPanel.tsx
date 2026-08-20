"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GENRES, type Genre, type Song, type SongRequest } from "@/lib/types";
import { SongList } from "./SongList";

type Props = {
  initialSongs: Song[];
  initialRequests?: SongRequest[];
  initiallyAuthed: boolean;
};

export function AdminPanel({
  initialSongs,
  initialRequests = [],
  initiallyAuthed,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [authed, setAuthed] = useState(initiallyAuthed);
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [songs, setSongs] = useState(initialSongs);
  const [requests, setRequests] = useState<SongRequest[]>(initialRequests);
  const [requestsError, setRequestsError] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState<Genre>("K-POP");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [melonUrl, setMelonUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formOk, setFormOk] = useState("");

  async function refreshSongs() {
    const res = await fetch("/api/songs?sort=title", { credentials: "include" });
    const data = await res.json();
    setSongs(data.songs);
  }

  async function refreshRequests() {
    setRequestsError("");
    const res = await fetch("/api/requests", { credentials: "include" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setRequestsError(data.error || "신청 목록을 불러오지 못했습니다.");
      return;
    }
    const data = await res.json();
    setRequests(data.requests);
  }

  useEffect(() => {
    if (!authed) return;
    void refreshRequests();
  }, [authed]);

  useEffect(() => {
    if (!editId || !authed) return;
    const song = songs.find((s) => s.id === editId);
    if (!song) return;
    setTitle(song.title);
    setArtist(song.artist);
    setGenre(song.genre);
    setYoutubeUrl(song.youtubeUrl ?? "");
    setMelonUrl(song.melonUrl ?? "");
  }, [editId, songs, authed]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoginError(data.error || "로그인 실패");
      return;
    }
    setAuthed(true);
    setCode("");
    await refreshRequests();
    router.refresh();
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    router.refresh();
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    setFormOk("");

    try {
      const payload = {
        title,
        artist,
        genre,
        youtubeUrl: youtubeUrl.trim() || null,
        melonUrl: melonUrl.trim() || null,
        refreshCover: true,
      };
      const res = await fetch(editId ? `/api/songs/${editId}` : "/api/songs", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "저장에 실패했습니다.");
        return;
      }
      setFormOk(editId ? "곡이 수정되었습니다." : "곡이 추가되었습니다.");
      setTitle("");
      setArtist("");
      setGenre("K-POP");
      setYoutubeUrl("");
      setMelonUrl("");
      await refreshSongs();
      if (editId) router.replace("/admin");
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestAction(
    id: string,
    status: "approved" | "rejected",
    addToList: boolean,
  ) {
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, addToList }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "처리에 실패했습니다.");
      return;
    }
    await refreshRequests();
    if (addToList) await refreshSongs();
  }

  if (!authed) {
    return (
      <form className="form-card narrow" onSubmit={(e) => void handleLogin(e)}>
        <h2>관리자 로그인</h2>
        <p className="muted">관리자 코드를 입력해 주세요.</p>
        <label className="field">
          <span>코드</span>
          <input
            type="password"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="••••"
            autoComplete="current-password"
          />
        </label>
        <button className="primary-btn" type="submit">
          입장
        </button>
        {loginError && <p className="error-msg">{loginError}</p>}
      </form>
    );
  }

  return (
    <div className="admin-layout">
      <div className="admin-top">
        <h2>관리자</h2>
        <button type="button" className="ghost-btn" onClick={() => void handleLogout()}>
          로그아웃
        </button>
      </div>

      <form className="form-card" onSubmit={(e) => void handleSave(e)}>
        <h3>{editId ? "곡 수정" : "곡 추가"}</h3>
        <label className="field">
          <span>제목</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span>아티스트</span>
          <input required value={artist} onChange={(e) => setArtist(e.target.value)} />
        </label>
        <label className="field">
          <span>장르</span>
          <select value={genre} onChange={(e) => setGenre(e.target.value as Genre)}>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>YouTube 링크 (선택)</span>
          <input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </label>
        <label className="field">
          <span>Melon 링크 (선택)</span>
          <input
            value={melonUrl}
            onChange={(e) => setMelonUrl(e.target.value)}
            placeholder="https://www.melon.com/song/detail.htm?songId=..."
          />
        </label>
        <p className="muted small">
          저장 시 iTunes에서 앨범 커버를 자동으로 가져옵니다. 링크를 비워 두면
          검색 결과로 연결됩니다.
        </p>
        <div className="btn-row">
          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? "저장 중..." : editId ? "수정 저장" : "곡 추가"}
          </button>
          {editId && (
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setTitle("");
                setArtist("");
                setGenre("K-POP");
                setYoutubeUrl("");
                setMelonUrl("");
                router.replace("/admin");
              }}
            >
              취소
            </button>
          )}
        </div>
        {formOk && <p className="success-msg">{formOk}</p>}
        {formError && <p className="error-msg">{formError}</p>}
      </form>

      <section className="form-card">
        <div className="admin-top">
          <h3>노래 신청 ({requests.filter((r) => r.status === "pending").length})</h3>
          <button
            type="button"
            className="ghost-btn small"
            onClick={() => void refreshRequests()}
          >
            새로고침
          </button>
        </div>
        {requestsError && <p className="error-msg">{requestsError}</p>}
        {requests.length === 0 && !requestsError && (
          <p className="muted">신청이 없습니다.</p>
        )}
        <ul className="request-list">
          {requests.map((req) => (
            <li key={req.id} className="request-item">
              <div>
                <strong>{req.title}</strong>
                <span className="artist"> · {req.artist}</span>
                {req.genre && <span className="genre-tag">{req.genre}</span>}
                <p className="muted small">{req.message || "메시지 없음"}</p>
                <p className="muted small">상태: {req.status}</p>
              </div>
              {req.status === "pending" && (
                <div className="btn-row">
                  <button
                    type="button"
                    className="primary-btn small"
                    onClick={() =>
                      void handleRequestAction(req.id, "approved", true)
                    }
                  >
                    승인 후 목록 추가
                  </button>
                  <button
                    type="button"
                    className="ghost-btn small"
                    onClick={() =>
                      void handleRequestAction(req.id, "rejected", false)
                    }
                  >
                    거절
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <SongList
        key={songs.map((s) => s.id).join("-")}
        initialSongs={songs}
        isAdmin
        onChanged={() => void refreshSongs()}
      />
    </div>
  );
}
