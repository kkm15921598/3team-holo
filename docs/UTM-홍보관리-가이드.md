# UTM & 홍보 관리 가이드

> "어디서 들어와서 어디서 가입했고 어디서 이탈하는가" 를 한눈에 보기 위한 표준.

---

## 1. UTM 표준 (사내 규칙)

| 파라미터 | 의미 | 허용 값 (예시) |
|---|---|---|
| `utm_source` | 광고/유입 매체 | `kakao`, `instagram`, `naver_blog`, `naver_cafe`, `youtube`, `partner_xxx`, `qr_offline`, `email` |
| `utm_medium` | 매체 종류 | `social`, `cpc`, `organic`, `qr`, `email`, `referral` |
| `utm_campaign` | 캠페인명 (날짜 포함) | `launch_2025q1`, `refer_friend_v1`, `lv5_event_0301` |
| `utm_content` | 소재 식별 (A/B) | `banner_a`, `banner_b`, `card_red`, `card_blue` |
| `utm_term` | 검색 키워드 | `1인가구`, `동네친구` |

**규칙**
- 모두 소문자 + snake_case
- 값은 영문/숫자/언더스코어만 (한글 X — URL 인코딩 이슈)
- `utm_campaign` 에는 **반드시 날짜/버전** 포함

---

## 2. 단축 URL 시스템

### 데이터 모델

```sql
create table redirects (
  slug         text primary key,           -- "kakao-launch-a"
  target_url   text not null,              -- 실제 도착지
  utm          jsonb not null default '{}',-- 자동 부착할 UTM
  owner        uuid references auth.users,
  created_at   timestamptz default now()
);

create table redirect_clicks (
  id           bigserial primary key,
  slug         text references redirects(slug) on delete cascade,
  ua           text,
  ip_hash      text,            -- IP는 SHA256 해시만 저장 (개인정보 보호)
  ref          text,
  clicked_at   timestamptz default now()
);

create index on redirect_clicks (slug, clicked_at desc);
```

### 동작
1. 마케터가 관리자의 **UTM 빌더** 에서 폼 작성 → `redirects` 한 row 생성
2. 단축 URL: `https://holo.app/r/{slug}`
3. Edge Function `r-redirect`:
   - `redirects` 에서 row 조회
   - `redirect_clicks` insert (UA, IP 해시)
   - `target_url + utm` 으로 302 redirect

### Edge Function 골격

```ts
// supabase/functions/r-redirect/index.ts
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const slug = url.pathname.split('/').pop()!;
  const { data } = await sb.from('redirects').select('*').eq('slug', slug).single();
  if (!data) return new Response('Not found', { status: 404 });

  const ipHash = await sha256(req.headers.get('x-forwarded-for') ?? '');
  await sb.from('redirect_clicks').insert({
    slug, ua: req.headers.get('user-agent'), ip_hash: ipHash,
    ref: req.headers.get('referer'),
  });

  const target = new URL(data.target_url);
  Object.entries(data.utm as Record<string,string>)
    .forEach(([k,v]) => target.searchParams.set(k, v));
  return Response.redirect(target.toString(), 302);
});
```

---

## 3. 랜딩에서 UTM 캡처 → 사전등록 저장

```js
// landing/assets/app.js (요지)
const KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
const params = new URLSearchParams(location.search);
KEYS.forEach(k => {
  const v = params.get(k);
  if (v) localStorage.setItem(k, v);
});

function readUtm() {
  return Object.fromEntries(
    KEYS.map(k => [k, localStorage.getItem(k)]).filter(([,v]) => v)
  );
}

// 폼 submit:
await supabase.from('waitlist').insert({
  email, region, utm: readUtm()
});
```

→ 사전등록자가 가입 전부터 어떤 채널을 통해 들어왔는지 영속 기록.

---

## 4. 앱 설치 어트리뷰션

| 방법 | 장점 | 단점 |
|---|---|---|
| Branch.io 무료 | 자동 deferred deep link | 월 1만 클릭 한도 |
| Adjust | 정밀 | 유료 |
| **자체 (권장)** | 비용 0, 데이터 통제 | 구현 ~1주 |

**자체 구현 흐름**
1. 랜딩에서 `utm_*` localStorage 저장
2. 앱 설치 유도 버튼 클릭 시 **Universal Link / App Link** 로 앱 시도
3. 앱 미설치면 스토어로
4. 앱 첫 실행 시:
   - iOS: Pasteboard 또는 Branch (deferred deep link)
   - Android: Play Install Referrer API → utm 추출
5. 가입 시 `profiles.utm` 컬럼에 저장

---

## 5. 관리자 통계 페이지 스펙

### 5-1. 개요 (Overview)
- 카드: DAU / WAU / MAU / 신규가입(D) / D1·D7·D30 잔존
- 라인 차트: 30일 가입 추이

### 5-2. 채널/UTM
- 표: source × campaign × 가입자 × 7일 잔존율
- 막대 차트: source 별 가입자
- 단축 URL TOP 10 (클릭 → 가입 전환율)

```sql
-- 예: 채널별 가입 + 7일 잔존
create view utm_attribution as
select
  p.utm->>'utm_source'   as source,
  p.utm->>'utm_campaign' as campaign,
  count(*) filter (where p.created_at > now() - interval '30 days') as signups_30d,
  count(*) filter (where p.last_active_at > p.created_at + interval '7 days') as retained_7d
from profiles p
group by 1,2;
```

### 5-3. 게시판
- 카테고리별 글/댓글 수, 모집중→완료 전환율
- TOP 게시글 (좋아요/댓글)

### 5-4. 채팅·친구
- 채팅 시작 수, 1:1 / 그룹 비율
- 채팅 → 친구 추가 전환율

### 5-5. 마이룸
- 평균 가구 수, 방문 수, 좋아요
- TOP 인기 가구

### 5-6. 운영
- 신고 큐 (미처리/처리완료)
- 자동 숨김 로그
- 차단 사용자 목록

### 5-7. 매출 (선택)
- 일/주/월 결제액, ARPPU, 가구별 매출 TOP

---

## 6. UTM 빌더 UI (관리자 페이지)

```
+--------------------------------------+
| UTM 단축 URL 빌더                    |
+--------------------------------------+
| Slug:        [_______________]       |  ← 자동 생성 + 수정 가능
| 도착 URL:    [_______________]       |
| Source:      [kakao ▼]               |
| Medium:      [social ▼]              |
| Campaign:    [launch_2025q1____]     |
| Content:     [banner_a________]      |
| Term:        [_______________]       |
+--------------------------------------+
| 미리보기:                            |
| https://holo.app/r/kakao-launch-a    |
| → https://holo.app/?utm_source=…     |
+--------------------------------------+
| [생성하기]                           |
+--------------------------------------+
```

생성 후 표:
- slug | 도착URL | source | campaign | 클릭 | 가입 | 잔존7d | 액션(QR/복사)

---

## 7. 운영 베스트 프랙티스

1. **캠페인마다 utm_campaign 필수** — 비교 단위 통일
2. **A/B 는 utm_content 로만 분리** — source/medium 섞지 X
3. 단축 URL **slug 에 의미** 담기 (`kakao-launch-a`, 무의미 해시 X)
4. 오프라인 QR 은 **utm_medium=qr** 고정
5. 인플루언서 제휴는 **utm_source=partner_<이름>**, 정산용
6. 가입 후에도 **utm 보존**: profiles.utm jsonb 컬럼
7. 30/60/90일 단위로 **채널 ROI 회의**

---

## 8. 개인정보 / 법적 주의

- IP는 **해시 저장만** (해시 키 별도 보관 X면 사실상 비식별화)
- 사전등록 폼은 **개인정보 수집·이용 동의 체크박스** 필수
- 마케팅 수신 동의는 **별도 옵션**, 미동의 시에도 가입 가능
- 탈퇴 시 utm 포함 모든 PII 즉시 파기 또는 익명화
