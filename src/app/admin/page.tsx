import { Suspense } from "react";
import { listSongs } from "@/lib/store";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminPanel } from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [songs, authed] = await Promise.all([
    listSongs("title"),
    isAdminAuthenticated(),
  ]);

  return (
    <>
      <section className="hero">
        <h1>관리자</h1>
        <p>곡 추가 · 수정 · 삭제와 노래 신청을 관리합니다.</p>
      </section>
      <Suspense fallback={<p className="muted">불러오는 중...</p>}>
        <AdminPanel initialSongs={songs} initiallyAuthed={authed} />
      </Suspense>
    </>
  );
}
