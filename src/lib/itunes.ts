export async function fetchAlbumCover(
  title: string,
  artist: string,
): Promise<string | null> {
  const term = `${artist} ${title}`.trim();
  if (!term) return null;

  try {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", term);
    url.searchParams.set("media", "music");
    url.searchParams.set("entity", "song");
    url.searchParams.set("limit", "5");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      results?: Array<{
        trackName?: string;
        artistName?: string;
        artworkUrl100?: string;
      }>;
    };

    const results = data.results ?? [];
    if (results.length === 0) return null;

    const titleLower = title.toLowerCase();
    const artistLower = artist.toLowerCase();

    const best =
      results.find(
        (r) =>
          r.trackName?.toLowerCase().includes(titleLower) ||
          titleLower.includes(r.trackName?.toLowerCase() ?? ""),
      ) ??
      results.find((r) =>
        r.artistName?.toLowerCase().includes(artistLower),
      ) ??
      results[0];

    const artwork = best?.artworkUrl100;
    if (!artwork) return null;

    return artwork.replace("100x100bb", "600x600bb");
  } catch {
    return null;
  }
}
