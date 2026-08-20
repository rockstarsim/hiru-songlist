import { listSongs } from "@/lib/store";
import { SongList } from "@/components/SongList";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const songs = await listSongs("title");

  return (
    <>
      <section className="hero">
        <h1>HIRU</h1>
        <p>
          스트리머 하루의 노래 목록입니다. 제목 · 아티스트 · 장르로 정렬하고,
          원하는 곡은 노래 신청 탭에서 남겨 주세요.
        </p>
      </section>
      <SongList initialSongs={songs} />
    </>
  );
}
