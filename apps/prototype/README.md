# HOLO 웹 프로토타입

디자인 시안을 React + Vite로 재현한 **클릭 가능한 프로토타입**입니다.
실제 RN 앱으로 이식하기 전에 화면 전환·인터랙션·상태 흐름을 미리 검증합니다.

## 빠른 시작

```bash
pnpm install
pnpm dev          # → http://localhost:5173
```

## 빌드 / 미리보기

```bash
pnpm build        # 정적 파일을 dist/ 에 출력
pnpm preview      # 빌드 결과를 4173 포트에서 서빙
```

## 동작 가능한 흐름 (현재 PR 범위)

```
시작화면(Splash, 1.4초 자동전환)
  └─ 로그인 (이메일/비밀번호 + 소셜 아이콘)
       └─ 약관 동의 (필수 4 + 선택 2)
            └─ 본인 인증 (휴대폰)
                 └─ 닉네임 (1~10자, 한글/영문/숫자)
                      └─ 관심사 선택 (다중)
                           └─ 마이룸 초기 꾸미기
                                └─ 출석체크 (보상받기 → +50P)
                                     └─ 홈 (마이룸 카드 + 추천 모임 + FAB)
                                          ├─ 마이룸 카드 클릭 → 마이룸 꾸미기
                                          └─ 하단 탭 (지도/게시판/채팅/마이는 Stub)
```

## 폴더 구조

```
src/
├── App.tsx                 # 라우팅
├── main.tsx                # 엔트리 + StoreProvider
├── components/             # 재사용 컴포넌트
│   ├── Phone.tsx           # 폰 프레임 래퍼
│   ├── StatusBar.tsx       # 9:41 시뮬레이션
│   ├── AppHeader.tsx       # HOLO 로고 + 검색/알림/추천
│   ├── TabBar.tsx          # 하단 5탭
│   ├── IsoRoom.tsx         # 아이소메트릭 마이룸 SVG
│   └── Icon.tsx            # SVG 아이콘 라이브러리
├── screens/                # 화면별 컴포넌트
│   ├── Splash, Login, Terms, Verify
│   ├── Nickname, Interests, MyRoomOnboarding, Attendance
│   ├── Home, MyRoom
│   └── Stub                # 미구현 탭 placeholder
├── lib/store.tsx           # 전역 상태 (user, furniture, toast)
├── mocks/data.ts           # mock 데이터 (Supabase 연결 시 교체 지점)
└── styles/
    ├── tokens.css          # 디자인 토큰 (--brand-grad 등)
    └── global.css          # 폰 프레임, 버튼, 인풋 등
```

## Supabase 연결 시 교체 지점

| Mock 위치 | Supabase 대응 |
|---|---|
| `mocks/data.ts` `mockUser` | `profiles` 테이블 select |
| `mocks/data.ts` `mockRecommendations` | Edge Function `recommend-meetings` |
| `mocks/data.ts` `mockFurniture` | `items` 테이블 + `myroom_layouts` |
| `lib/store.tsx` `buyFurniture` | `points_log` insert + `myroom_layouts` upsert |
| `lib/store.tsx` `updateLayout` | `myroom_layouts` upsert (debounce 1s) |

`packages/api/repos/*` 에 같은 시그니처로 함수를 만들면 화면 코드 수정 없이 교체 가능합니다.

## 디자인 결정

- **폰 프레임 래퍼**: 데스크톱에서도 모바일 느낌으로 시연 가능. 480px 미만에서는 풀스크린.
- **아이소메트릭 룸**: 시안 그대로 SVG로 벽/바닥 그리고, 가구는 이모지 stand-in.
  실제 PNG 가구 에셋 들어오면 `IsoRoom.tsx` 의 `furn-*` 위치만 교체.
- **HashRouter 사용**: 정적 호스팅(Netlify/GitHub Pages 등)에서 별도 설정 없이 동작.
- **State**: 외부 상태 관리 라이브러리 없이 Context로 충분 (이 규모 기준).

## 다음 PR 후보

- 게시판 (메인 + 카테고리 리스트 + 상세 + 글쓰기 + 검색 필터)
- 채팅 (목록 + 상세)
- 지도 (카카오맵 SDK 연동, 또는 임시 SVG 지도)
- 마이페이지 (포인트/활동기록/친구/설정)
- Supabase 실연결
