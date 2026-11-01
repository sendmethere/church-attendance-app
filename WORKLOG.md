### 2026-11-01 / Supabase에서 Firebase로 이전

- (src/firebase.js) Firestore·Auth 초기화, Supabase 문법 호환층 추가
- (src/pages/*.js, App.js) import와 호출 객체를 db로 교체, 기존 클라이언트 2개 삭제
- (firestore.rules) 로그인 사용자만 읽기·쓰기 허용
- (scripts/migrate-supabase-to-firebase.mjs) 4개 테이블 1회 복사 스크립트
- (README.md) 앱 소개 작성, Firebase 이전 절차 추가
- 데이터 복사 후 앱 확인 완료, Supabase 의존성·SQL·스크립트 삭제
