"use client";

import { FormEvent, useState } from "react";
import { GENRES, type Genre } from "@/lib/types";

export function RequestForm() {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState<Genre | "">("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          artist,
          genre: genre || null,
          message: message || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error || "신청에 실패했습니다.");
        return;
      }
      setTitle("");
      setArtist("");
      setGenre("");
      setMessage("");
      setStatus("done");
    } catch {
      setStatus("error");
      setError("네트워크 오류가 발생했습니다.");
    }
  }

  return (
    <form className="form-card" onSubmit={(e) => void onSubmit(e)}>
      <label className="field">
        <span>곡 제목 *</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: Supernova"
        />
      </label>
      <label className="field">
        <span>아티스트 *</span>
        <input
          required
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="예: aespa"
        />
      </label>
      <label className="field">
        <span>장르 (선택)</span>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value as Genre | "")}
        >
          <option value="">선택 안 함</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>메시지 (선택)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="신청 이유를 남겨 주세요"
          rows={4}
        />
      </label>
      <button className="primary-btn" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "신청 중..." : "노래 신청하기"}
      </button>
      {status === "done" && (
        <p className="success-msg">신청이 접수되었습니다. 감사합니다!</p>
      )}
      {status === "error" && <p className="error-msg">{error}</p>}
    </form>
  );
}
