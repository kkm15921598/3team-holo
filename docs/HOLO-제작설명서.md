# HOLO 전체 제작 설명서

> 2030 1인 가구를 위한 지역 커뮤니티 앱 **HOLO** 의 기술/운영/홍보 의사결정 문서.
> 본 문서는 "어떻게 만들 것인가" 를 결정하기 위한 단일 출처(Single Source of Truth) 입니다.

---

## 목차

1. 제품 개요
2. 기술 스택 (권장안)
3. 서버 연결 아키텍처
4. 예상 운영비 (단계별)
5. 유지보수가 쉬운 구조
6. 홍보 / UTM / 관리자 통계
7. 데이터 모델 개요
8. 보안 & 운영 체크리스트
9. 출시 로드맵 (4 페이즈)
10. 부록 — 의사결정 근거 요약

---

## 1. 제품 개요

| 항목 | 내용 |
|---|---|
| 타깃 | 2030 1인 가구 (서울/수도권 시작) |
| 핵심 가치 | 실용적 도움 + 정서적 연결 + 게임화된 마이룸 |
| 핵심 기능 | 온보딩 / 홈 / 지도 / 게시판 / 채팅 / 마이페이지 / 마이룸 / 출석체크 / 포인트·레벨 |
| 차별점 | 마이룸(PNG 가구 배치) + 동네 단위 신뢰 연결 |
| 첫 KPI | 가입 후 7일 잔존, 게시판→채팅 전환율, 친구 추가율 |

---

## 2. 기술 스택 (권장안)

| 영역 | 권장 | 핵심 이유 |
|---|---|---|
| 모바일 앱 | **React Native + Expo (TypeScript)** | iOS/Android 동시, OTA 핫픽스, 한국 RN 인력 풍부 |
| 마이룸 렌더 | **react-three-fiber (Three.js)** + 2.5D 아이소메트릭 | PNG 투명배경 가구 그대로 사용. 3D 모델 외주 비용 절감 |
| 백엔드 | **Supabase** (Postgres + Auth + Realtime + Storage + Edge Functions) | 채팅 Realtime, RLS 권한, 관리 콘솔 내장 → 1~3인 팀 운영 최적 |
| 인증 | Supabase Auth + 카카오/네이버/구글 OAuth | 한국 사용자 기준 카카오/네이버 필수 |
| 휴대폰 인증 | NHN Cloud SMS 또는 알리고 | 건당 ~9원, 국내 발송 안정성 |
| 지도 | 카카오맵 SDK (앱) / 카카오맵 JS (웹) | 한국 POI 정확도 |
| 푸시 | Expo Push + FCM/APNs | 무료, 연동 단순 |
| 관리자/랜딩 | Next.js (App Router) + Tailwind CSS | SSR/SEO + Vercel 무료 배포 |
| 분석 | GA4 + PostHog + Sentry | 행동·퍼널·에러 |
| 결제 (마이룸 가구) | 토스페이먼츠 또는 인앱결제 | 한국 카드/간편결제 |
| CI/CD | GitHub Actions + EAS Build | 자동 빌드/스토어 배포 |

> Flutter, Firebase, Mapbox 등 대안과의 비교는 `docs/기술스택-비교표.md` 참고.

---

## 3. 서버 연결 아키텍처

```
[RN 앱] ── HTTPS+JWT ──> [Supabase API]
   │                         ├── PostgREST (CRUD)
   │                         ├── Realtime (채팅/게시판 갱신)
   │                         ├── Auth (JWT, RLS)
   │                         ├── Storage (가구 PNG, 프로필)
   │                         └── Edge Functions (포인트·신고·UTM 집계)
   │
   ├── Push:  Expo Push → FCM/APNs
   ├── Map:   카카오맵 SDK
   ├── OAuth: 카카오 / 네이버 / 구글
   └── SMS:   NHN Cloud / 알리고

[Next.js 관리자] ── Service Role ──> Supabase (서버 컴포넌트 only)
[랜딩 (정적 HTML)] ── anon key ──> Supabase `waitlist` 테이블
```

**핵심 원칙**

- **모든 테이블 RLS ON.** Service Role Key는 서버에서만 사용.
- **Edge Functions** 로 포인트 계산, 신고 누적 자동 숨김, UTM 집계 등 신뢰 로직 중앙화.
- **Realtime** 은 채팅/게시글/댓글에만 사용 (전 테이블 X).
- **Storage** 는 사용자 임의 업로드 X — 미리 등록된 PNG 가구만 선택 가능.

상세 다이어그램(시스템/ER/시퀀스/배포/보안)은 `docs/아키텍처.md` 참고.

---

## 4. 예상 운영비 (단계별)

환율 1$ ≒ 1,400원 기준. 광고비 제외, 인프라만.

| 단계 | 사용자 규모 | 인프라 | 월 비용(USD) | 월 비용(원) |
|---|---|---|---|---|
| **MVP** | ~1,000 MAU | Supabase Free, Vercel Free, Expo Free, GA4 Free | $0 ~ $20 | 0 ~ 3만원 |
| **초기 성장** | ~10,000 MAU | Supabase Pro $25, Vercel Pro $20, Sentry Team $26, 카카오맵 무료한도, SMS 건당 ~9원, 푸시 무료 | $80 ~ $150 | 11만 ~ 21만원 |
| **본격 운영** | ~100,000 MAU | Supabase Team $599 또는 자체 RDS, CDN $30, Sentry $80, 모니터링 $50, SMS 100k건 ~90만원 | $900 ~ $1,800 | 130만 ~ 250만원 |

**1회성 비용**
- Apple Developer: $99 / 년
- Google Play Console: $25 (1회)
- 도메인 (.app): 약 1.5~2만원 / 년

> 단계별 산식과 가정은 `docs/운영비-시뮬레이션.md` 참고.

---

## 5. 유지보수가 쉬운 구조

### 5-1. 모노레포

`pnpm workspaces` + Turborepo 권장.

```
3team-holo/
├── apps/
│   ├── mobile        # React Native (Expo)
│   ├── admin         # Next.js 관리자 대시보드
│   └── landing       # 정적 랜딩 (또는 Next.js)
├── packages/
│   ├── ui            # 공통 디자인 시스템 (Button, Card, Tab)
│   ├── api           # Supabase 클라이언트 + 자동 생성 타입
│   ├── config        # ESLint / TS / Tailwind 공통 설정
│   └── utils         # 날짜·거리·UTM 헬퍼
└── supabase/
    ├── migrations    # SQL 마이그레이션
    └── functions     # Edge Functions
```

### 5-2. Feature-First 폴더

각 앱 내부는 화면 단위가 아닌 **기능 단위**로 분리.

```
apps/mobile/src/features/
├── auth/        # 로그인·회원가입·약관·휴대폰인증
├── onboarding/  # 닉네임·관심사·마이룸 초기 세팅
├── home/        # 메인 홈
├── map/         # 지도 탭
├── board/       # 게시판
├── chat/        # 채팅
├── friends/     # 친구
├── myroom/      # 마이룸 꾸미기
├── checkin/     # 출석체크
└── profile/     # 마이페이지
```

### 5-3. 타입 자동 생성

```bash
supabase gen types typescript --linked > packages/api/src/database.types.ts
```

DB 컬럼 변경 즉시 앱 코드에서 컴파일 에러 → **휴먼 에러 차단**.

### 5-4. 디자인 토큰

```css
:root {
  --brand-gradient: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%);
  --radius-lg: 16px;
  --shadow-soft: 0 8px 24px rgba(124, 58, 237, .12);
}
```

토큰을 `packages/ui` 한 곳에서 관리 → 앱·관리자·랜딩이 동일 룩앤필.

### 5-5. Feature Flag

PostHog Feature Flag로 출석체크/마이룸/공동구매 등 **단계 출시**.
백엔드 배포 없이 A/B 테스트 가능.

---

## 6. 홍보 / UTM / 관리자 통계

### 6-1. UTM 규칙 (사내 표준)

| 파라미터 | 값 예시 |
|---|---|
| `utm_source` | `kakao`, `instagram`, `naver_blog`, `partner_xxx`, `qr_offline` |
| `utm_medium` | `social`, `cpc`, `organic`, `qr`, `email` |
| `utm_campaign` | `launch_2025q1`, `refer_friend`, `lv5_event` |
| `utm_content` | `banner_a`, `banner_b` (A/B 식별) |
| `utm_term` | 키워드 |

### 6-2. 단축 URL & 역할별 링크

- 관리자 페이지의 **링크 빌더** 에서 폼으로 UTM 입력 → `holo.app/r/{slug}` 단축 URL 생성.
- 클릭 시 `redirects` 테이블에서 utm 캡처 후 실제 페이지로 302.
- 마케터/제휴사/오프라인 QR 등 **역할별 슬러그**로 분리 발급.

```sql
create table redirects (
  slug text primary key,
  target_url text not null,
  utm jsonb not null default '{}',
  owner uuid references auth.users,
  created_at timestamptz default now()
);
create table redirect_clicks (
  id bigserial primary key,
  slug text references redirects(slug),
  ua text, ip_hash text, ref text,
  clicked_at timestamptz default now()
);
```

### 6-3. 랜딩에서 UTM 자동 캡처

```js
const params = new URLSearchParams(location.search);
['utm_source','utm_medium','utm_campaign','utm_content','utm_term']
  .forEach(k => { const v = params.get(k); if (v) localStorage.setItem(k, v); });
```

사전등록 폼 제출 시 캡처값을 `waitlist.utm` jsonb 컬럼에 저장 → **가입 전부터 채널 효과 측정**.

### 6-4. 앱 설치 어트리뷰션

- 무료: Branch.io / Adjust 무료 티어
- 자체: deferred deep link (Universal Link / App Link) + 첫 실행 시 클립보드 utm 검사

### 6-5. 관리자 통계 대시보드 항목

| 카테고리 | 지표 |
|---|---|
| 성장 | DAU/WAU/MAU, D1·D7·D30 잔존, 신규 가입 |
| 게시판 | 카테고리별 글/댓글 수, 모집→완료 전환율 |
| 채팅 | 채팅 시작 수, 친구 추가 전환율, 평균 메시지 수 |
| 마이룸 | 평균 가구 수, 방문 수, 좋아요 |
| 홍보 | UTM 소스별 가입·잔존, 단축 URL 클릭→가입 |
| 운영 | 신고 큐, 자동 숨김 로그, 차단 사용자 |
| 매출 | 가구·아이템 결제, ARPPU |

차트: **Recharts** + Supabase view / materialized view (집계 부담 ↓).

---

## 7. 데이터 모델 개요

핵심 테이블 (상세 ER 다이어그램은 `docs/아키텍처.md`).

| 테이블 | 핵심 컬럼 |
|---|---|
| `profiles` | user_id, nickname, level, points, region, tags[], intro |
| `posts` | id, author, category, title, body, status(모집중/완료), created_at |
| `comments` | id, post_id, author, body, created_at |
| `chats` | id, type(1on1/group), title, created_at |
| `chat_members` | chat_id, user_id, last_read_at |
| `messages` | id, chat_id, author, body, created_at |
| `friends` | a, b, status(pending/accepted/blocked) |
| `reports` | id, target_type, target_id, reporter, reason, status |
| `points_log` | user_id, delta, reason, ref_id, created_at |
| `items` | id, name, category, price_points, image_url |
| `myroom_layouts` | user_id, layout(jsonb), updated_at |
| `attendance` | user_id, date, streak |
| `waitlist` | id, email, region, utm(jsonb), created_at |
| `redirects` / `redirect_clicks` | UTM 단축 URL |

---

## 8. 보안 & 운영 체크리스트

- [ ] 모든 테이블 RLS ON, anon은 insert-only 명시
- [ ] Service Role Key는 서버 코드에서만 사용 (클라이언트 절대 X)
- [ ] 휴대폰 인증 IP/번호별 분당 발송 제한
- [ ] 신고 누적 N회 시 자동 숨김 + 관리자 큐
- [ ] 약관/개인정보처리방침 별도 페이지
- [ ] 회원 탈퇴 시 개인정보 즉시 파기 + 로그는 익명화
- [ ] 청소년 보호: 기본 차단어 사전, 신고 우선 처리
- [ ] 마이룸은 미리 검수된 PNG 가구만 선택 — 사용자 임의 업로드 금지
- [ ] Sentry 에러 PII 마스킹
- [ ] DB 일일 백업 + 30일 보관 (Supabase Pro 이상 자동)

---

## 9. 출시 로드맵 (4 페이즈)

| 페이즈 | 기간 | 산출물 |
|---|---|---|
| **P0 — 사전등록** | 1~2주 | 랜딩 페이지(이 저장소) + UTM + waitlist |
| **P1 — MVP** | 6~8주 | 회원가입/약관/휴대폰인증, 게시판(자유/도와주세요), 채팅 1:1, 출석체크 |
| **P2 — 코어** | 4~6주 | 지도, 그룹채팅, 친구, 신고, 푸시, 관리자 통계 |
| **P3 — 차별화** | 4~6주 | 마이룸 꾸미기, 포인트 상점, 레벨/뱃지, 공동구매 |

> 각 페이즈는 GitHub Project로 칸반 운영, 페이즈별 베타 테스터 50→200→1000명.

---

## 10. 부록 — 의사결정 근거 요약

- **왜 RN + Expo?** 코드 1벌로 양 플랫폼, OTA로 긴급 수정 즉시 배포, 카카오/네이버 SDK 모두 RN 라이브러리 존재.
- **왜 Supabase?** Auth + DB + Realtime + Storage + Edge가 한 콘솔. Firebase 대비 **SQL/RLS** 로 권한 정밀 제어, 락인 ↓ (PostgreSQL 표준).
- **왜 모노레포?** UI/타입을 앱·관리자·랜딩이 공유 → 디자인 변경 한 번에 반영.
- **왜 PNG 마이룸(2.5D)?** 3D 모델 제작 비용을 1/10로 감축, 디자이너가 직접 가구 추가 가능.
- **왜 카카오맵?** 한국 POI 정확도, 사용자 친숙도, 무료 한도 충분.

---

> 본 문서는 v1. 페이즈 진행에 따라 `CHANGELOG` 섹션을 추가하며 갱신.
