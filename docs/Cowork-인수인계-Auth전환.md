# HOLO — Supabase Auth 전환 작업 인수인계 (Cowork 세션 이어받기용)

작성: 2026-06-17

> 새 Cowork 세션에서 이 작업을 이어받는 Claude를 위한 문서.
> **시작 전 반드시 이 문서 + `docs/Supabase-Auth-전환-계획서.md` + 아래 "관련 코드"를 먼저 읽을 것.**

---

## 0. 프로젝트 한눈에

- **HOLO**: 2030 1인 가구용 지역 커뮤니티 앱.
- **모바일 앱**: `apps/mobile-web` (React + Vite + TypeScript). 배포: `3team-holo.vercel.app`.
- **관리자 콘솔**: `apps/admin/index.html` (단일 정적 HTML, ~2.1MB). 배포: `3team-holo-admin.vercel.app`.
- **백엔드**: Supabase (프로젝트 id `ysfcfqfpzrmihkrilixw`).
- **중요 제약**: 실서비스(production) DB이고 **로컬 테스트 환경이 없음**. 빌드/실행 검증 불가 → "코드 수정 → 사용자가 배포(push) → 브라우저에서 테스트 → 안 되면 수정" 반복으로 진행한다.
- **사용자**: 팀장(비개발자). 실사용자는 아직 없고 테스트 계정만 존재.

### 작업 규칙 (꼭 지킬 것)
- **코드를 되돌리거나 위험한 변경을 할 땐 반드시 사용자에게 먼저 확인**받는다. (이전에 임의 롤백으로 문제가 있었음)
- 한 번에 한 단계씩. 각 단계 후 사용자 테스트로 확인하고 다음으로.
- DB 변경은 항상 멱등(`if not exists` 등) + 롤백 방법 같이 제시.

---

## 1. 인증 구조 (현재)

- **일반 사용자**: 직접 만든 `public.users` 테이블 + **anon 키**로 동작. 전화번호+비밀번호로 로그인.
  - 로그인 검증: `verify_login` RPC (서버 bcrypt). 비번 해시 생성: `hash_password` RPC.
  - "현재 로그인 계정"은 브라우저 localStorage(전화번호)로 관리 — `getCurrentAccount()`/`setCurrentAccount()` (in `src/shared/stores/account-choices-store.ts`), **39개 파일에서 사용**.
  - 작성자 식별은 닉네임(`authorNickname`) 기반 — **1137곳**. (전환 시 건드리지 않고 매핑으로 해결할 것)
- **관리자**: 관리자 콘솔이 Supabase Auth로 `admin@holo.app` 계정에 로그인(`signInWithPassword`). 즉 관리자 요청은 `authenticated` 역할 + JWT email = `admin@holo.app`.
- **합성 이메일 규칙**: 전화번호 → `{숫자만}@holo.app` (예: `01012345678@holo.app`). helper: `src/shared/lib/auth-email.ts`의 `phoneToAuthEmail()`.

---

## 2. 이미 끝난 보안 작업 (되돌리지 말 것)

DB에 적용 완료:
- 비밀번호: 서버 검증(bcrypt) + **anon은 `users.password` 못 읽게** 컬럼 잠금.
- 전 핵심 테이블 **RLS ON** (`docs/sql/2026-06-17-auth-rls.sql`).
- 공지/이벤트/문의: 읽기=공개, **쓰기=관리자**. (`docs/sql/2026-06-17-admin-write-lock.sql` 계열, 이후 정책 여러 번 조정됨)
- `grant select on users to authenticated` (관리자 select('*') 용 — 주의: authenticated 가 password도 읽을 수 있는 상태. 일반 사용자 Auth 전환 후엔 이 부분 재검토 필요 → 4단계 참고)
- service_role 키 코드 노출 없음 확인.
- 회원가입 토글: 전환 작업 위해 현재 **ON**(원래 보안상 OFF였음, 전환 끝나면 다시 OFF 결정).

부수적으로 고친 것(참고): 공지 기능 — `notices.id` bigint→text 변경, `body` 컬럼 추가, `content` NOT NULL 제거, anon/authenticated grant 정리. (모두 적용 완료)

---

## 3. Auth 전환 진행 상황 (0~2단계 완료·배포됨)

전체 계획은 `docs/Supabase-Auth-전환-계획서.md` 참고. 총 6단계(0~5).

### ✅ 0단계 — 준비 (완료)
- SQL 적용: `alter table public.users add column if not exists auth_id uuid;` + `grant insert, update on public.users to authenticated;`
- 회원가입 토글 ON.

### ✅ 1단계 — 회원가입을 Auth로 (완료·배포)
- `apps/mobile-web/src/features/signup/review-screen.tsx`: 가입 성공 후 백그라운드로 `linkAuthAccount()` 호출 → `supabase.auth.signUp({email: 합성이메일, password})` → 생성된 user.id를 `users.auth_id`에 연결 → `signOut()`(앱은 anon 유지). 실패는 best-effort 무시.
- `apps/mobile-web/src/shared/lib/auth-email.ts` 신규(phoneToAuthEmail).
- **검증됨**: 새 가입 계정이 Authentication→Users에 생기고 `users.auth_id` 채워짐.

### ✅ 2단계 — 로그인을 Auth로 (완료·배포)
- `apps/mobile-web/src/features/auth/login-screen.tsx`: `verify_login` 성공(`if (dbUser)`) 직후 `supabase.auth.signInWithPassword({email: 합성이메일, password})`로 Auth 세션 생성. Auth 계정 없는 옛 계정은 실패해도 무시.
- SQL 적용: `grant select, insert, update, delete on all tables in schema public to authenticated;` + `grant usage, select on all sequences ... to authenticated;` (로그인 시 authenticated 역할로 동작해도 앱이 안 깨지게) / 공지·이벤트·문의 쓰기 정책을 `auth.jwt()->>'email' = 'admin@holo.app'`로 제한.

### ✅ 3단계 — 세션·식별 정리 (3-1·3-2 완료·검증, 3-3 보류)
- **3-1 로그아웃/탈퇴 signOut (완료·배포·검증 2026-06-17)**
  - `mypage-screen.tsx` 로그아웃 onConfirm + `account-screen.tsx`(마이페이지) 회원탈퇴 onConfirm 에 `supabase.auth.signOut()` (best-effort, try/catch) 추가.
  - `clearCurrentAccount()` 엔 넣지 않음(로그인 직후 signInWithPassword 레이스 방지) — 로그아웃/탈퇴 지점에만.
  - **검증됨**: 로그인 시 `sb-` 키 생성(user.id = Auth Users UID 일치) → 로그아웃 시 `sb-` 키 제거 → 401 없음.
- **3-2 만료 세션 자동 정리 (완료·배포 대기 중, 검증 필요)**
  - 신규 `src/shared/lib/auth-session-guard.ts` 의 `healAuthSession()` — 앱 시작 시 죽은(만료+refresh 실패) Auth 세션을 `signOut({scope:'local'})` 로 정리해 anon 복귀. 살아있는 세션은 안 건드림.
  - `main.tsx` 시작부에서 `void healAuthSession()` 호출(import 포함).
  - 앱 로그인 상태(localStorage 전화번호=getCurrentAccount)는 안 건드림 — Supabase Auth 토큰만 정리.
- **3-3 (보류·선택)**: `getCurrentAccount`(39곳)를 Auth 세션 기반으로. 영향 범위 커서 별도 진행.

### (해결됨) 이전 알려진 문제
- ~~로그아웃 처리 없음 → 만료 시 401~~ → **3-1·3-2 로 해결.**
- 임시 복구법(참고): DevTools→Application→Storage→"Clear site data"→새로고침 (또는 `sb-` localStorage 키 삭제).

---

## 4. 다음 할 일

### ▶ 3단계 — 세션·식별 정리 (3-1·3-2 완료, 3-3 보류)
1. ~~로그아웃 시 `signOut()` 호출~~ → **3-1 완료·검증** (위 "3. 진행 상황" 참고).
2. ~~세션 만료/갱신 안정화~~ → **3-2 완료**(배포·검증 대기). `autoRefreshToken` 은 기본 ON(supabaseClient 가 옵션 미지정), 추가로 시작 시 죽은 세션 자동 정리(`healAuthSession`).
3. (보류·선택) `getCurrentAccount`(39곳)를 Auth 세션 기반으로 — 영향 범위 커서 별도 진행.

### ▶ 다음: 3-2 배포·검증 → 그 뒤 4단계(RLS)
- 3-2 검증법: 로그인 후 DevTools→Application→Local storage 의 `sb-...` 값에서 `expires_at` 을 과거 값으로 수정(만료 흉내) → 새로고침 → 콘솔 401 없이 `sb-` 키가 자동 제거되면 OK.

### ▶ 4단계 — RLS 정책 (진짜 행 단위 권한)
- `users.auth_id` ↔ `auth.uid()` 매핑으로 "본인 행만 수정/삭제" 정책을 한 테이블씩.
- **이때 재검토**: 일반 사용자도 authenticated가 되므로, 관리자 전용(공지 쓰기·users 전체조회)은 `email='admin@holo.app'`로 구분 유지. `users.password`는 authenticated가 못 읽게 좁히는 게 이상적(단, 관리자 콘솔의 `select('*')`가 깨지지 않게 — 관리자는 password를 안 쓰므로 컬럼 명시 또는 password 컬럼 폐기 검토). **참고: 관리자 콘솔은 회원 비밀번호를 읽거나 다루지 않음(확인됨).**

### ▶ 5단계 — 마무리 검증 + 회원가입 토글 최종 결정.

---

## 5. 관련 코드 (먼저 읽기)
- `apps/mobile-web/src/features/signup/review-screen.tsx` (1단계)
- `apps/mobile-web/src/features/auth/login-screen.tsx` (2단계)
- `apps/mobile-web/src/shared/lib/auth-email.ts` (합성 이메일)
- `apps/mobile-web/src/shared/stores/account-choices-store.ts` (getCurrentAccount/clearCurrentAccount)
- `apps/mobile-web/src/features/mypage/mypage-screen.tsx`, `account-screen.tsx` (로그아웃 지점)
- `docs/Supabase-Auth-전환-계획서.md` (전체 계획)
