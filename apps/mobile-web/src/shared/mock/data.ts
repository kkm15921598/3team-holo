// 타입 정의와 앱 설정 상수만 유지 — 실제 mock 데이터는 모두 제거됨.
// 게시글·댓글·채팅방·친구 등의 초기 데이터는 Supabase에서만 로드됨.

export const BOARD_CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "free", label: "자유게시판" },
  { id: "share", label: "공동구매 / 소분하기" },
  { id: "recommend", label: "추천해요" },
  { id: "game", label: "게임파티" },
  { id: "sport", label: "같이 운동해요" },
  { id: "media", label: "드라마 · 영화" },
  { id: "food", label: "맛집 & 먹거리" },
  { id: "help", label: "도와주세요!" },
] as const;

// Board2 카드의 제목 앞에 붙는 짧은 카테고리 라벨
export const CATEGORY_SHORT: Record<string, string> = {
  all: "전체",
  free: "자유",
  share: "소분",
  recommend: "추천",
  game: "게임",
  sport: "운동",
  media: "영화",
  food: "맛집",
  help: "도움",
};

export type PostStatus = "모집중" | "모집완료";

export type PostLocation = {
  lat: number;
  lng: number;
  placeName?: string;
};

export type ParticipantAvatar = {
  avatarBg: string;
};

export type Post = {
  id: string;
  category: string;
  status: PostStatus;
  title: string;
  description: string;
  distance: string;
  duration: string;
  likes: number;
  comments: number;
  timeAgo: string;
  authorNickname: string;
  /** 작성자 전화번호 — 닉네임 변경 이후에도 "내 글" 판별에 사용 */
  authorPhone?: string | null;
  authorLevel: number;
  location?: PostLocation;
  /** 현재 참여자. 4명 이상이면 카드에 +N 표시. */
  participants?: ParticipantAvatar[];
  // Optional meetup metadata (used by Board5 publish/edit flow)
  meetupType?: string;
  /** 모임 시작일 (YYYY-MM-DD). 단기성은 단일 날짜, 장기성은 시작일. */
  eventDate?: string;
  /** 단기성 모임의 시작 시각 (HH:MM, 24h). 장기성에선 사용하지 않음. */
  eventTime?: string;
  /** 게시글 첨부 사진 (data URL 배열). 글쓰기 하단 "사진" 버튼으로 등록. */
  photoUrls?: string[];
  /** 장기성 모임 종료일 (YYYY-MM-DD). 단기성에선 사용하지 않음. */
  endDate?: string;
  peopleCount?: number | null;
  place?: string;
  /** 실제 조회수 — Supabase posts.views 컬럼 값. */
  views?: number;
};

export type MeetingInfo = {
  date: string; // 예: "5/10 (토)"
  time: string; // 예: "오후 7:00"
  place: string; // 예: "반포 한강공원"
};

export type ChatRoom = {
  id: string;
  name: string;
  subtitle: string;
  isGroup: boolean;
  memberCount: number; // 1:1은 2, 그룹은 3 이상
  memberNames?: string[]; // 그룹방의 멤버 닉네임 (자기 제외)
  lastMessage: string;
  lastTime: string;
  unread: number;
  pinned?: boolean;
  muted?: boolean;
  online?: boolean;
  meeting?: MeetingInfo;
  /** 마지막 활동 시각(ms epoch) — 채팅 리스트 정렬용. 메시지 전송/수신 시 갱신. */
  updatedAt?: number;
  /** 방장 닉네임 — 모임방의 경우 게시글 작성자와 항상 동일. 1:1 / 일반 그룹은 undefined. */
  hostNickname?: string;
};

export type ChatMessageReaction = {
  emoji: string;
  count: number;
  /** 보는 사람이 이 반응을 눌렀는지 — senders 로부터 뷰어별로 계산되는 파생값(저장 X) */
  mine?: boolean;
  /** 이 이모지를 누른 사용자들의 전화번호. count 의 진실 소스이며 mine 계산에 사용. */
  senders?: string[];
};

export type ChatMessage = {
  id: string;
  nickname: string;
  content: string;
  time: string;
  mine: boolean;
  date?: string; // YYYY-MM-DD, 첫 메시지에만
  type?: "text" | "image" | "system" | "file" | "location";
  imageUrl?: string;
  // 파일 첨부
  fileName?: string;
  fileSize?: number; // bytes
  fileMime?: string;
  // 위치 첨부
  location?: { lat: number; lng: number; address?: string };
  read?: boolean; // 내가 보낸 메시지의 읽음 여부
  readBy?: number; // 단톡방 안 읽은 사람 수
  replyTo?: { nickname: string; content: string };
  reactions?: ChatMessageReaction[];
  /** 다른 채팅방에서 전달된 메시지인지 표시 — 말풍선 위에 "전달됨" 라벨 노출 */
  forwarded?: boolean;
};

export const CHAT_QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export const POINT_GUIDE_ONCE = [
  { label: "접속하기", value: 5 },
  { label: "첫 글 작성", value: 20 },
  { label: "첫 가구 배치", value: 10 },
  { label: "동네 인증", value: 10 },
];
export const POINT_GUIDE_REPEAT = [
  { label: "글쓰기", value: 5 },
  { label: "댓글 달기", value: 1 },
  { label: "친구 초대 시", value: 50 },
  { label: "단기 모임 참석", value: 20 },
  { label: "장기 모임 참석", value: 20 },
];

/** 칭호 등급. starter=가입 즉시, common=일반, rare=희귀, legendary=전설. */
export type TitleTier = "starter" | "common" | "rare" | "legendary";

export type TitleMeta = {
  name: string;       // "#홀로_입주자" — 해시태그 포함이 곧 id
  condition: string;  // 획득 조건 한 줄
  tier: TitleTier;
};

/**
 * 칭호 메타데이터 — 41종.
 * - starter(1): 가입 시 자동 발급
 * - common(28): 일반 활동 조건
 * - rare(8): 까다로운 조건
 * - legendary(4): 다른 칭호 누적 등 최상위 조건
 */
export const TITLES_META: TitleMeta[] = [
  // ── 스타터 ──────────────────────────────────────────────
  { name: "#홀로_입주자", condition: "HOLO 가입을 완료하면 자동으로 받아요.", tier: "starter" },

  // ── 일반 칭호 (28) ────────────────────────────────────
  { name: "#동네_수다왕",       condition: "자유게시판 글 20개 작성",                  tier: "common" },
  { name: "#댓글_장인",         condition: "댓글 200개 작성",                          tier: "common" },
  { name: "#추천_요정",         condition: "추천해요 게시글 10개 작성",                tier: "common" },
  { name: "#맛집_네비게이터",   condition: "맛집 & 먹거리 게시글 10개 작성",           tier: "common" },
  { name: "#집밥_나눔왕",       condition: "맛집 & 먹거리 게시글 15개 작성",           tier: "common" },
  { name: "#배달비_절약러",     condition: "나눔 · 공구 게시글 5개 작성",              tier: "common" },
  { name: "#공구의_주인공",     condition: "나눔 · 공구 게시글 10개 작성",             tier: "common" },
  { name: "#소분_마스터",       condition: "나눔 · 공구 게시글 15개 작성",             tier: "common" },
  { name: "#게임_길드장",       condition: "게임파티 게시글 5개 작성",                 tier: "common" },
  { name: "#랜선_파티원",       condition: "게임파티 게시글 10개 작성",                tier: "common" },
  { name: "#홈트_동기부여",     condition: "같이 운동해요 게시글 10개 작성",           tier: "common" },
  { name: "#운동메이트",        condition: "같이 운동해요 게시글 15개 작성",           tier: "common" },
  { name: "#정주행_마스터",     condition: "드라마 · 영화 게시글 15개 작성",           tier: "common" },
  { name: "#스포주의_전문가",   condition: "드라마 · 영화 게시글 25개 작성",           tier: "common" },
  { name: "#벌레_해결사",       condition: "도와주세요 게시글 5개 작성",               tier: "common" },
  { name: "#전등교체_마법사",   condition: "도와주세요 게시글 10개 작성",              tier: "common" },
  { name: "#조립식가구_장인",   condition: "도와주세요 게시글 15개 작성",              tier: "common" },
  { name: "#못박기_달인",       condition: "도와주세요 게시글 20개 작성",              tier: "common" },
  { name: "#와이파이_구원자",   condition: "도와주세요 게시글 25개 작성",              tier: "common" },
  { name: "#분리수거_박사",     condition: "댓글 50개 작성",                           tier: "common" },
  { name: "#동네_보안관",       condition: "댓글 100개 작성",                          tier: "common" },
  { name: "#무료나눔_천사",     condition: "나눔 · 공구 게시글 20개 작성",             tier: "common" },
  { name: "#슬기로운_혼삶",     condition: "서로 다른 게시판 5곳에 글 작성",           tier: "common" },
  { name: "#청소력_만렙",       condition: "좋아요 50개 누르기",                       tier: "common" },
  { name: "#동네_인싸",         condition: "친구 추가 20명",                           tier: "common" },
  { name: "#오늘은_내가요리사", condition: "맛집 & 먹거리 게시글 20개 작성",           tier: "common" },
  { name: "#냉장고_탐험가",     condition: "맛집 & 먹거리 게시글 5개 작성",            tier: "common" },
  { name: "#프로_공구러",       condition: "나눔 · 공구 게시글 30개 작성",             tier: "common" },

  // ── 희귀 칭호 (8) ──────────────────────────────────────
  { name: "#새벽의_해결사",         condition: "도와주세요 게시글 30개 작성",        tier: "rare" },
  { name: "#오늘도_삽질중",         condition: "게시글 누적 30개 작성",              tier: "rare" },
  { name: "#동네_프로참견러",       condition: "댓글 500개 작성",                    tier: "rare" },
  { name: "#생활치트키",            condition: "8개 게시판 모두에 글 작성",          tier: "rare" },
  { name: "#에어프라이어_연금술사", condition: "맛집 & 먹거리 게시글 30개 작성",     tier: "rare" },
  { name: "#멀티탭_지배자",         condition: "도와주세요 게시글 40개 작성",        tier: "rare" },
  { name: "#비오기전_빨래수거",     condition: "게시글 누적 50개 작성",              tier: "rare" },
  { name: "#쿠팡의_후예",           condition: "나눔 · 공구 게시글 40개 작성",       tier: "rare" },

  // ── 전설 칭호 (4) ──────────────────────────────────────
  { name: "#자취의_신",       condition: "일반 칭호 15개 획득",                    tier: "legendary" },
  { name: "#우리동네_전설",   condition: "게시글 / 댓글 합산 1000회",              tier: "legendary" },
  { name: "#인류애_충전기",   condition: "좋아요 1000개 누르기",                   tier: "legendary" },
  { name: "#HOLO_살림의신",   condition: "일반 · 희귀 칭호 전부 획득",             tier: "legendary" },
];

/** 칭호 이름만 모은 배열 — 기존 코드와의 호환을 위해 유지 */
export const TITLES: string[] = TITLES_META.map((t) => t.name);

/** 이름으로 칭호 메타 조회 */
export function getTitleMeta(name: string): TitleMeta | undefined {
  return TITLES_META.find((t) => t.name === name);
}

export type Badge = {
  id: string;       // badge_01 ~ badge_26
  label: string;
  condition: string;
  date?: string;    // 획득 시 날짜 (account-stats-store에서 관리)
};

export const BADGES: Badge[] = [
  { id: "badge_01", label: "빨래 요정",      condition: "세탁 관련 게시글을 5개 이상 작성하세요." },
  { id: "badge_02", label: "장보기 달인",    condition: "공동구매 모임에 3회 이상 참여하세요." },
  { id: "badge_03", label: "분리수거 요원",  condition: "분리수거 관련 글을 5개 이상 작성하세요." },
  { id: "badge_04", label: "설거지 명수",    condition: "음식 나눔 후기를 3개 이상 작성하세요." },
  { id: "badge_05", label: "재료 손질 장인", condition: "집밥 관련 게시글을 10개 이상 작성하세요." },
  { id: "badge_06", label: "홈카페 사장님",  condition: "카페 모임에 5회 이상 참여하세요." },
  { id: "badge_07", label: "다정한 이웃",    condition: "이웃에게 댓글을 50개 이상 달아주세요." },
  { id: "badge_08", label: "꿀잠 수호자",    condition: "출석 체크를 30일 연속 달성하세요." },
  { id: "badge_09", label: "먼지 사냥꾼",    condition: "청소 관련 게시글을 5개 이상 작성하세요." },
  { id: "badge_10", label: "지구 지킴이",    condition: "환경 관련 모임에 3회 이상 참여하세요." },
  { id: "badge_11", label: "집밥 고수",      condition: "음식 나눔 모임에 5회 이상 참여하세요." },
  { id: "badge_12", label: "방구석 독서가",  condition: "독서 모임에 3회 이상 참여하세요." },
  { id: "badge_13", label: "정주행의 달인",  condition: "TV·영화 게시판에 글을 10개 이상 작성하세요." },
  { id: "badge_14", label: "산책 대장",      condition: "산책 모임에 5회 이상 참여하세요." },
  { id: "badge_15", label: "릴렉스 마스터",  condition: "힐링 모임에 3회 이상 참여하세요." },
  { id: "badge_16", label: "초록 집사",      condition: "식물 관련 게시글을 5개 이상 작성하세요." },
  { id: "badge_17", label: "베이킹 마법사",  condition: "베이킹 모임에 3회 이상 참여하세요." },
  { id: "badge_18", label: "꿀광 피부",      condition: "뷰티 관련 게시글을 10개 이상 작성하세요." },
  { id: "badge_19", label: "오운완 실천가",  condition: "운동 모임에 10회 이상 참여하세요." },
  { id: "badge_20", label: "숙면 전문가",    condition: "출석 체크를 60일 연속 달성하세요." },
  { id: "badge_21", label: "동네 미식가",    condition: "맛집 관련 게시글을 10개 이상 작성하세요." },
  { id: "badge_22", label: "동네 소통가",    condition: "채팅 메시지를 500개 이상 보내세요." },
  { id: "badge_23", label: "HOLO 수호신",   condition: "레벨 30을 달성하세요." },
  { id: "badge_24", label: "홀로 입주자",    condition: "HOLO 가입을 완료하면 자동으로 발급돼요." },
  { id: "badge_25", label: "작은 쇼룸 주인", condition: "마이룸에 가구를 20개 이상 수집하세요." },
  { id: "badge_26", label: "1년째 입주민",   condition: "가입 후 출석일이 1년(365일) 이상이 되면 받아요." },
];

