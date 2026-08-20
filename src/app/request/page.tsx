import { RequestForm } from "@/components/RequestForm";

export default function RequestPage() {
  return (
    <>
      <section className="page-hero">
        <h1>노래 신청</h1>
        <p>
          방송에서 듣고 싶은 곡을 남겨 주세요. 하루가 확인할 수 있게 관리자가
          목록에 추가해요.
        </p>
      </section>
      <RequestForm />
    </>
  );
}
