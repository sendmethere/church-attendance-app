# 전주교회 찬양대 출석 관리 시스템

찬양대 단원의 주일 출석(오전·오후 예배, 행사)을 기록하고, 결석·공결 사유와 기간별 통계를 확인하며, 출석부를 엑셀로 내려받는 웹앱이다. 로그인한 관리자만 사용한다.

## 주요 기능

| 화면 (경로) | 하단 메뉴 | 내용 |
|---|---|---|
| 로그인 (`/`) | | Firebase 이메일 로그인. 이후 모든 화면은 로그인 상태에서만 접근 |
| 홈 (`/dashboard`) | 홈 | 단원 현황, 오전·오후 출석/결석/공결 도넛 차트, 결석자 목록과 결석사유 모아보기, 출석 일정표 |
| 출석 (`/attendance`) | 출석 | 날짜·예배(오전/오후/행사)별 출석 체크. 단원 상태는 출석, 결석, 공결 세 가지이며 사유를 적을 수 있음 |
| 멤버 (`/members`) | 멤버 | 단원 명부 추가·수정·삭제. 파트(소프라노, 알토, 테너, 베이스, 기악부, 기타)와 태그 필터 |
| 통계 (`/statistics`) | 통계 | 월·분기·반기·연 단위 출석부 표, 파트별 집계, 결석/공결 사유 조회 |
| 일정 (`/events`) | 일정 | 예배·행사 일정 등록과 연도별 조회, 일정별 출석 인원 |
| 태그 (`/tags`) | 태그 | 중창A·B·C, 엘벧엘 같은 소모임 태그 관리(이름, 약칭) |
| 공지 (`/notice`) | | 공지사항 작성·수정 |

통계 화면에서 전체 또는 파트별 출석부와 결석/공결 사유표를 `.xlsx`로 내려받는다(`src/utils/excelUtils.js`, ExcelJS).

## 기술 스택

- React 19 (Create React App), React Router 7
- UI: Ant Design 5, Tailwind CSS 3, Heroicons
- 차트: Chart.js + react-chartjs-2
- 상태: Zustand (단원 목록)
- 백엔드: Firebase (Authentication + Firestore). 별도 서버 없이 브라우저에서 직접 호출
- 배포: Netlify (`netlify.toml`, `public/_redirects`)

## 데이터 구조 (Firestore)

| 컬렉션 | 용도 |
|---|---|
| `members` | 단원 명부(이름, 파트, 태그, 입단·퇴단일). 문서 ID는 숫자 id |
| `events` | 날짜와 `event_type`(am/pm/event)별 한 문서. 출석 상태와 사유는 `attendance_data` 필드 |
| `tags` | 소모임 태그(`name`, `abbreviation`) |
| `notices` | 공지사항 |

로그인한 사용자만 읽고 쓴다(`firestore.rules`). 페이지 코드는 Supabase 문법(`db.from().select().eq()`)을 그대로 쓰고, `src/firebase.js`가 이를 Firestore 호출로 바꿔 준다. 이 호환층은 필터를 메모리에서 적용하므로 데이터가 수만 건 규모가 되면 쿼리를 Firestore 네이티브로 옮긴다.

Supabase에서 Firebase로 이전했다(2026-11-01). 이전 스크립트와 SQL은 git 기록에 있다.

## 폴더 구조

```
src/
  App.js            라우팅, 로그인 보호(ProtectedRoute)
  pages/            화면별 컴포넌트 (AttendanceManagement, Statistics, Dashboard 등)
  store/            Zustand 스토어
  utils/            dateUtils, excelUtils
  firebase.js       Firebase 초기화 + Supabase 문법 호환층
firestore.rules     Firestore 보안 규칙
```

## 실행

```bash
npm install
npm start        # http://localhost:3000
npm run build    # build/ 로 정적 빌드
```

## 알려진 정리 대상

- 큰 파일: `Statistics.js`(약 1,700줄), `AttendanceManagement.js`(약 1,600줄).
