"use client";

import { useEffect } from "react";
import type { Song } from "@/lib/types";
import {
  resolveMelonHref,
  resolveYoutubeHref,
  youtubeEmbedUrl,
} from "@/lib/links";

type Props = {
  song: Song;
  onClose: () => void;
};

export function SongPreview({ song, onClose }: Props) {
  const embed = youtubeEmbedUrl(song);
  const youtubeHref = resolveYoutubeHref(song);
  const melonHref = resolveMelonHref(song);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${song.title} 미리보기`}
      onClick={onClose}
    >
      <div
        className="preview-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="preview-close" onClick={onClose}>
          닫기
        </button>

        <div className="preview-body">
          <div className="preview-cover">
            {song.albumCover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={song.albumCover} alt={`${song.title} 앨범 커버`} />
            ) : (
              <div className="cover placeholder" aria-hidden>
                ♪
              </div>
            )}
          </div>

          <div className="preview-meta">
            <p className="preview-label">미리보기</p>
            <h2>{song.title}</h2>
            <p className="artist">{song.artist}</p>
            <span className="genre-tag">{song.genre}</span>
          </div>
        </div>

        {embed ? (
          <div className="preview-embed">
            <iframe
              src={embed}
              title={`${song.title} YouTube 미리보기`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="muted small preview-hint">
            YouTube / Melon에서 이 곡을 바로 찾아볼 수 있어요.
            관리자가 직접 링크를 넣으면 YouTube 영상이 여기에 재생됩니다.
          </p>
        )}

        <div className="preview-links">
          <a
            className="link-btn youtube"
            href={youtubeHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube에서 듣기
          </a>
          <a
            className="link-btn melon"
            href={melonHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Melon에서 듣기
          </a>
        </div>
      </div>
    </div>
  );
}
