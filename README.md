# HIRU Songlist

스트리머 **Hiru(하루)** 의 노래 목록 웹사이트입니다.

## 기능

- 장르: K-POP, J-POP, POP, 발라드, 기타
- 제목 / 아티스트 / 장르 정렬
- 누구나 **노래 신청** 가능
- 관리자 코드(`0880`)로 곡 추가 · 수정 · 삭제
- 곡 추가 시 iTunes에서 앨범 커버 자동 수집

## 로컬 실행

```bash
npm install
npm run dev
```

관리자: http://localhost:3000/admin (코드 `0880`)

로컬 데이터는 `data/db.json`에 저장됩니다.

## Vercel 배포

1. 프로젝트를 Vercel에 연결 (`hirusong` 권장)
2. 환경 변수 설정: `ADMIN_CODE=0880`, `ADMIN_SECRET`
3. 데이터 저장소 연결 (둘 중 하나)
   - **Vercel Blob**: Storage에서 Blob 스토어 생성 → `BLOB_READ_WRITE_TOKEN` 자동 주입
   - **Neon Postgres**: Marketplace에서 Neon 추가 → `DATABASE_URL` 사용
4. 배포 후 도메인: `hirusong.vercel.app` (또는 유사 이름)
