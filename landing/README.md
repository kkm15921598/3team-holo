# HOLO 랜딩 페이지

HOLO 출시 전 사전 등록을 받기 위한 **단일 HTML** 페이지입니다.
의존성 0 (Pretendard CDN과 Supabase ESM CDN만 사용).

---

## 1. 빠른 미리보기 (로컬)

```bash
cd landing
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080
```

UTM 동작 확인:
```
http://localhost:8080/?utm_source=test&utm_campaign=demo
```
DevTools → Application → Local Storage 에 `utm_source=test`, `utm_campaign=demo` 저장됨.

---

## 2. Supabase 연결 (사전등록 활성화)

### 2-1. 프로젝트 생성
1. https://supabase.com 가입 후 New Project
2. Settings → API 에서 다음 두 값 복사
   - Project URL
   - anon public key

### 2-2. `assets/supabase.js` 수정
```js
export const SUPABASE_URL = 'https://abcde.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGc...';
```

### 2-3. `waitlist` 테이블 생성

Supabase Dashboard → SQL Editor 에 붙여넣고 실행:

```sql
create table waitlist (
  id          bigserial primary key,
  email       text not null unique,
  region      text,
  utm         jsonb,
  created_at  timestamptz default now()
);

alter table waitlist enable row level security;

-- 익명 사용자(anon)는 INSERT만 가능 (이메일 등록만)
create policy "anon can insert waitlist"
  on waitlist for insert to anon with check (true);

-- SELECT는 service_role 또는 관리자만 (정책 미지정 = 차단)
-- 필요 시 관리자 role 정책 추가:
-- create policy "admins can read" on waitlist for select to authenticated
--   using (exists (select 1 from admin_users where user_id = auth.uid()));
```

### 2-4. 동작 확인
1. 로컬 서버 재시작
2. 사전등록 폼에 이메일 입력 → 등록 완료 메시지
3. Supabase Dashboard → Table Editor → `waitlist` 에 row 확인
4. UTM 파라미터를 붙여 등록하면 `utm` 컬럼에 jsonb 로 저장됨

> Supabase 미설정 상태에서도 페이지는 정상 동작하며, 폼 제출 시 자동으로 `mailto:` fallback 로 안내합니다.

---

## 3. GA4 측정 ID 변경

`index.html` 상단의 `G-XXXX` 두 군데를 GA4 측정 ID로 교체:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

`sign_up` 이벤트가 자동 발송되며 UTM 파라미터가 함께 전달됩니다.

---

## 4. 배포

### Netlify (가장 쉬움)
```bash
# 이 landing 폴더를 그대로 드래그&드롭
# 또는
npx netlify deploy --dir=landing --prod
```

### Vercel
```bash
npx vercel --cwd landing --prod
```

### GitHub Pages
저장소 Settings → Pages → Source: `main` 브랜치 `/landing` 폴더.

### 정적 호스팅 (S3 / Cloudflare Pages 등)
`landing/` 폴더 통째로 업로드.

---

## 5. 커스터마이징 가이드

| 바꾸고 싶은 것 | 수정 위치 |
|---|---|
| 브랜드 컬러 | `assets/styles.css` 의 `--brand1`, `--brand2` |
| 헤드 카피 | `index.html` 의 `<h1>` 영역 |
| 기능 카드 | `index.html` 의 `#features` 섹션 |
| FAQ | `index.html` 의 `#faq` 섹션 |
| 미리보기 목업 | `.home-mock`, `.map-mock`, `.board-mock` |
| OG 이미지 | `assets/og-image.svg` |
| 폼 동의 문구 | `index.html` 의 `.agree` 라벨 |

---

## 6. 다크모드

자동 (시스템 설정 따라). 수동 토글이 필요하면 `<html data-theme="dark">` 속성을 추가하고 CSS 셀렉터를 `[data-theme="dark"]` 로 추가하세요.

---

## 7. 접근성 / SEO 체크

- ✅ semantic HTML (`header`, `section`, `footer`, `nav`)
- ✅ `lang="ko"`, viewport meta, theme-color
- ✅ Open Graph + Twitter card
- ✅ alt/aria-label 부착
- ✅ `prefers-reduced-motion` 대응
- ✅ form label 연결 (`visually-hidden` 사용)

---

## 8. 라이선스

MIT — 자유롭게 수정/배포 가능.
