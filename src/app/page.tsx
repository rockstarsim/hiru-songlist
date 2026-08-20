import Link from "next/link";
import { listSongs } from "@/lib/store";
import { SongList } from "@/components/SongList";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const songs = await listSongs("title");

  return (
    <>
      <section className="home-hero" aria-label="히루 소개">
        <div className="home-hero-visual">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hiru.png" alt="히루(Hiru) 아바타" />
        </div>
        <div className="home-hero-copy">
          <p className="brand-hero">HIRU</p>
          <p>히루의 노래책</p>
          <div className="hero-actions">
            <Link className="primary-btn" href="/request">
              노래 신청하기
            </Link>
          </div>
        </div>
      </section>

      <h2 className="section-title">
        노래 목록 <span>♔</span>
      </h2>
      <SongList initialSongs={songs} />
    </>
  );
}
