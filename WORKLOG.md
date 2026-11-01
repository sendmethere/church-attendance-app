### 2026-11-01 / 출석 화면 정리와 명단 대조

- (AttendanceManagement.js) 상단 날짜·예배·버튼을 카드로 정리
- (AttendanceManagement.js) 멤버 동기화를 명부 반영으로 바꾸고 확인창 추가
- 명단 xlsx와 Firestore 단원 대조, 3명 퇴단 처리(2026-11-01)
- 중창단 팀 태그 대조, 33명 태그 보정(기악부 제외)

### 2026-11-01 / 노션풍 전역 테마

- (tailwind.config.js) 회색 스케일·black(짙은 회색)·blue·라운드·그림자 덮어쓰기
- (src/App.js) antd ConfigProvider 테마, 테이블 헤더 짙은 회색
- (src/pages/Navbar.js) 밑줄 탭을 알약형 탭과 얇은 경계선으로 변경
- (index.css, public/index.html, index.js) Pretendard 글꼴, 바탕색, 차트 글꼴
- (AttendanceManagement.js) 출/결/공 버튼 44px로 확대, 결석·공결 행 색 강조
- (AttendanceManagement.js) 사유 입력 16px, 상단 조작 버튼 확대

### 2026-11-01 / Supabase에서 Firebase로 이전

- (src/firebase.js) Firestore·Auth 초기화, Supabase 문법 호환층 추가
- (src/pages/*.js, App.js) import와 호출 객체를 db로 교체, 기존 클라이언트 2개 삭제
- (firestore.rules) 로그인 사용자만 읽기·쓰기 허용
- (scripts/migrate-supabase-to-firebase.mjs) 4개 테이블 1회 복사 스크립트
- (README.md) 앱 소개 작성, Firebase 이전 절차 추가
- 데이터 복사 후 앱 확인 완료, Supabase 의존성·SQL·스크립트 삭제
