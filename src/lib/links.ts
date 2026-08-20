import type { Song } from "./types";

export function youtubeSearchUrl(title: string, artist: string) {
  const q = encodeURIComponent(`${artist} ${title}`);
  return `https://www.youtube.com/results?search_query=${q}`;
}

export function melonSearchUrl(title: string, artist: string) {
  const q = encodeURIComponent(`${artist} ${title}`);
  return `https://www.melon.com/search/total/index.htm?q=${q}`;
}

export function extractYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "") || null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return v;
      const embed = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (embed?.[1]) return embed[1];
      const shorts = parsed.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return shorts[1];
    }
  } catch {
    return null;
  }
  return null;
}

export function resolveYoutubeHref(song: Song) {
  return song.youtubeUrl?.trim() || youtubeSearchUrl(song.title, song.artist);
}

export function resolveMelonHref(song: Song) {
  return song.melonUrl?.trim() || melonSearchUrl(song.title, song.artist);
}

export function youtubeEmbedUrl(song: Song) {
  const id = extractYoutubeId(song.youtubeUrl);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
}
