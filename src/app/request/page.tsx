import { RequestForm } from "@/components/RequestForm";

export default function RequestPage() {
  return (
    <>
      <section className="hero">
        <h1>노래 신청</h1>
        <p>
          방송에서 듣고 싶은 곡을 신청해 주세요. 관리자가 확인 후 목록에
          추가합니다.
        </p>
      </section>
      <RequestForm />
    </>
  );
}
