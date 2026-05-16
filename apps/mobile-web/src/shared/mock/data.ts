// 시안에서 추출한 mock 데이터 — Phase D에서 Supabase로 교체 예정
import { BULK_POSTS } from "./bulk-posts";

export const ME = {
  nickname: "달콤한 무지",
  level: 1,
  points: 0,
  title: "#홀로_입주자",
  region: "성남시 분당구",
  friendCode: "ajhd5",
  badgeIcon: "🍩",
  postsCount: 10,
  commentsCount: 24,
  daysActive: 12,
};

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
  authorLevel: number;
  location?: PostLocation;
  /** 현재 참여자. 4명 이상이면 카드에 +N 표시. */
  participants?: ParticipantAvatar[];
  // Optional meetup metadata (used by Board5 publish/edit flow)
  meetupType?: string;
  eventDate?: string;
  peopleCount?: number | null;
  place?: string;
};

// 사용자(나)의 현재 위치 — 분당 미금역 부근 더미값.
export const MY_LOCATION: PostLocation = {
  // 분당구 구미동 미금역 (신분당선 / 수인분당선) — 37°21'00"N 127°06'32"E
  lat: 37.3500,
  lng: 127.1089,
  placeName: "미금역",
};

// 미금역 반경 ~500m 내 더미 게시물 위치.
export const POSTS: Post[] = [
  {
    id: "1",
    category: "food",
    meetupType: "단기성 모임",
    status: "모집중",
    title: "점심 번개",
    description: "오피스 단지 떡볶이 메이트!",
    distance: "120m",
    duration: "20분",
    likes: 1,
    comments: 0,
    timeAgo: "33분 전",
    authorNickname: "춤추는 토끼",
    authorLevel: 14,
    location: { lat: 37.339, lng: 127.1049, placeName: "미금역 1번 출구" },
    participants: [
      { avatarBg: "#FCEBB5" },
      { avatarBg: "#C7BDFF" },
      { avatarBg: "#FFCFCF" },
    ],
  },
  {
    id: "2",
    category: "share",
    meetupType: "단기성 모임",
    status: "모집완료",
    title: "수박 소분",
    description: "마트에서 산 큰 수박 나눌 분~",
    distance: "300m",
    duration: "15분",
    likes: 1,
    comments: 0,
    timeAgo: "33분 전",
    authorNickname: "노래하는 햇살",
    authorLevel: 13,
    location: { lat: 37.3487, lng: 127.1072, placeName: "도깨비 식자재마트" },
    participants: [
      { avatarBg: "#FCEBB5" },
      { avatarBg: "#C7BDFF" },
      { avatarBg: "#FFCFCF" },
      { avatarBg: "#CCBCE0" },
      { avatarBg: "#DDC0FF" },
      { avatarBg: "#CAE4B9" },
      { avatarBg: "#F4A261" },
    ],
  },
  {
    id: "3",
    category: "sport",
    meetupType: "장기성 모임",
    status: "모집중",
    title: "강아지 산책친구 구해요",
    description: "매주 주말 한강공원 산책",
    distance: "250m",
    duration: "60분",
    likes: 0,
    comments: 2,
    timeAgo: "33분 전",
    authorNickname: "포근한 두부",
    authorLevel: 8,
    location: { lat: 37.3472, lng: 127.1111, placeName: "정자일로 공원" },
    participants: [
      { avatarBg: "#FCEBB5" },
      { avatarBg: "#C7BDFF" },
    ],
  },
  {
    id: "4",
    category: "sport",
    meetupType: "장기성 모임",
    status: "모집중",
    title: "헬스장 등록 같이 해요",
    description: "꾸준히 같이 가실 분 구해요",
    distance: "400m",
    duration: "60분",
    likes: 3,
    comments: 0,
    timeAgo: "33분 전",
    authorNickname: "고소한 감자",
    authorLevel: 31,
    location: { lat: 37.3694, lng: 127.103, placeName: "분당 엠코헤리츠 상가" },
    participants: [
      { avatarBg: "#FCEBB5" },
      { avatarBg: "#C7BDFF" },
      { avatarBg: "#FFCFCF" },
      { avatarBg: "#CCBCE0" },
      { avatarBg: "#DDC0FF" },
    ],
  },
  // 홈 추천 모임 카드와 매칭되는 게시글 (id: hm3 ~ hm10)
  { id: "hm3", category: "food", meetupType: "단기성 모임", status: "모집중", title: "편의점 야식", description: "혼자 먹긴 많아서요 ㅎㅎ", distance: "120m", duration: "5분", likes: 3, comments: 0, timeAgo: "10분 전", authorNickname: "신나는 펭귄", authorLevel: 10, location: { lat: 37.3827, lng: 127.1216, placeName: "GS25 미금역점" }, participants: [{ avatarBg: "#FCEBB5" }] },
  { id: "hm4", category: "share", meetupType: "단기성 모임", status: "모집중", title: "코스트코 소분", description: "코스트코에서 함께 장 보고 나눌 분~", distance: "700m", duration: "50분", likes: 0, comments: 0, timeAgo: "20분 전", authorNickname: "씩씩한 사슴", authorLevel: 15, location: { lat: 37.3859, lng: 127.1247, placeName: "코스트코 분당점" }, participants: [{ avatarBg: "#C7BDFF" }, { avatarBg: "#FCEBB5" }] },
  { id: "hm5", category: "sport", meetupType: "장기성 모임", status: "모집중", title: "러닝 메이트", description: "오늘 저녁에 같이 뛰어요!", distance: "200m", duration: "60분", likes: 0, comments: 0, timeAgo: "15분 전", authorNickname: "용감한 곰", authorLevel: 18, peopleCount: 6, location: { lat: 37.3929, lng: 127.1378, placeName: "탄천 산책로" }, participants: [{ avatarBg: "#FCEBB5" }, { avatarBg: "#C7BDFF" }, { avatarBg: "#FFCFCF" }, { avatarBg: "#CCBCE0" }, { avatarBg: "#DDC0FF" }] },
  { id: "hm6", category: "help", meetupType: "단기성 모임", status: "모집중", title: "스터디 카페", description: "조용히 공부할 분 모집해요", distance: "400m", duration: "120분", likes: 0, comments: 0, timeAgo: "30분 전", authorNickname: "다정한 별빛", authorLevel: 22, location: { lat: 37.4131, lng: 127.1254, placeName: "토즈 스터디카페" }, participants: [{ avatarBg: "#FCEBB5" }, { avatarBg: "#C7BDFF" }, { avatarBg: "#FFCFCF" }] },
  { id: "hm7", category: "game", meetupType: "장기성 모임", status: "모집중", title: "보드게임 모임", description: "할리갈리 마피아 환영해요", distance: "650m", duration: "90분", likes: 0, comments: 0, timeAgo: "40분 전", authorNickname: "재밌는 너구리", authorLevel: 19, peopleCount: 8, location: { lat: 37.4137, lng: 127.1308, placeName: "보드앤플레이 보드게임카페" }, participants: [{ avatarBg: "#FCEBB5" }, { avatarBg: "#C7BDFF" }, { avatarBg: "#FFCFCF" }, { avatarBg: "#CCBCE0" }, { avatarBg: "#DDC0FF" }, { avatarBg: "#CAE4B9" }] },
  { id: "hm8", category: "food", meetupType: "단기성 모임", status: "모집중", title: "카페 투어", description: "동네 신상 카페 같이 가요", distance: "800m", duration: "180분", likes: 0, comments: 3, timeAgo: "1시간 전", authorNickname: "춤추는 토끼", authorLevel: 14, location: { lat: 37.3938, lng: 127.1094, placeName: "정자동 카페거리" }, participants: [{ avatarBg: "#FCEBB5" }, { avatarBg: "#C7BDFF" }] },
  { id: "hm9", category: "sport", meetupType: "장기성 모임", status: "모집중", title: "산책 메이트", description: "공원 한바퀴 같이 돌 분~", distance: "150m", duration: "40분", likes: 0, comments: 0, timeAgo: "5분 전", authorNickname: "다정한 토끼", authorLevel: 9, location: { lat: 37.4032, lng: 127.107, placeName: "정자일로 공원" }, participants: [{ avatarBg: "#FCEBB5" }, { avatarBg: "#C7BDFF" }] },
  { id: "hm10", category: "help", meetupType: "단기성 모임", status: "모집중", title: "독서 모임", description: "이번 주 책 같이 읽어요", distance: "550m", duration: "75분", likes: 0, comments: 0, timeAgo: "2시간 전", authorNickname: "정겨운 단풍", authorLevel: 11, location: { lat: 37.3955, lng: 127.1054, placeName: "정자도서관" }, participants: [{ avatarBg: "#FCEBB5" }, { avatarBg: "#C7BDFF" }, { avatarBg: "#FFCFCF" }, { avatarBg: "#CCBCE0" }] },
  // 자유게시판 (free)
  { id: "f1", category: "free", meetupType: "단기성 모임", status: "모집중", title: "떡볶이 어디가 맛있나요?", description: "아파트 근처 분식집이 궁금해요", distance: "0m", duration: "0분", likes: 3, comments: 0, timeAgo: "33분 전", authorNickname: "보송보송한 햄찌", authorLevel: 12 },
  { id: "f2", category: "free", meetupType: "단기성 모임", status: "모집중", title: "주말에 뭐 하세요?", description: "심심한데 같이 놀 친구 구해요", distance: "0m", duration: "0분", likes: 0, comments: 0, timeAgo: "1시간 전", authorNickname: "매콤한 떡볶이", authorLevel: 7 },
  { id: "f3", category: "free", meetupType: "단기성 모임", status: "모집중", title: "근처 카페 추천", description: "공부할 만한 조용한 카페 있나요?", distance: "0m", duration: "0분", likes: 0, comments: 0, timeAgo: "2시간 전", authorNickname: "달콤한 복숭아", authorLevel: 15 },
  // 추천해요 (recommend)
  { id: "r1", category: "recommend", meetupType: "단기성 모임", status: "모집중", title: "최근에 본 영화 추천", description: "스릴러 좋아하면 꼭 보세요!", distance: "0m", duration: "0분", likes: 0, comments: 0, timeAgo: "10분 전", authorNickname: "고소한 감자", authorLevel: 31 },
  { id: "r2", category: "recommend", meetupType: "단기성 모임", status: "모집중", title: "근처 맛집 추천", description: "골목 안쪽에 숨은 보석 같은 가게", distance: "0m", duration: "0분", likes: 10, comments: 0, timeAgo: "30분 전", authorNickname: "달콤한 복숭아", authorLevel: 15 },
  // 게임파티 (game)
  { id: "g1", category: "game", meetupType: "장기성 모임", status: "모집중", title: "보드게임 같이 해요", description: "주말 저녁 보드게임 카페 모임", distance: "150m", duration: "120분", likes: 9, comments: 5, timeAgo: "20분 전", authorNickname: "보송보송한 햄찌", authorLevel: 12, peopleCount: 6, location: { lat: 37.3873, lng: 127.0896, placeName: "미금역 사거리" } },
  { id: "g2", category: "game", meetupType: "장기성 모임", status: "모집완료", title: "PC방 4명 모집", description: "오버워치 같이 하실 분", distance: "300m", duration: "180분", likes: 0, comments: 10, timeAgo: "1시간 전", authorNickname: "고소한 감자", authorLevel: 31, peopleCount: 4, location: { lat: 37.4023, lng: 127.1154, placeName: "PC방 미금역점" } },
  // 드라마 · 영화 (media)
  { id: "m1", category: "media", meetupType: "장기성 모임", status: "모집중", title: "넷플릭스 같이 정주행", description: "주말마다 같이 정주행할 분 모집", distance: "100m", duration: "240분", likes: 0, comments: 0, timeAgo: "45분 전", authorNickname: "새콤한 망고", authorLevel: 18, peopleCount: 4, location: { lat: 37.3756, lng: 127.1318, placeName: "분당 정자동" } },
  // 도와주세요! (help)
  { id: "h1", category: "help", meetupType: "단기성 모임", status: "모집중", title: "이사 짐 옮길 분", description: "오후 시간 잠깐 도와주실 분 구해요", distance: "120m", duration: "30분", likes: 0, comments: 0, timeAgo: "5분 전", authorNickname: "보송보송한 햄찌", authorLevel: 12, peopleCount: 2, location: { lat: 37.3928, lng: 127.1354, placeName: "분당 정자동 아파트" } },

  // ── 카테고리별 10개 보장을 위한 추가 게시글 ─────────────────────
  // 맛집 & 먹거리 (food) — +6
  { id: "fd11", category: "food", meetupType: "단기성 모임", status: "모집중", title: "마라탕 메이트", description: "오늘 저녁 마라탕 같이 드실 분", distance: "250m", duration: "60분", likes: 1, comments: 0, timeAgo: "25분 전", authorNickname: "춤추는 토끼", authorLevel: 14, peopleCount: 4, location: { lat: 37.366, lng: 127.1122, placeName: "탕화쿵푸 정자점" } },
  { id: "fd12", category: "food", meetupType: "단기성 모임", status: "모집중", title: "치킨 한 마리", description: "야식 같이 시켜 먹어요", distance: "180m", duration: "45분", likes: 0, comments: 1, timeAgo: "50분 전", authorNickname: "신나는 펭귄", authorLevel: 10, peopleCount: 3, location: { lat: 37.3813, lng: 127.1175, placeName: "BHC 정자점" } },
  { id: "fd13", category: "food", meetupType: "단기성 모임", status: "모집중", title: "브런치 카페", description: "주말 브런치 같이 가요", distance: "550m", duration: "90분", likes: 0, comments: 0, timeAgo: "3시간 전", authorNickname: "사랑스러운 백합", authorLevel: 16, peopleCount: 4, location: { lat: 37.3394, lng: 127.105, placeName: "라이크라이크 카페" } },
  { id: "fd14", category: "food", meetupType: "단기성 모임", status: "모집중", title: "삼겹살 회식", description: "퇴근 후 가볍게 삼겹살 어때요", distance: "320m", duration: "120분", likes: 8, comments: 1, timeAgo: "4시간 전", authorNickname: "씩씩한 사슴", authorLevel: 15, peopleCount: 6, location: { lat: 37.3484, lng: 127.1076, placeName: "정자 고기굽는집" } },
  { id: "fd15", category: "food", meetupType: "단기성 모임", status: "모집중", title: "초밥 점심", description: "맛있는 초밥집 같이 가실 분", distance: "420m", duration: "70분", likes: 0, comments: 0, timeAgo: "1일 전", authorNickname: "발랄한 코스모스", authorLevel: 19, peopleCount: 4, location: { lat: 37.3433, lng: 127.1084, placeName: "스시노믹 정자점" } },
  { id: "fd16", category: "food", meetupType: "단기성 모임", status: "모집완료", title: "김치찌개 점심", description: "정자동 김치찌개 맛집 출발해요", distance: "230m", duration: "60분", likes: 0, comments: 0, timeAgo: "2일 전", authorNickname: "정겨운 단풍", authorLevel: 11, peopleCount: 3, location: { lat: 37.3646, lng: 127.1042, placeName: "어머니 김치찌개" } },

  // 공동구매 / 소분하기 (share) — +7
  { id: "sh11", category: "share", meetupType: "단기성 모임", status: "모집중", title: "딸기 한 박스 나눔", description: "농장 직배송 딸기 박스 나눠요", distance: "300m", duration: "20분", likes: 0, comments: 0, timeAgo: "1시간 전", authorNickname: "노래하는 햇살", authorLevel: 13, peopleCount: 4, location: { lat: 37.3677, lng: 127.1075, placeName: "도깨비 식자재마트" } },
  { id: "sh12", category: "share", meetupType: "단기성 모임", status: "모집중", title: "휴지 대용량", description: "코스트코 휴지 대용량 나눌 분", distance: "700m", duration: "60분", likes: 0, comments: 0, timeAgo: "2시간 전", authorNickname: "씩씩한 사슴", authorLevel: 15, peopleCount: 3, location: { lat: 37.3814, lng: 127.113, placeName: "코스트코 분당점" } },
  { id: "sh13", category: "share", meetupType: "단기성 모임", status: "모집중", title: "참외 박스", description: "참외 한 박스 나누실 분~", distance: "260m", duration: "25분", likes: 12, comments: 12, timeAgo: "3시간 전", authorNickname: "산뜻한 봄", authorLevel: 14, peopleCount: 3, location: { lat: 37.3841, lng: 127.126, placeName: "정자동 농수산물직판장" } },
  { id: "sh14", category: "share", meetupType: "단기성 모임", status: "모집중", title: "쌀 20kg 분할", description: "쌀 5kg씩 나누실 분 구해요", distance: "190m", duration: "15분", likes: 3, comments: 0, timeAgo: "5시간 전", authorNickname: "글쓰는 부엉이", authorLevel: 17, peopleCount: 4, location: { lat: 37.3859, lng: 127.1251, placeName: "정자동 미곡상" } },
  { id: "sh15", category: "share", meetupType: "단기성 모임", status: "모집중", title: "샴푸 박스", description: "코스트코 샴푸 박스 나눠요", distance: "700m", duration: "60분", likes: 2, comments: 0, timeAgo: "1일 전", authorNickname: "다정한 별빛", authorLevel: 22, peopleCount: 3, location: { lat: 37.3926, lng: 127.1387, placeName: "코스트코 분당점" } },
  { id: "sh16", category: "share", meetupType: "단기성 모임", status: "모집완료", title: "한라봉 박스", description: "제주산 한라봉 5kg 박스 나눠요", distance: "320m", duration: "25분", likes: 3, comments: 0, timeAgo: "2일 전", authorNickname: "다정한 토끼", authorLevel: 9, peopleCount: 4, location: { lat: 37.4092, lng: 127.1277, placeName: "정자동 청과상" } },
  { id: "sh17", category: "share", meetupType: "단기성 모임", status: "모집중", title: "세제 대용량", description: "세제 대용량 같이 사실 분", distance: "450m", duration: "40분", likes: 0, comments: 0, timeAgo: "3일 전", authorNickname: "그림그리는 곰", authorLevel: 20, peopleCount: 3, location: { lat: 37.4148, lng: 127.1304, placeName: "이마트 정자점" } },

  // 같이 운동해요 (sport) — +6
  { id: "sp11", category: "sport", meetupType: "장기성 모임", status: "모집중", title: "테니스 메이트", description: "주말 아침 테니스 같이 쳐요", distance: "320m", duration: "90분", likes: 2, comments: 1, timeAgo: "1시간 전", authorNickname: "산책하는 강아지", authorLevel: 18, peopleCount: 4, location: { lat: 37.3951, lng: 127.1126, placeName: "정자 테니스장" } },
  { id: "sp12", category: "sport", meetupType: "장기성 모임", status: "모집중", title: "주말 풋살", description: "토요일 풋살 같이 차요", distance: "600m", duration: "120분", likes: 33, comments: 10, timeAgo: "2시간 전", authorNickname: "용감한 곰", authorLevel: 18, peopleCount: 10, location: { lat: 37.4026, lng: 127.1097, placeName: "분당 풋살파크" } },
  { id: "sp13", category: "sport", meetupType: "장기성 모임", status: "모집중", title: "필라테스 메이트", description: "주 2회 필라테스 같이 갈 분", distance: "250m", duration: "60분", likes: 7, comments: 0, timeAgo: "3시간 전", authorNickname: "반짝이는 별", authorLevel: 15, peopleCount: 3, location: { lat: 37.3963, lng: 127.105, placeName: "더 핏 필라테스" } },
  { id: "sp14", category: "sport", meetupType: "장기성 모임", status: "모집중", title: "새벽 수영", description: "새벽 수영 메이트 구해요", distance: "350m", duration: "60분", likes: 0, comments: 0, timeAgo: "5시간 전", authorNickname: "재밌는 너구리", authorLevel: 19, peopleCount: 2, location: { lat: 37.3841, lng: 127.0876, placeName: "분당 스포츠센터" } },
  { id: "sp15", category: "sport", meetupType: "장기성 모임", status: "모집중", title: "탁구 한판", description: "동네 탁구장 같이 가실 분", distance: "180m", duration: "75분", likes: 2, comments: 0, timeAgo: "1일 전", authorNickname: "씩씩한 늑대", authorLevel: 9, peopleCount: 4, location: { lat: 37.3988, lng: 127.1167, placeName: "정자 탁구장" } },
  { id: "sp16", category: "sport", meetupType: "장기성 모임", status: "모집중", title: "자전거 라이딩", description: "한강 라이딩 같이 가요", distance: "400m", duration: "180분", likes: 0, comments: 0, timeAgo: "2일 전", authorNickname: "빛나는 해바라기", authorLevel: 21, peopleCount: 8, location: { lat: 37.3777, lng: 127.1279, placeName: "탄천 자전거도로" } },

  // 도와주세요! (help) — +7
  { id: "hp11", category: "help", meetupType: "단기성 모임", status: "모집중", title: "택배 받아주실 분", description: "오후 시간대 택배 대신 받아주세요", distance: "100m", duration: "10분", likes: 0, comments: 2, timeAgo: "20분 전", authorNickname: "치즈복이", authorLevel: 8, peopleCount: 1, location: { lat: 37.3944, lng: 127.1345, placeName: "정자동 우편함 앞" } },
  { id: "hp12", category: "help", meetupType: "단기성 모임", status: "모집중", title: "강아지 산책 부탁", description: "오늘 저녁 산책 대신 부탁드려요", distance: "200m", duration: "30분", likes: 3, comments: 7, timeAgo: "1시간 전", authorNickname: "새콤한 토마토", authorLevel: 13, peopleCount: 1, location: { lat: 37.3665, lng: 127.1113, placeName: "정자일로 공원" } },
  { id: "hp13", category: "help", meetupType: "단기성 모임", status: "모집중", title: "노트북 추천 부탁", description: "100만원대 노트북 추천 부탁드려요", distance: "150m", duration: "20분", likes: 21, comments: 1, timeAgo: "3시간 전", authorNickname: "고소한 호빵", authorLevel: 7, peopleCount: 2, location: { lat: 37.3777, lng: 127.1155, placeName: "정자동 전자상가" } },
  { id: "hp15", category: "help", meetupType: "단기성 모임", status: "모집중", title: "잃어버린 지갑", description: "정자동 카페 근처에서 지갑 잃어버렸어요", distance: "300m", duration: "30분", likes: 0, comments: 2, timeAgo: "1일 전", authorNickname: "쫄깃한 라면", authorLevel: 10, peopleCount: 1, location: { lat: 37.3505, lng: 127.1113, placeName: "투썸플레이스" } },
  { id: "hp16", category: "help", meetupType: "단기성 모임", status: "모집중", title: "고양이 임시 보호", description: "주말 동안 고양이 봐주실 분", distance: "150m", duration: "60분", likes: 3, comments: 26, timeAgo: "2일 전", authorNickname: "달콤한 수박", authorLevel: 12, peopleCount: 1, location: { lat: 37.3452, lng: 127.1083, placeName: "정자동 아파트" } },
  { id: "hp17", category: "help", meetupType: "단기성 모임", status: "모집중", title: "정형외과 추천", description: "근처 정형외과 추천해 주세요", distance: "0m", duration: "0분", likes: 1, comments: 0, timeAgo: "3일 전", authorNickname: "촉촉한 푸딩", authorLevel: 11, peopleCount: 1, location: { lat: 37.37, lng: 127.1056, placeName: "정자동 메디컬센터" } },

  // 게임파티 (game) — +7
  { id: "gm11", category: "game", meetupType: "장기성 모임", status: "모집중", title: "롤 듀오 구해요", description: "골드 듀오 파트너 모집", distance: "100m", duration: "120분", likes: 0, comments: 2, timeAgo: "30분 전", authorNickname: "씩씩한 당근", authorLevel: 17, peopleCount: 2, location: { lat: 37.3644, lng: 127.1056, placeName: "PC방 미금역점" } },
  { id: "gm12", category: "game", meetupType: "장기성 모임", status: "모집중", title: "마인크래프트 서버", description: "같이 서버 운영하실 분 찾아요", distance: "0m", duration: "0분", likes: 0, comments: 0, timeAgo: "1시간 전", authorNickname: "재밌는 너구리", authorLevel: 19, peopleCount: 6, location: { lat: 37.3799, lng: 127.1155, placeName: "온라인" } },
  { id: "gm13", category: "game", meetupType: "장기성 모임", status: "모집중", title: "스팀 협동게임", description: "협동 무료게임 같이 해요", distance: "0m", duration: "0분", likes: 22, comments: 0, timeAgo: "2시간 전", authorNickname: "산책하는 강아지", authorLevel: 18, peopleCount: 4, location: { lat: 37.3873, lng: 127.1229, placeName: "온라인" } },
  { id: "gm14", category: "game", meetupType: "장기성 모임", status: "모집중", title: "보드게임 카페", description: "보드게임 카페 같이 가실 분", distance: "650m", duration: "120분", likes: 3, comments: 0, timeAgo: "3시간 전", authorNickname: "다정한 토끼", authorLevel: 9, peopleCount: 6, location: { lat: 37.3824, lng: 127.1237, placeName: "보드앤플레이 보드게임카페" } },
  { id: "gm15", category: "game", meetupType: "장기성 모임", status: "모집중", title: "철권 매칭 메이트", description: "오프라인 격투게임 메이트 구해요", distance: "180m", duration: "150분", likes: 0, comments: 0, timeAgo: "5시간 전", authorNickname: "그림그리는 곰", authorLevel: 20, peopleCount: 4, location: { lat: 37.3976, lng: 127.1375, placeName: "정자 PC방" } },
  { id: "gm16", category: "game", meetupType: "장기성 모임", status: "모집중", title: "방탈출 카페", description: "어려운 방탈출 도전 같이!", distance: "400m", duration: "90분", likes: 1, comments: 0, timeAgo: "1일 전", authorNickname: "정겨운 단풍", authorLevel: 11, peopleCount: 4, location: { lat: 37.414, lng: 127.1306, placeName: "이스케이프 룸 정자점" } },
  { id: "gm17", category: "game", meetupType: "장기성 모임", status: "모집완료", title: "포커 친목", description: "친목 포커 같이 하실 분", distance: "220m", duration: "180분", likes: 0, comments: 0, timeAgo: "2일 전", authorNickname: "신나는 펭귄", authorLevel: 10, peopleCount: 6, location: { lat: 37.409, lng: 127.1309, placeName: "정자동 카페" } },

  // 드라마 · 영화 (media) — +9
  { id: "md11", category: "media", meetupType: "장기성 모임", status: "모집중", title: "오징어 게임 시즌2", description: "넷플릭스 동시 시청해요!", distance: "0m", duration: "0분", likes: 0, comments: 0, timeAgo: "20분 전", authorNickname: "새콤한 망고", authorLevel: 18, peopleCount: 6, location: { lat: 37.3959, lng: 127.1117, placeName: "온라인 / 분당 정자동" } },
  { id: "md12", category: "media", meetupType: "장기성 모임", status: "모집중", title: "어벤져스 정주행", description: "마블 시리즈 정주행 메이트", distance: "150m", duration: "240분", likes: 0, comments: 0, timeAgo: "1시간 전", authorNickname: "발랄한 코스모스", authorLevel: 19, peopleCount: 4, location: { lat: 37.3991, lng: 127.1088, placeName: "분당 정자동" } },
  { id: "md13", category: "media", meetupType: "장기성 모임", status: "모집중", title: "주말 신작 영화", description: "주말 신작 영화 같이 봐요", distance: "550m", duration: "150분", likes: 0, comments: 0, timeAgo: "2시간 전", authorNickname: "산뜻한 봄", authorLevel: 14, peopleCount: 4, location: { lat: 37.3956, lng: 127.1074, placeName: "CGV 분당" } },
  { id: "md14", category: "media", meetupType: "장기성 모임", status: "모집중", title: "공포영화 메이트", description: "혼자 보기 무서운 공포영화 같이!", distance: "200m", duration: "120분", likes: 0, comments: 5, timeAgo: "3시간 전", authorNickname: "글쓰는 부엉이", authorLevel: 17, peopleCount: 4, location: { lat: 37.3849, lng: 127.0917, placeName: "분당 정자동" } },
  { id: "md15", category: "media", meetupType: "장기성 모임", status: "모집중", title: "디즈니플러스 공유", description: "디플 같이 결제할 분 (3인)", distance: "0m", duration: "0분", likes: 25, comments: 0, timeAgo: "5시간 전", authorNickname: "반짝이는 별", authorLevel: 15, peopleCount: 3, location: { lat: 37.4028, lng: 127.1126, placeName: "온라인" } },
  { id: "md16", category: "media", meetupType: "장기성 모임", status: "모집중", title: "독립영화 상영회", description: "독립영화 상영회 같이 가요", distance: "700m", duration: "180분", likes: 1, comments: 0, timeAgo: "6시간 전", authorNickname: "사랑스러운 백합", authorLevel: 16, peopleCount: 5, location: { lat: 37.3754, lng: 127.1271, placeName: "분당 아트홀" } },
  { id: "md17", category: "media", meetupType: "장기성 모임", status: "모집중", title: "고전영화 모임", description: "흑백영화 함께 보는 모임", distance: "250m", duration: "150분", likes: 2, comments: 0, timeAgo: "1일 전", authorNickname: "씩씩한 늑대", authorLevel: 9, peopleCount: 4, location: { lat: 37.396, lng: 127.1373, placeName: "정자동 카페" } },
  { id: "md18", category: "media", meetupType: "장기성 모임", status: "모집중", title: "리뷰 클럽", description: "본 영화 리뷰 같이 쓰는 모임", distance: "300m", duration: "90분", likes: 9, comments: 0, timeAgo: "2일 전", authorNickname: "책읽는 알파카", authorLevel: 23, peopleCount: 4, location: { lat: 37.3628, lng: 127.1123, placeName: "정자동 스터디카페" } },
  { id: "md19", category: "media", meetupType: "장기성 모임", status: "모집완료", title: "다큐멘터리 토론", description: "다큐 보고 같이 토론해요", distance: "400m", duration: "120분", likes: 0, comments: 0, timeAgo: "3일 전", authorNickname: "빛나는 해바라기", authorLevel: 21, peopleCount: 6, location: { lat: 37.3798, lng: 127.1149, placeName: "정자도서관" } },

  // 자유게시판 (free) — +7
  { id: "f11", category: "free", meetupType: "단기성 모임", status: "모집중", title: "동네 분리수거 시간", description: "분리수거 시간 아시는 분?", distance: "0m", duration: "0분", likes: 0, comments: 7, timeAgo: "10분 전", authorNickname: "달콤한 복숭아", authorLevel: 15 },
  { id: "f12", category: "free", meetupType: "단기성 모임", status: "모집중", title: "공원 야간 개방", description: "정자동 공원 야간 개방 시간 아시는 분", distance: "0m", duration: "0분", likes: 0, comments: 0, timeAgo: "25분 전", authorNickname: "쫄깃한 단무지", authorLevel: 11 },
  { id: "f13", category: "free", meetupType: "단기성 모임", status: "모집중", title: "오늘 비 오나요?", description: "외출하려는데 비 올까봐요..", distance: "0m", duration: "0분", likes: 2, comments: 0, timeAgo: "1시간 전", authorNickname: "매콤한 떡볶이", authorLevel: 7 },
  { id: "f15", category: "free", meetupType: "단기성 모임", status: "모집중", title: "층간소음 고민", description: "어떻게 해결하셨나요?", distance: "0m", duration: "0분", likes: 2, comments: 0, timeAgo: "3시간 전", authorNickname: "포근한 두부", authorLevel: 8 },
  { id: "f16", category: "free", meetupType: "단기성 모임", status: "모집중", title: "이사 떡 인사", description: "옆집 이사오시면 떡 돌리시나요?", distance: "0m", duration: "0분", likes: 7, comments: 0, timeAgo: "1일 전", authorNickname: "정겨운 김밥", authorLevel: 13 },
  { id: "f17", category: "free", meetupType: "단기성 모임", status: "모집중", title: "도서관 추천", description: "정자도서관 vs 야탑도서관?", distance: "0m", duration: "0분", likes: 0, comments: 0, timeAgo: "2일 전", authorNickname: "바삭한 감자", authorLevel: 9 },

  // 추천해요 (recommend) — +8
  { id: "r13", category: "recommend", meetupType: "단기성 모임", status: "모집중", title: "드라마 추천", description: "최근 본 드라마 중 갓작이에요", distance: "0m", duration: "0분", likes: 30, comments: 0, timeAgo: "1시간 전", authorNickname: "새콤한 망고", authorLevel: 18 },
  { id: "r14", category: "recommend", meetupType: "단기성 모임", status: "모집중", title: "운동복 브랜드", description: "기능 좋은 운동복 브랜드 공유해요", distance: "0m", duration: "0분", likes: 0, comments: 0, timeAgo: "2시간 전", authorNickname: "용감한 곰", authorLevel: 18 },
  { id: "r15", category: "recommend", meetupType: "단기성 모임", status: "모집중", title: "정자동 미용실", description: "친절한 디자이너 있는 곳 추천", distance: "0m", duration: "0분", likes: 0, comments: 0, timeAgo: "3시간 전", authorNickname: "노래하는 햇살", authorLevel: 13 },
  { id: "r17", category: "recommend", meetupType: "단기성 모임", status: "모집중", title: "주말 나들이", description: "차 없이 가기 좋은 나들이 장소", distance: "0m", duration: "0분", likes: 0, comments: 1, timeAgo: "1일 전", authorNickname: "사진찍는 사슴", authorLevel: 10 },
];

// 자동 생성된 mock 500개 (자유70/추천30/위치별400) — bulk-posts.ts 참조.
// 모듈 로드 시점에 한 번만 push 되어 게시판/지도/홈에서 자연스럽게 노출.
POSTS.push(...BULK_POSTS);

// 게시글 ID 별로 보여줄 댓글 (board-detail 화면에서 사용)
export const POST_COMMENTS: Record<string, { id: string; nickname: string; content: string; timeAgo: string }[]> = {
  f1: [
    { id: "f1c1", nickname: "매콤한 떡볶이", content: "OO분식집이 가깝고 좋아요.", timeAgo: "1분 전" },
    { id: "f1c2", nickname: "포근한 두부", content: "조금 더 걸어가서 있는 ㅁㅁ분식집도 괜찮아요!", timeAgo: "5분 전" },
    { id: "f1c3", nickname: "달콤한 복숭아", content: "버스타고 나가야 하긴 하는데 ㅎㅎ떡볶이 집도 맛있었어요.", timeAgo: "7분 전" },
  ],
  f2: [
    { id: "f2c1", nickname: "보송보송한 햄찌", content: "저도요! 같이 놀러가요!", timeAgo: "2분 전" },
    { id: "f2c2", nickname: "고소한 감자", content: "주말에 시간 비어요 :)", timeAgo: "8분 전" },
  ],
  f3: [
    { id: "f3c1", nickname: "달콤한 복숭아", content: "OO카페 추천드려요. 콘센트도 많아요!", timeAgo: "3분 전" },
  ],
  "2": [
    { id: "2c1", nickname: "보송보송한 햄찌", content: "저요! 한 조각만 주세요~", timeAgo: "1분 전" },
    { id: "2c2", nickname: "매콤한 떡볶이", content: "위치 어디세요?", timeAgo: "4분 전" },
  ],
  r1: [
    { id: "r1c1", nickname: "포근한 두부", content: "제목 알려주세요!", timeAgo: "2분 전" },
    { id: "r1c2", nickname: "달콤한 복숭아", content: "방금 봤는데 진짜 재밌어요!", timeAgo: "12분 전" },
  ],
  r2: [
    { id: "r2c1", nickname: "매콤한 떡볶이", content: "위치 좀 부탁드려요~", timeAgo: "8분 전" },
  ],
  g1: [
    { id: "g1c1", nickname: "새콤한 망고", content: "보드게임 카페 어디로 가시나요?", timeAgo: "5분 전" },
    { id: "g1c2", nickname: "고소한 감자", content: "토요일 가능합니다!", timeAgo: "15분 전" },
  ],
  g2: [
    { id: "g2c1", nickname: "보송보송한 햄찌", content: "이미 마감됐나요? ㅠㅠ", timeAgo: "20분 전" },
  ],
  "3": [
    { id: "3c1", nickname: "포근한 두부", content: "저도 강아지 산책 같이 가고 싶어요!", timeAgo: "10분 전" },
  ],
  "4": [
    { id: "4c1", nickname: "고소한 감자", content: "어느 헬스장이세요?", timeAgo: "12분 전" },
  ],
  m1: [
    { id: "m1c1", nickname: "달콤한 복숭아", content: "요즘 OOO 정주행 중인데 같이 봐요!", timeAgo: "20분 전" },
  ],
  "1": [
    { id: "1c1", nickname: "보송보송한 햄찌", content: "저요! 저요!", timeAgo: "1분 전" },
    { id: "1c2", nickname: "매콤한 떡볶이", content: "오! 떡볶이 정말 좋아해요", timeAgo: "5분 전" },
    { id: "1c3", nickname: "새콤한 망고", content: "떡볶이 가게 이름이 뭐에요?", timeAgo: "7분 전" },
  ],
  h1: [
    { id: "h1c1", nickname: "매콤한 떡볶이", content: "몇 시까지 도와드리면 될까요?", timeAgo: "3분 전" },
  ],
  hm3: [
    { id: "hm3c1", nickname: "고소한 감자", content: "어느 편의점이세요?", timeAgo: "2분 전" },
    { id: "hm3c2", nickname: "보송보송한 햄찌", content: "야식 같이 먹어요! 합류 가능?", timeAgo: "5분 전" },
    { id: "hm3c3", nickname: "포근한 두부", content: "라면도 같이 시키실래요?", timeAgo: "8분 전" },
  ],
  hm4: [
    { id: "hm4c1", nickname: "달콤한 복숭아", content: "휴지 같이 나누실 분 구해요!", timeAgo: "3분 전" },
    { id: "hm4c2", nickname: "매콤한 떡볶이", content: "참여하고 싶어요. 몇 시 출발인가요?", timeAgo: "10분 전" },
  ],
  hm5: [
    { id: "hm5c1", nickname: "노래하는 햇살", content: "페이스 얼마쯤 되세요?", timeAgo: "4분 전" },
    { id: "hm5c2", nickname: "새콤한 망고", content: "저녁 7시 출발 좋아요!", timeAgo: "12분 전" },
    { id: "hm5c3", nickname: "고소한 감자", content: "어디서 모이나요?", timeAgo: "15분 전" },
  ],
  hm6: [
    { id: "hm6c1", nickname: "포근한 두부", content: "조용한 자리 있나요?", timeAgo: "6분 전" },
    { id: "hm6c2", nickname: "달콤한 복숭아", content: "콘센트도 있는 곳이면 좋겠어요!", timeAgo: "20분 전" },
  ],
  hm7: [
    { id: "hm7c1", nickname: "새콤한 망고", content: "할리갈리 진짜 좋아해요!", timeAgo: "5분 전" },
    { id: "hm7c2", nickname: "고소한 감자", content: "주말 저녁 가능합니다.", timeAgo: "18분 전" },
    { id: "hm7c3", nickname: "보송보송한 햄찌", content: "보드게임 카페 추천 부탁드려요.", timeAgo: "25분 전" },
  ],
  hm8: [
    { id: "hm8c1", nickname: "노래하는 햇살", content: "신상 카페 어디인가요?", timeAgo: "10분 전" },
    { id: "hm8c2", nickname: "매콤한 떡볶이", content: "저도 같이 가고 싶어요!", timeAgo: "30분 전" },
  ],
  hm9: [
    { id: "hm9c1", nickname: "포근한 두부", content: "어느 공원이세요?", timeAgo: "3분 전" },
    { id: "hm9c2", nickname: "고소한 감자", content: "강아지 동반 가능한가요?", timeAgo: "9분 전" },
  ],
  hm10: [
    { id: "hm10c1", nickname: "달콤한 복숭아", content: "어떤 책 읽나요?", timeAgo: "8분 전" },
    { id: "hm10c2", nickname: "새콤한 망고", content: "독서 모임 처음인데 환영해주세요 :)", timeAgo: "22분 전" },
  ],

  // ── 맛집 & 먹거리 (food) ─────────────────────────────────
  fd11: [
    { id: "fd11c1", nickname: "고소한 감자", content: "저 마라탕 진짜 좋아해요! 몇 시 출발이세요?", timeAgo: "3분 전" },
    { id: "fd11c2", nickname: "매콤한 만두", content: "탕화쿵푸 메뉴 추천 부탁드려요~", timeAgo: "10분 전" },
  ],
  fd12: [
    { id: "fd12c1", nickname: "쫄깃한 라면", content: "양념 반 후라이드 반 어때요?", timeAgo: "12분 전" },
  ],
  fd13: [
    { id: "fd13c1", nickname: "사랑스러운 백합", content: "라이크라이크 브런치 진짜 맛있어요!", timeAgo: "5분 전" },
    { id: "fd13c2", nickname: "발랄한 코스모스", content: "주말 몇 시쯤 가실 거예요?", timeAgo: "20분 전" },
    { id: "fd13c3", nickname: "달콤한 복숭아", content: "에그베네딕트 꼭 드세요 :)", timeAgo: "1시간 전" },
  ],
  fd14: [
    { id: "fd14c1", nickname: "씩씩한 사슴", content: "퇴근 시간 맞으면 합류하고 싶어요!", timeAgo: "15분 전" },
    { id: "fd14c2", nickname: "산책하는 강아지", content: "고기굽는집 단골이라 추천드려요 ㅎㅎ", timeAgo: "45분 전" },
  ],
  fd15: [
    { id: "fd15c1", nickname: "발랄한 코스모스", content: "스시노믹 점심 특선 있어요?", timeAgo: "10분 전" },
    { id: "fd15c2", nickname: "매콤한 떡볶이", content: "초밥 메이트 구해요! 같이 가요", timeAgo: "30분 전" },
    { id: "fd15c3", nickname: "새콤한 토마토", content: "런치 코스 가성비 좋더라구요", timeAgo: "2시간 전" },
    { id: "fd15c4", nickname: "정겨운 단풍", content: "예약 필요해요?", timeAgo: "5시간 전" },
  ],
  fd16: [
    { id: "fd16c1", nickname: "포근한 두부", content: "아쉽... 다음 번에 또 모집해주세요!", timeAgo: "1시간 전" },
    { id: "fd16c2", nickname: "정겨운 단풍", content: "어머니 김치찌개 진짜 잘 끓이세요", timeAgo: "1일 전" },
  ],

  // ── 공동구매 / 소분하기 (share) ──────────────────────────
  sh11: [
    { id: "sh11c1", nickname: "노래하는 햇살", content: "딸기 1kg 정도 원하면 가능할까요?", timeAgo: "10분 전" },
    { id: "sh11c2", nickname: "달콤한 수박", content: "농장 직배송이라니 기대돼요!", timeAgo: "30분 전" },
    { id: "sh11c3", nickname: "사진찍는 사슴", content: "픽업 시간 알려주세요~", timeAgo: "50분 전" },
  ],
  sh12: [
    { id: "sh12c1", nickname: "씩씩한 사슴", content: "30롤짜리 몇 패키지 사실 거예요?", timeAgo: "20분 전" },
  ],
  sh13: [
    { id: "sh13c1", nickname: "산뜻한 봄", content: "참외 박스 크기가 어느 정도예요?", timeAgo: "30분 전" },
    { id: "sh13c2", nickname: "달콤한 복숭아", content: "한 두 개씩 나눌 수 있나요?", timeAgo: "2시간 전" },
  ],
  sh14: [
    { id: "sh14c1", nickname: "글쓰는 부엉이", content: "햅쌀 맞나요? 받으러 갈 시간 알려주세요!", timeAgo: "1시간 전" },
  ],
  sh15: [
    { id: "sh15c1", nickname: "다정한 별빛", content: "어떤 샴푸인가요? 향이 어때요?", timeAgo: "30분 전" },
    { id: "sh15c2", nickname: "반짝이는 별", content: "1통씩 나눠 받을 수 있나요?", timeAgo: "3시간 전" },
  ],
  sh16: [
    { id: "sh16c1", nickname: "다정한 토끼", content: "마감됐다니 아쉬워요 ㅠㅠ", timeAgo: "1일 전" },
    { id: "sh16c2", nickname: "노래하는 햇살", content: "다음에 또 모집하시면 알려주세요!", timeAgo: "1일 전" },
    { id: "sh16c3", nickname: "달콤한 수박", content: "한라봉 진짜 달죠~", timeAgo: "2일 전" },
    { id: "sh16c4", nickname: "사랑스러운 백합", content: "잘 받았어요. 감사합니다 :)", timeAgo: "2일 전" },
  ],
  sh17: [
    { id: "sh17c1", nickname: "그림그리는 곰", content: "이마트 이번 주 세일이라 좋네요!", timeAgo: "3일 전" },
  ],

  // ── 같이 운동해요 (sport) ────────────────────────────────
  sp11: [
    { id: "sp11c1", nickname: "산책하는 강아지", content: "초보도 가능할까요?", timeAgo: "20분 전" },
    { id: "sp11c2", nickname: "용감한 곰", content: "라켓 빌려주실 수 있어요?", timeAgo: "50분 전" },
  ],
  sp12: [
    { id: "sp12c1", nickname: "용감한 곰", content: "포지션은 미드필더 가능해요!", timeAgo: "15분 전" },
    { id: "sp12c2", nickname: "고소한 감자", content: "유니폼 색상 정해졌나요?", timeAgo: "40분 전" },
    { id: "sp12c3", nickname: "빛나는 해바라기", content: "풋살화 신어야 하나요?", timeAgo: "1시간 전" },
    { id: "sp12c4", nickname: "씩씩한 당근", content: "참가비는 얼마예요?", timeAgo: "1시간 전" },
    { id: "sp12c5", nickname: "그림그리는 곰", content: "10명 채우면 바로 시작인가요?", timeAgo: "2시간 전" },
  ],
  sp13: [
    { id: "sp13c1", nickname: "반짝이는 별", content: "더 핏 필라테스 시설 좋아요!", timeAgo: "1시간 전" },
  ],
  sp14: [
    { id: "sp14c1", nickname: "재밌는 너구리", content: "새벽 6시 가능하시면 같이 다녀요!", timeAgo: "3시간 전" },
  ],
  sp15: [
    { id: "sp15c1", nickname: "씩씩한 늑대", content: "탁구장 라켓 대여되나요?", timeAgo: "5시간 전" },
    { id: "sp15c2", nickname: "신나는 펭귄", content: "초보인데 같이 쳐도 괜찮을까요?", timeAgo: "1일 전" },
  ],
  sp16: [
    { id: "sp16c1", nickname: "빛나는 해바라기", content: "출발 시간 알려주세요!", timeAgo: "3시간 전" },
    { id: "sp16c2", nickname: "산책하는 강아지", content: "코스 어디까지 가실 거예요?", timeAgo: "5시간 전" },
    { id: "sp16c3", nickname: "용감한 곰", content: "헬멧 필수죠? 챙겨갈게요", timeAgo: "10시간 전" },
    { id: "sp16c4", nickname: "글쓰는 부엉이", content: "비 오면 취소인가요?", timeAgo: "1일 전" },
    { id: "sp16c5", nickname: "씩씩한 당근", content: "라이딩 페이스 어느 정도예요?", timeAgo: "1일 전" },
    { id: "sp16c6", nickname: "고소한 감자", content: "탄천 자전거도로 진짜 좋아요!", timeAgo: "2일 전" },
  ],

  // ── 도와주세요! (help) ───────────────────────────────────
  hp11: [
    { id: "hp11c1", nickname: "매콤한 만두", content: "오늘 집에 있어서 받아드릴 수 있어요!", timeAgo: "10분 전" },
  ],
  hp12: [
    { id: "hp12c1", nickname: "새콤한 토마토", content: "강아지 종이랑 산책 코스 알려주세요!", timeAgo: "30분 전" },
    { id: "hp12c2", nickname: "달콤한 수박", content: "저녁 시간대 가능합니다 :)", timeAgo: "55분 전" },
  ],
  hp13: [
    { id: "hp13c1", nickname: "고소한 호빵", content: "어떤 작업 위주로 쓰시나요?", timeAgo: "1시간 전" },
    { id: "hp13c2", nickname: "재밌는 너구리", content: "그램 16인치 가성비 좋아요", timeAgo: "2시간 전" },
    { id: "hp13c3", nickname: "그림그리는 곰", content: "맥북에어 M3 추천드려요!", timeAgo: "2시간 전" },
  ],
  hp15: [
    { id: "hp15c1", nickname: "쫄깃한 라면", content: "지갑 색깔이랑 브랜드 알려주세요", timeAgo: "10시간 전" },
    { id: "hp15c2", nickname: "달콤한 복숭아", content: "투썸 카운터에 분실물 있어요. 한번 가보세요!", timeAgo: "12시간 전" },
    { id: "hp15c3", nickname: "매콤한 떡볶이", content: "꼭 찾으셨으면 좋겠어요 ㅠㅠ", timeAgo: "20시간 전" },
    { id: "hp15c4", nickname: "포근한 두부", content: "분실물 카페에도 한번 올려보세요", timeAgo: "1일 전" },
  ],
  hp16: [
    { id: "hp16c1", nickname: "달콤한 수박", content: "고양이 몇 살이고 사료 종류 알려주세요!", timeAgo: "1일 전" },
    { id: "hp16c2", nickname: "매콤한 만두", content: "주말 비어요. 메시지 드려도 될까요?", timeAgo: "2일 전" },
  ],
  hp17: [
    { id: "hp17c1", nickname: "촉촉한 푸딩", content: "메디컬센터 2층 정형외과 친절했어요!", timeAgo: "1일 전" },
    { id: "hp17c2", nickname: "발랄한 코스모스", content: "예약하고 가시면 빨라요", timeAgo: "2일 전" },
  ],

  // ── 게임파티 (game) ──────────────────────────────────────
  gm11: [
    { id: "gm11c1", nickname: "씩씩한 당근", content: "골드 1~2 라인 어디 선호하세요?", timeAgo: "10분 전" },
    { id: "gm11c2", nickname: "고소한 감자", content: "보이스 가능한가요?", timeAgo: "20분 전" },
    { id: "gm11c3", nickname: "재밌는 너구리", content: "저녁에 몇 시쯤 시작해요?", timeAgo: "25분 전" },
  ],
  gm12: [
    { id: "gm12c1", nickname: "재밌는 너구리", content: "버전이랑 모드팩 어떤 거 쓰세요?", timeAgo: "30분 전" },
  ],
  gm13: [
    { id: "gm13c1", nickname: "산책하는 강아지", content: "오버쿡드 같이 하실래요?", timeAgo: "1시간 전" },
    { id: "gm13c2", nickname: "그림그리는 곰", content: "무료게임 추천 받습니다!", timeAgo: "2시간 전" },
  ],
  gm14: [
    { id: "gm14c1", nickname: "다정한 토끼", content: "보드앤플레이 신작 많아요!", timeAgo: "1시간 전" },
    { id: "gm14c2", nickname: "정겨운 단풍", content: "초보도 환영인가요?", timeAgo: "2시간 전" },
    { id: "gm14c3", nickname: "신나는 펭귄", content: "토요일 저녁 가능합니다 :)", timeAgo: "3시간 전" },
  ],
  gm15: [
    { id: "gm15c1", nickname: "그림그리는 곰", content: "캐릭터 풀 누구 쓰세요?", timeAgo: "3시간 전" },
  ],
  gm16: [
    { id: "gm16c1", nickname: "정겨운 단풍", content: "난이도 어느 정도예요?", timeAgo: "1시간 전" },
    { id: "gm16c2", nickname: "사랑스러운 백합", content: "어려운 거 환영! 같이 가요", timeAgo: "5시간 전" },
    { id: "gm16c3", nickname: "반짝이는 별", content: "이스케이프 룸 정자점 후기 좋더라구요", timeAgo: "1일 전" },
    { id: "gm16c4", nickname: "발랄한 코스모스", content: "4명 채우면 바로 예약하나요?", timeAgo: "1일 전" },
  ],
  gm17: [
    { id: "gm17c1", nickname: "신나는 펭귄", content: "마감됐네요 ㅠ 다음에 또 모집해주세요!", timeAgo: "1일 전" },
    { id: "gm17c2", nickname: "노래하는 햇살", content: "친목 포커 재밌었어요 :)", timeAgo: "2일 전" },
  ],

  // ── 드라마 · 영화 (media) ────────────────────────────────
  md11: [
    { id: "md11c1", nickname: "새콤한 망고", content: "디스코드 채널 만들까요?", timeAgo: "10분 전" },
    { id: "md11c2", nickname: "발랄한 코스모스", content: "시즌1 정주행하고 갈게요!", timeAgo: "15분 전" },
    { id: "md11c3", nickname: "산뜻한 봄", content: "스포 금지 룰 정해요!!", timeAgo: "20분 전" },
    { id: "md11c4", nickname: "포근한 두부", content: "공개 첫날 같이 봐요 :)", timeAgo: "30분 전" },
  ],
  md12: [
    { id: "md12c1", nickname: "발랄한 코스모스", content: "아이언맨1부터 순서대로 가는 거죠?", timeAgo: "30분 전" },
    { id: "md12c2", nickname: "글쓰는 부엉이", content: "엔드게임 다시 보면 또 울 듯..", timeAgo: "1시간 전" },
  ],
  md13: [
    { id: "md13c1", nickname: "산뜻한 봄", content: "어떤 영화 보실 예정이에요?", timeAgo: "1시간 전" },
    { id: "md13c2", nickname: "사랑스러운 백합", content: "CGV 분당 라운지관 추천!", timeAgo: "2시간 전" },
    { id: "md13c3", nickname: "다정한 토끼", content: "조조 가능하시면 같이 가요", timeAgo: "3시간 전" },
  ],
  md14: [
    { id: "md14c1", nickname: "글쓰는 부엉이", content: "심령류 vs 슬래셔 중 어느 쪽이에요?", timeAgo: "2시간 전" },
    { id: "md14c2", nickname: "용감한 곰", content: "콘저링 시리즈 정주행 어떠세요?", timeAgo: "3시간 전" },
  ],
  md15: [
    { id: "md15c1", nickname: "반짝이는 별", content: "3인이면 한 명당 얼마씩이에요?", timeAgo: "5시간 전" },
  ],
  md16: [
    { id: "md16c1", nickname: "사랑스러운 백합", content: "분당 아트홀 상영작 라인업 좋더라구요", timeAgo: "5시간 전" },
    { id: "md16c2", nickname: "책읽는 알파카", content: "예매 도와드릴까요?", timeAgo: "6시간 전" },
  ],
  md17: [
    { id: "md17c1", nickname: "씩씩한 늑대", content: "카사블랑카부터 시작해도 좋겠어요!", timeAgo: "1일 전" },
  ],
  md18: [
    { id: "md18c1", nickname: "책읽는 알파카", content: "리뷰 작성 가이드 있나요?", timeAgo: "2일 전" },
    { id: "md18c2", nickname: "사랑스러운 백합", content: "같이 글쓰면 더 재밌을 것 같아요 :)", timeAgo: "2일 전" },
  ],
  md19: [
    { id: "md19c1", nickname: "빛나는 해바라기", content: "어떤 다큐 보실 거예요?", timeAgo: "3일 전" },
    { id: "md19c2", nickname: "책읽는 알파카", content: "지구 시리즈 어떠세요?", timeAgo: "3일 전" },
    { id: "md19c3", nickname: "포근한 두부", content: "다음 모임도 알려주세요!", timeAgo: "3일 전" },
  ],

  // ── 자유게시판 (free) ────────────────────────────────────
  f11: [
    { id: "f11c1", nickname: "달콤한 복숭아", content: "저희 동은 일요일 저녁 8시예요", timeAgo: "5분 전" },
    { id: "f11c2", nickname: "쫄깃한 단무지", content: "동마다 다르니 관리실에 한번 물어보세요!", timeAgo: "20분 전" },
  ],
  f12: [
    { id: "f12c1", nickname: "쫄깃한 단무지", content: "정자일로 공원은 24시간 개방이에요!", timeAgo: "10분 전" },
  ],
  f13: [
    { id: "f13c1", nickname: "달콤한 복숭아", content: "기상청 보니까 오후 3시쯤부터 비 와요!", timeAgo: "10분 전" },
    { id: "f13c2", nickname: "포근한 두부", content: "우산 꼭 챙기세요 ☔", timeAgo: "25분 전" },
    { id: "f13c3", nickname: "고소한 감자", content: "지금은 안 오는데 흐려요. 곧 올 듯", timeAgo: "40분 전" },
  ],
  f15: [
    { id: "f15c1", nickname: "포근한 두부", content: "관리실에 먼저 전달 부탁드리는 게 제일 깔끔했어요", timeAgo: "30분 전" },
    { id: "f15c2", nickname: "달콤한 복숭아", content: "층간소음 슬리퍼 깔아두면 도움 돼요", timeAgo: "1시간 전" },
    { id: "f15c3", nickname: "매콤한 떡볶이", content: "직접 올라가지 마시고 무조건 관리실 통해서요", timeAgo: "2시간 전" },
    { id: "f15c4", nickname: "정겨운 김밥", content: "방음매트 + 매트 두께 좀 두꺼운 걸로 추천드려요", timeAgo: "2시간 전" },
    { id: "f15c5", nickname: "정겨운 단풍", content: "동주민센터 분쟁조정도 가능해요", timeAgo: "2시간 전" },
    { id: "f15c6", nickname: "새콤한 토마토", content: "녹음해두시는 것도 방법이에요", timeAgo: "3시간 전" },
  ],
  f16: [
    { id: "f16c1", nickname: "정겨운 김밥", content: "요즘은 떡 안 돌리시는 분도 많더라구요", timeAgo: "30분 전" },
    { id: "f16c2", nickname: "달콤한 복숭아", content: "저는 양 옆집만 간단히 인사드렸어요", timeAgo: "5시간 전" },
    { id: "f16c3", nickname: "포근한 두부", content: "받으면 기분은 좋더라구요 :)", timeAgo: "10시간 전" },
    { id: "f16c4", nickname: "매콤한 떡볶이", content: "마음만 받으셔도 충분할 것 같아요", timeAgo: "1일 전" },
  ],
  f17: [
    { id: "f17c1", nickname: "바삭한 감자", content: "공부 위주면 정자도서관 추천!", timeAgo: "1시간 전" },
    { id: "f17c2", nickname: "달콤한 복숭아", content: "야탑도서관이 신간 더 빨라요", timeAgo: "1일 전" },
    { id: "f17c3", nickname: "쫄깃한 단무지", content: "둘 다 좋은데 거리상 가까운 곳 추천!", timeAgo: "2일 전" },
  ],

  // ── 추천해요 (recommend) ─────────────────────────────────
  r13: [
    { id: "r13c1", nickname: "새콤한 망고", content: "제목이 뭐예요?? 궁금해요!", timeAgo: "20분 전" },
    { id: "r13c2", nickname: "발랄한 코스모스", content: "최근에 본 거 중에 진짜 갓작이었어요!", timeAgo: "30분 전" },
    { id: "r13c3", nickname: "산뜻한 봄", content: "주말에 정주행 각이네요", timeAgo: "40분 전" },
    { id: "r13c4", nickname: "달콤한 복숭아", content: "넷플릭스에 있나요?", timeAgo: "50분 전" },
    { id: "r13c5", nickname: "글쓰는 부엉이", content: "스포 살짝만 부탁드려요 ㅋㅋ", timeAgo: "1시간 전" },
  ],
  r14: [
    { id: "r14c1", nickname: "용감한 곰", content: "데상트 가성비 좋아요!", timeAgo: "30분 전" },
    { id: "r14c2", nickname: "산책하는 강아지", content: "룰루레몬 핏이 진짜 예뻐요", timeAgo: "1시간 전" },
    { id: "r14c3", nickname: "씩씩한 당근", content: "안다르 추천드립니다", timeAgo: "2시간 전" },
  ],
  r15: [
    { id: "r15c1", nickname: "노래하는 햇살", content: "정자역 1번 출구 쪽 '헤어로그' 진짜 잘하세요!", timeAgo: "30분 전" },
    { id: "r15c2", nickname: "다정한 별빛", content: "디자이너분 이름도 알려주세요!", timeAgo: "2시간 전" },
  ],
  r17: [
    { id: "r17c1", nickname: "사진찍는 사슴", content: "분당 율동공원 강추예요!", timeAgo: "3시간 전" },
    { id: "r17c2", nickname: "용감한 곰", content: "서현역에서 버스로 갈 수 있는 곳도 있어요", timeAgo: "5시간 전" },
    { id: "r17c3", nickname: "달콤한 복숭아", content: "탄천 산책 코스도 좋아요", timeAgo: "1일 전" },
  ],
};

/**
 * Fallback 댓글 — 게시글에 POST_COMMENTS 항목이 없을 때만 노출.
 * 사용자가 직접 작성한 새 글에 한해 보이도록 의도된 안내성 첫 댓글.
 */
export const COMMENTS = [
  { id: "fb-1", nickname: "보송보송한 햄찌", content: "글 잘 봤어요! 응원할게요 :)", timeAgo: "방금 전" },
];

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

export const CHATROOMS: ChatRoom[] = [
  { id: "1", name: "다같이 러닝해요", subtitle: "달콤한 무지", isGroup: true, memberCount: 6, lastMessage: "내일 7시 한강에서 만나요!", lastTime: "오후 3:15", unread: 3, pinned: true, online: true, meeting: { date: "5/18 (월)", time: "오후 7:00", place: "반포 한강공원 8번 출구" } },
  { id: "2", name: "보송보송한 햄찌", subtitle: "1:1", isGroup: false, memberCount: 2, lastMessage: "사진 보내드렸어요 📸", lastTime: "오후 2:48", unread: 1, online: true },
  { id: "3", name: "동네 떡볶이 모임", subtitle: "달콤한 무지, 외 4명", isGroup: true, memberCount: 5, lastMessage: "맛있겠다 ㅋㅋㅋ", lastTime: "오후 1:30", unread: 0, pinned: true, meeting: { date: "5/19 (화)", time: "오후 6:30", place: "정자동 떡볶이천국" } },
  { id: "4", name: "매콤한 떡볶이", subtitle: "1:1", isGroup: false, memberCount: 2, lastMessage: "넵 알겠습니다~", lastTime: "오전 11:20", unread: 0, muted: true },
  { id: "5", name: "주말 등산 크루", subtitle: "달콤한 무지, 외 7명", isGroup: true, memberCount: 8, lastMessage: "이번주는 패스할게요!", lastTime: "어제", unread: 12, meeting: { date: "5/23 (토)", time: "오전 6:00", place: "관악산 사당역 입구" } },
  { id: "6", name: "새콤한 망고", subtitle: "1:1", isGroup: false, memberCount: 2, lastMessage: "감사합니다 :)", lastTime: "어제", unread: 0 },
  { id: "7", name: "공구러 모임 🛒", subtitle: "달콤한 무지, 외 12명", isGroup: true, memberCount: 13, lastMessage: "수박 소분 마감입니다", lastTime: "5/14", unread: 0, muted: true, meeting: { date: "5/17 (일)", time: "오후 8:00", place: "분당 정자동 마트 앞" } },
  { id: "8", name: "새콤한 토마토", subtitle: "1:1", isGroup: false, memberCount: 2, lastMessage: "다음에 또 봐요!", lastTime: "5/5", unread: 0 },
];

export type ChatMessageReaction = { emoji: string; count: number; mine?: boolean };

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

export const CHAT_MESSAGES: ChatMessage[] = [
  { id: "0", nickname: "", content: "달콤한 무지님이 들어왔습니다", time: "", mine: false, date: "2026-05-08", type: "system" },
  { id: "1", nickname: "달콤한 무지", content: "안녕하세요 :D", time: "15:05", mine: false },
  { id: "2", nickname: "달콤한 무지", content: "러닝 크루 모집하시는거 맞으세요?", time: "15:05", mine: false, reactions: [{ emoji: "👍", count: 2 }] },
  { id: "3", nickname: "", content: "네 맞아요! 매주 화/목 7시예요 🏃‍♀️", time: "15:08", mine: true, read: true, date: "2026-05-09" },
  { id: "4", nickname: "고소한 감자", content: "오 저도 참가하고 싶어요!", time: "15:09", mine: false, replyTo: { nickname: "달콤한 무지", content: "네 맞아요! 매주 화/목 7시예요 🏃‍♀️" } },
  { id: "5", nickname: "", content: "환영해요~", time: "15:10", mine: true, read: true, reactions: [{ emoji: "❤️", count: 1, mine: false }, { emoji: "🎉", count: 2, mine: true }] },
  { id: "6", nickname: "달콤한 무지", content: "한강 어디서 모이나요?", time: "15:11", mine: false },
  { id: "7", nickname: "", content: "반포 한강공원 8번 출구 앞이에요!", time: "15:12", mine: true, read: false, readBy: 1 },
];

export const CHAT_QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export const CHAT_MEMBERS = [
  { id: "self", nickname: "달콤한 무지", isMe: true, isHost: false },
  { id: "host", nickname: "고소한 감자", isMe: false, isHost: true },
  { id: "member", nickname: "보송보송한 햄찌", isMe: false, isHost: false },
];

export const POINT_HISTORY = [
  { id: "1", date: "26.05.16", title: "친구 초대", note: "", amount: 50 },
  { id: "2", date: "26.05.15", title: "단기 모임 참여", note: "바퀴 벌레 잡아 주실분", amount: 20 },
  { id: "3", date: "26.05.10", title: "아이템 구매", note: "노란 원목 침대", amount: -100 },
  { id: "4", date: "26.05.05", title: "아이템 구매", note: "핑크 의자", amount: -50 },
];

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
  { name: "#맛집_네비게이터",   condition: "맛집 & 먹거리 게시글 좋아요 30개",         tier: "common" },
  { name: "#집밥_나눔왕",       condition: "맛집 & 먹거리 게시글 15개 작성",           tier: "common" },
  { name: "#배달비_절약러",     condition: "공동구매 / 소분하기 참여 10회",            tier: "common" },
  { name: "#공구의_주인공",     condition: "공동구매 모집글 5회 작성",                 tier: "common" },
  { name: "#소분_마스터",       condition: "공동구매 / 소분 게시글 좋아요 30개",       tier: "common" },
  { name: "#게임_길드장",       condition: "게임파티 모집글 5회 작성",                 tier: "common" },
  { name: "#랜선_파티원",       condition: "게임파티 참여 댓글 20회",                  tier: "common" },
  { name: "#홈트_동기부여",     condition: "같이 운동해요 게시글 10개 작성",           tier: "common" },
  { name: "#운동메이트",        condition: "같이 운동해요 댓글 30개 작성",             tier: "common" },
  { name: "#정주행_마스터",     condition: "드라마 · 영화 게시글 20개 작성",           tier: "common" },
  { name: "#스포주의_전문가",   condition: "드라마 · 영화 댓글 100개 작성",            tier: "common" },
  { name: "#벌레_해결사",       condition: "도와주세요! 게시글 채택 3회",              tier: "common" },
  { name: "#전등교체_마법사",   condition: "도와주세요! 댓글 채택 5회",                tier: "common" },
  { name: "#조립식가구_장인",   condition: "생활 도움 관련 채택 3회",                  tier: "common" },
  { name: "#못박기_달인",       condition: "도와주세요! 활동 15회",                    tier: "common" },
  { name: "#와이파이_구원자",   condition: "질문 해결 댓글 채택 5회",                  tier: "common" },
  { name: "#분리수거_박사",     condition: "생활팁 / 정보글 10개 작성",                tier: "common" },
  { name: "#동네_보안관",       condition: "신고 / 주의 관련 게시글 5개 작성",         tier: "common" },
  { name: "#무료나눔_천사",     condition: "무료나눔 게시글 10개 작성",                tier: "common" },
  { name: "#슬기로운_혼삶",     condition: "서로 다른 게시판 5곳 활동",                tier: "common" },
  { name: "#청소력_만렙",       condition: "청소 / 정리 관련 게시글 좋아요 20개",      tier: "common" },
  { name: "#동네_인싸",         condition: "친구 추가 20명",                           tier: "common" },
  { name: "#오늘은_내가요리사", condition: "요리 인증 게시글 10개 작성",               tier: "common" },
  { name: "#냉장고_탐험가",     condition: "레시피 / 재료 활용 게시글 5개 작성",       tier: "common" },
  { name: "#프로_공구러",       condition: "도와주세요! 게시판 활동 30회",             tier: "common" },

  // ── 희귀 칭호 (8) ──────────────────────────────────────
  { name: "#새벽의_해결사",         condition: "새벽 12시~5시 활동 50회",            tier: "rare" },
  { name: "#오늘도_삽질중",         condition: "게시글 수정 / 삭제 누적 30회",       tier: "rare" },
  { name: "#동네_프로참견러",       condition: "댓글 500개 작성",                    tier: "rare" },
  { name: "#생활치트키",            condition: "8개 게시판 모두 활동",               tier: "rare" },
  { name: "#에어프라이어_연금술사", condition: "맛집 & 먹거리 인기글 5회 달성",      tier: "rare" },
  { name: "#멀티탭_지배자",         condition: "도와주세요! 채택 20회",              tier: "rare" },
  { name: "#비오기전_빨래수거",     condition: "비 오는 날 게시글 20개 작성",        tier: "rare" },
  { name: "#쿠팡의_후예",           condition: "공동구매 / 소분 활동 30회",          tier: "rare" },

  // ── 전설 칭호 (4) ──────────────────────────────────────
  { name: "#자취의_신",       condition: "일반 칭호 15개 획득",                    tier: "legendary" },
  { name: "#우리동네_전설",   condition: "게시글 / 댓글 합산 활동 1000회",         tier: "legendary" },
  { name: "#인류애_충전기",   condition: "좋아요 누적 1000개 획득",                tier: "legendary" },
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
  date?: string;    // 획득 시 날짜 존재
};

export const BADGES: Badge[] = [
  // mock(기본) ME 사용자의 뱃지 획득일 — 2026.05.01 ~ 2026.05.16 범위로 분포.
  // 테스트 계정 로그인 시엔 seed-account 가 joinedAt 기준으로 재계산해서 덮어씀.
  { id: "badge_01", label: "빨래 요정",      condition: "세탁 관련 게시글을 5개 이상 작성하세요.",           date: "2026.05.16" },
  { id: "badge_02", label: "장보기 달인",    condition: "공동구매 모임에 3회 이상 참여하세요.",              date: "2026.05.15" },
  { id: "badge_03", label: "분리수거 요원",  condition: "분리수거 관련 글을 5개 이상 작성하세요.",           date: "2026.05.14" },
  { id: "badge_04", label: "설거지 명수",    condition: "음식 나눔 후기를 3개 이상 작성하세요.",             date: "2026.05.13" },
  { id: "badge_05", label: "재료 손질 장인", condition: "집밥 관련 게시글을 10개 이상 작성하세요.",          date: "2026.05.12" },
  { id: "badge_06", label: "홈카페 사장님",  condition: "카페 모임에 5회 이상 참여하세요.",                  date: "2026.05.11" },
  { id: "badge_07", label: "다정한 이웃",    condition: "이웃에게 댓글을 50개 이상 달아주세요.",             date: "2026.05.09" },
  { id: "badge_08", label: "꿀잠 수호자",    condition: "출석 체크를 30일 연속 달성하세요.",                 date: "2026.05.08" },
  { id: "badge_09", label: "먼지 사냥꾼",    condition: "청소 관련 게시글을 5개 이상 작성하세요.",           date: "2026.05.06" },
  { id: "badge_10", label: "지구 지킴이",    condition: "환경 관련 모임에 3회 이상 참여하세요.",             date: "2026.05.04" },
  { id: "badge_11", label: "집밥 고수",      condition: "음식 나눔 모임에 5회 이상 참여하세요.",             date: "2026.05.03" },
  { id: "badge_12", label: "방구석 독서가",  condition: "독서 모임에 3회 이상 참여하세요.",                  date: "2026.05.01" },
  { id: "badge_13", label: "정주행의 달인",  condition: "TV·영화 게시판에 글을 10개 이상 작성하세요.",       date: undefined },
  { id: "badge_14", label: "산책 대장",      condition: "산책 모임에 5회 이상 참여하세요.",                  date: undefined },
  { id: "badge_15", label: "릴렉스 마스터",  condition: "힐링 모임에 3회 이상 참여하세요.",                  date: undefined },
  { id: "badge_16", label: "초록 집사",      condition: "식물 관련 게시글을 5개 이상 작성하세요.",           date: undefined },
  { id: "badge_17", label: "베이킹 마법사",  condition: "베이킹 모임에 3회 이상 참여하세요.",                date: undefined },
  { id: "badge_18", label: "꿀광 피부",      condition: "뷰티 관련 게시글을 10개 이상 작성하세요.",          date: undefined },
  { id: "badge_19", label: "오운완 실천가",  condition: "운동 모임에 10회 이상 참여하세요.",                 date: undefined },
  { id: "badge_20", label: "숙면 전문가",    condition: "출석 체크를 60일 연속 달성하세요.",                 date: undefined },
  { id: "badge_21", label: "동네 미식가",    condition: "맛집 관련 게시글을 10개 이상 작성하세요.",          date: undefined },
  { id: "badge_22", label: "동네 소통가",    condition: "채팅 메시지를 500개 이상 보내세요.",                date: undefined },
  { id: "badge_23", label: "HOLO 수호신",   condition: "레벨 30을 달성하세요.",                             date: undefined },
  { id: "badge_24", label: "홀로 입주자",    condition: "HOLO 가입을 완료하면 자동으로 발급돼요.",            date: undefined },
  { id: "badge_25", label: "작은 쇼룸 주인", condition: "마이룸에 가구를 20개 이상 수집하세요.",              date: undefined },
  { id: "badge_26", label: "1년째 입주민",   condition: "가입 후 출석일이 1년(365일) 이상이 되면 받아요.",     date: undefined },
];

export const FRIENDS = [
  { id: "2", nickname: "보송보송한 햄찌", avatarBg: "#C7BDFF" },
  { id: "3", nickname: "매콤한 떡볶이", avatarBg: "#FFCFCF" },
  { id: "4", nickname: "고소한 감자", avatarBg: "#FCEBB5" },
  { id: "5", nickname: "새콤한 망고", avatarBg: "#CCBCE0" },
  { id: "6", nickname: "새콤한 토마토", avatarBg: "#DDC0FF" },
  { id: "7", nickname: "씩씩한 당근", avatarBg: "#FCEBB5" },
  { id: "8", nickname: "고소한 호빵", avatarBg: "#C7BDFF" },
  { id: "9", nickname: "달콤한 수박", avatarBg: "#CAE4B9" },
  { id: "10", nickname: "쫄깃한 라면", avatarBg: "#FCEBB5" },
  { id: "11", nickname: "매콤한 만두", avatarBg: "#FFCFCF" },
  { id: "12", nickname: "촉촉한 푸딩", avatarBg: "#DDC0FF" },
];

export type AttendanceDay = {
  day: number;       // 1~7
  points: number;    // 지급 포인트
  checked: boolean;  // 출석 완료 여부
  isToday: boolean;  // 오늘 여부
  label?: string;    // 특별 라벨 (예: "연속보너스", "전체보너스")
};

// 현재 사용자 기준: 오늘은 2일차, 1일차 출석 완료, 연속 20일 스트릭
export const ATTENDANCE_DAYS: AttendanceDay[] = [
  { day: 1, points: 5,  checked: true,  isToday: false },
  { day: 2, points: 5,  checked: false, isToday: true  },
  { day: 3, points: 15, checked: false, isToday: false, label: "연속보너스" },
  { day: 4, points: 5,  checked: false, isToday: false },
  { day: 5, points: 25, checked: false, isToday: false, label: "연속보너스" },
  { day: 6, points: 5,  checked: false, isToday: false },
  { day: 7, points: 55, checked: false, isToday: false, label: "스페셜 보너스" },
];

export const ATTENDANCE_STREAK = 20; // 연속 출석일 수
