# 3team-holo

> **HOLO** — 2030 1인 가구를 위한 지역 커뮤니티 앱.
> 본 저장소는 HOLO의 **전체 제작 설명서**와 **홍보용 랜딩 페이지** 를 담고 있습니다.

---

## 📦 무엇이 들어있나요?

```
3team-holo/
├── apps/
│   └── prototype/                 # 🆕 React 클릭 프로토타입 (온보딩+홈+마이룸)
├── docs/                          # 제작 설명서 (의사결정 근거)
│   ├── HOLO-제작설명서.md         # 메인 설명서
│   ├── HOLO-제작설명서.html       # 동일 내용 HTML (오프라인 열람)
│   ├── 아키텍처.md                 # 시스템/ER/시퀀스 등 다이어그램 5종
│   ├── 아키텍처.html               # Mermaid 자동 렌더 단일 HTML
│   ├── 운영비-시뮬레이션.md         # MAU 단계별 비용 표
│   ├── 기술스택-비교표.md           # RN vs Flutter 등 후보 비교
│   ├── 폴더구조-가이드.md           # 모노레포 + 컨벤션
│   └── UTM-홍보관리-가이드.md       # UTM 표준 + 관리자 통계 스펙
├── landing/                       # 홍보용 랜딩 페이지 (단일 HTML)
│   ├── index.html
│   ├── assets/
│   │   ├── styles.css             # 디자인 토큰 + 반응형
│   │   ├── app.js                 # UTM 캡처 + 사전등록 폼
│   │   ├── supabase.js            # Supabase 연결 (key 채우면 동작)
│   │   └── og-image.svg           # OpenGraph 썸네일
│   └── README.md                  # 배포 + Supabase 세팅 SQL
└── dist/
    └── HOLO-제작패키지.zip         # 위 docs + landing 묶음
```

---

## ⬇️ 다운로드 방법

### 방법 1 — 전체 ZIP
- 우측 상단 **`Code` → `Download ZIP`**
- 저장소 전체(README + docs + landing + dist) 한 번에 받기

### 방법 2 — 묶음 패키지만
- **[`dist/HOLO-제작패키지.zip`](./dist/HOLO-제작패키지.zip)** 클릭 → "Download" 또는 "Raw"
- docs + landing 만 포함된 가벼운 zip

### 방법 3 — 개별 문서 바로 열기
- `docs/HOLO-제작설명서.html` 또는 `docs/아키텍처.html` 을 브라우저로 열면 바로 열람 가능

### 방법 4 — git clone
```bash
git clone https://github.com/kkm450815/3team-holo.git
cd 3team-holo
open docs/HOLO-제작설명서.html   # macOS
xdg-open docs/HOLO-제작설명서.html   # Linux
```

---

## 🚀 빠른 시작

### 🆕 프로토타입 앱 미리보기 (React)
```bash
cd apps/prototype
pnpm install
pnpm dev    # → http://localhost:5173
```
디자인 시안의 **온보딩 8화면 + 홈 + 마이룸 꾸미기** 가 실제로 동작하는 클릭 프로토타입.
자세한 안내: [`apps/prototype/README.md`](apps/prototype/README.md)

### 랜딩 로컬 미리보기
```bash
cd landing
python3 -m http.server 8080
# → http://localhost:8080
```

UTM 파라미터를 붙여 접속하면 `localStorage` 에 자동 저장 후, 사전등록 폼 제출 시 함께 전송됩니다:
```
http://localhost:8080/?utm_source=kakao&utm_campaign=launch
```

### Supabase 사전등록 활성화
`landing/README.md` 의 "2. Supabase 연결" 섹션 참고. 5분이면 됩니다.

### 제작 설명서 읽기
```bash
# Markdown 으로 (GitHub 또는 에디터)
docs/HOLO-제작설명서.md

# HTML 로 (오프라인 열람)
docs/HOLO-제작설명서.html

# 다이어그램만 빠르게
docs/아키텍처.html
```

---

## 📋 문서 인덱스

| 질문 | 어디에? |
|---|---|
| 어떤 기술스택을 써야 하나요? | [`docs/HOLO-제작설명서.md`](docs/HOLO-제작설명서.md) §2, [`docs/기술스택-비교표.md`](docs/기술스택-비교표.md) |
| 운영비가 얼마나 드나요? | [`docs/운영비-시뮬레이션.md`](docs/운영비-시뮬레이션.md) |
| 서버 연결은 어떻게 하나요? | [`docs/HOLO-제작설명서.md`](docs/HOLO-제작설명서.md) §3, [`docs/아키텍처.md`](docs/아키텍처.md) |
| 폴더는 어떻게 나누나요? | [`docs/폴더구조-가이드.md`](docs/폴더구조-가이드.md) |
| UTM/홍보 관리는? | [`docs/UTM-홍보관리-가이드.md`](docs/UTM-홍보관리-가이드.md) |
| 데이터 모델은? | [`docs/아키텍처.md`](docs/아키텍처.md) §2 (ER) |
| 출시 로드맵은? | [`docs/HOLO-제작설명서.md`](docs/HOLO-제작설명서.md) §9 |

---

## 🛠 권장 기술 스택 (요약)

| 영역 | 선택 |
|---|---|
| 모바일 앱 | **React Native + Expo (TypeScript)** |
| 마이룸 | **react-three-fiber** + 2.5D 아이소메트릭 PNG |
| 백엔드 | **Supabase** (Postgres + Auth + Realtime + Storage + Edge) |
| 지도 | 카카오맵 SDK |
| 인증 | Supabase Auth + 카카오/네이버/구글 OAuth + NHN SMS |
| 푸시 | Expo Push (FCM/APNs) |
| 관리자/랜딩 | Next.js (관리자) + 정적 HTML (랜딩) |
| 분석 | GA4 + PostHog + Sentry |
| CI/CD | GitHub Actions + EAS Build |

---

## 💸 운영비 한눈에

| 단계 | MAU | 월 비용 |
|---|---|---|
| MVP | ~1k | 0 ~ 3만원 |
| 초기 성장 | ~10k | 11 ~ 21만원 |
| 본격 운영 | ~100k | 130 ~ 250만원 |

상세 산식: [`docs/운영비-시뮬레이션.md`](docs/운영비-시뮬레이션.md)

---

## 📝 라이선스

본 저장소의 문서/코드는 **MIT** 로 공개됩니다.
HOLO 브랜드/로고/캐릭터는 별도 권리.
