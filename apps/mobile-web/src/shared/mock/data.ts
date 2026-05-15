// 시안에서 추출한 mock 데이터 — Phase D에서 Supabase로 교체 예정

export const ME = {
  nickname: "무지는 단무지",
  level: 1,
  points: 0,
  title: "#벌레_해결사",
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
    status: "모집중",
    title: "점심 번개",
    description: "오피스 단지 떡볶이 메이트!",
    distance: "120m",
    duration: "20분",
    likes: 5,
    comments: 3,
    timeAgo: "33분 전",
    authorNickname: "수정",
    authorLevel: 14,
    location: { lat: 37.3504, lng: 127.1094, placeName: "미금역 1번 출구" },
    participants: [
      { avatarBg: "#FCEBB5" },
      { avatarBg: "#C7BDFF" },
      { avatarBg: "#FFCFCF" },
    ],
  },
  {
    id: "2",
    category: "share",
    status: "모집완료",
    title: "수박 소분",
    description: "마트에서 산 큰 수박 나눌 분~",
    distance: "300m",
    duration: "15분",
    likes: 12,
    comments: 7,
    timeAgo: "33분 전",
    authorNickname: "지윤",
    authorLevel: 13,
    location: { lat: 37.3486, lng: 127.1077, placeName: "도깨비 식자재마트" },
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
    status: "모집중",
    title: "강아지 산책친구 구해요",
    description: "매주 주말 한강공원 산책",
    distance: "250m",
    duration: "60분",
    likes: 12,
    comments: 7,
    timeAgo: "33분 전",
    authorNickname: "두부의 단단함",
    authorLevel: 8,
    location: { lat: 37.3520, lng: 127.1085, placeName: "정자일로 공원" },
    participants: [
      { avatarBg: "#FCEBB5" },
      { avatarBg: "#C7BDFF" },
    ],
  },
  {
    id: "4",
    category: "sport",
    status: "모집중",
    title: "헬스장 등록 같이 해요",
    description: "꾸준히 같이 가실 분 구해요",
    distance: "400m",
    duration: "60분",
    likes: 12,
    comments: 7,
    timeAgo: "33분 전",
    authorNickname: "감자튀김",
    authorLevel: 31,
    location: { lat: 37.3482, lng: 127.1112, placeName: "분당 엠코헤리츠 상가" },
    participants: [
      { avatarBg: "#FCEBB5" },
      { avatarBg: "#C7BDFF" },
      { avatarBg: "#FFCFCF" },
      { avatarBg: "#CCBCE0" },
      { avatarBg: "#DDC0FF" },
    ],
  },
  {
    id: "5",
    category: "food",
    status: "모집중",
    title: "점심 번개",
    description: "오피스 단지 떡볶이 메이트!",
    distance: "180m",
    duration: "20분",
    likes: 5,
    comments: 2,
    timeAgo: "33분 전",
    authorNickname: "두부의 단단함",
    authorLevel: 8,
    location: { lat: 37.3517, lng: 127.1102, placeName: "투썸플레이스" },
    participants: [
      { avatarBg: "#FCEBB5" },
      { avatarBg: "#C7BDFF" },
      { avatarBg: "#FFCFCF" },
      { avatarBg: "#CCBCE0" },
    ],
  },
  {
    id: "6",
    category: "share",
    status: "모집완료",
    title: "수박 소분",
    description: "마트에서 산 큰 수박 나눌 분",
    distance: "350m",
    duration: "15분",
    likes: 12,
    comments: 7,
    timeAgo: "33분 전",
    authorNickname: "감자튀김",
    authorLevel: 31,
    location: { lat: 37.3484, lng: 127.1072, placeName: "지구촌 평생교육원" },
    participants: [
      { avatarBg: "#FCEBB5" },
    ],
  },
  // 홈 추천 모임 카드와 매칭되는 게시글 (id: hm3 ~ hm10)
  { id: "hm3", category: "food", status: "모집중", title: "편의점 야식", description: "혼자 먹긴 많아서요 ㅎㅎ", distance: "120m", duration: "5분", likes: 3, comments: 1, timeAgo: "10분 전", authorNickname: "재민", authorLevel: 10, location: { lat: 37.3500, lng: 127.1080, placeName: "GS25 미금역점" }, participants: [{ avatarBg: "#FCEBB5" }] },
  { id: "hm4", category: "share", status: "모집중", title: "코스트코 소분", description: "코스트코에서 함께 장 보고 나눌 분~", distance: "700m", duration: "50분", likes: 8, comments: 2, timeAgo: "20분 전", authorNickname: "준호", authorLevel: 15, location: { lat: 37.3470, lng: 127.1130, placeName: "코스트코 분당점" }, participants: [{ avatarBg: "#C7BDFF" }, { avatarBg: "#FCEBB5" }] },
  { id: "hm5", category: "sport", status: "모집중", title: "러닝 메이트", description: "오늘 저녁에 같이 뛰어요!", distance: "200m", duration: "60분", likes: 11, comments: 4, timeAgo: "15분 전", authorNickname: "민호", authorLevel: 18, peopleCount: 6, location: { lat: 37.3510, lng: 127.1095, placeName: "탄천 산책로" }, participants: [{ avatarBg: "#FCEBB5" }, { avatarBg: "#C7BDFF" }, { avatarBg: "#FFCFCF" }, { avatarBg: "#CCBCE0" }, { avatarBg: "#DDC0FF" }] },
  { id: "hm6", category: "help", status: "모집중", title: "스터디 카페", description: "조용히 공부할 분 모집해요", distance: "400m", duration: "120분", likes: 6, comments: 2, timeAgo: "30분 전", authorNickname: "유나", authorLevel: 22, location: { lat: 37.3495, lng: 127.1120, placeName: "토즈 스터디카페" }, participants: [{ avatarBg: "#FCEBB5" }, { avatarBg: "#C7BDFF" }, { avatarBg: "#FFCFCF" }] },
  { id: "hm7", category: "game", status: "모집중", title: "보드게임 모임", description: "할리갈리 마피아 환영해요", distance: "650m", duration: "90분", likes: 14, comments: 3, timeAgo: "40분 전", authorNickname: "지호", authorLevel: 19, peopleCount: 8, location: { lat: 37.3480, lng: 127.1140, placeName: "보드앤플레이 보드게임카페" }, participants: [{ avatarBg: "#FCEBB5" }, { avatarBg: "#C7BDFF" }, { avatarBg: "#FFCFCF" }, { avatarBg: "#CCBCE0" }, { avatarBg: "#DDC0FF" }, { avatarBg: "#CAE4B9" }] },
  { id: "hm8", category: "food", status: "모집중", title: "카페 투어", description: "동네 신상 카페 같이 가요", distance: "800m", duration: "180분", likes: 7, comments: 1, timeAgo: "1시간 전", authorNickname: "수정", authorLevel: 14, location: { lat: 37.3530, lng: 127.1060, placeName: "정자동 카페거리" }, participants: [{ avatarBg: "#FCEBB5" }, { avatarBg: "#C7BDFF" }] },
  { id: "hm9", category: "sport", status: "모집중", title: "산책 메이트", description: "공원 한바퀴 같이 돌 분~", distance: "150m", duration: "40분", likes: 5, comments: 1, timeAgo: "5분 전", authorNickname: "정희", authorLevel: 9, location: { lat: 37.3505, lng: 127.1090, placeName: "정자일로 공원" }, participants: [{ avatarBg: "#FCEBB5" }, { avatarBg: "#C7BDFF" }] },
  { id: "hm10", category: "help", status: "모집중", title: "독서 모임", description: "이번 주 책 같이 읽어요", distance: "550m", duration: "75분", likes: 9, comments: 2, timeAgo: "2시간 전", authorNickname: "옥자", authorLevel: 11, location: { lat: 37.3485, lng: 127.1105, placeName: "정자도서관" }, participants: [{ avatarBg: "#FCEBB5" }, { avatarBg: "#C7BDFF" }, { avatarBg: "#FFCFCF" }, { avatarBg: "#CCBCE0" }] },
  // 자유게시판 (free)
  { id: "f1", category: "free", status: "모집중", title: "떡볶이 어디가 맛있나요?", description: "아파트 근처 분식집이 궁금해요", distance: "0m", duration: "0분", likes: 12, comments: 3, timeAgo: "33분 전", authorNickname: "껍질은 달걀껍질", authorLevel: 12 },
  { id: "f2", category: "free", status: "모집중", title: "주말에 뭐 하세요?", description: "심심한데 같이 놀 친구 구해요", distance: "0m", duration: "0분", likes: 8, comments: 2, timeAgo: "1시간 전", authorNickname: "감자 없는 카레", authorLevel: 7 },
  { id: "f3", category: "free", status: "모집중", title: "근처 카페 추천", description: "공부할 만한 조용한 카페 있나요?", distance: "0m", duration: "0분", likes: 5, comments: 1, timeAgo: "2시간 전", authorNickname: "포도껍질", authorLevel: 15 },
  // 추천해요 (recommend)
  { id: "r1", category: "recommend", status: "모집중", title: "최근에 본 영화 추천", description: "스릴러 좋아하면 꼭 보세요!", distance: "0m", duration: "0분", likes: 25, comments: 2, timeAgo: "10분 전", authorNickname: "감자튀김", authorLevel: 31 },
  { id: "r2", category: "recommend", status: "모집중", title: "근처 맛집 추천", description: "골목 안쪽에 숨은 보석 같은 가게", distance: "0m", duration: "0분", likes: 18, comments: 1, timeAgo: "30분 전", authorNickname: "포도껍질", authorLevel: 15 },
  // 게임파티 (game)
  { id: "g1", category: "game", status: "모집중", title: "보드게임 같이 해요", description: "주말 저녁 보드게임 카페 모임", distance: "150m", duration: "120분", likes: 15, comments: 2, timeAgo: "20분 전", authorNickname: "껍질은 달걀껍질", authorLevel: 12, peopleCount: 6, location: { lat: 37.3504, lng: 127.1094, placeName: "미금역 사거리" } },
  { id: "g2", category: "game", status: "모집완료", title: "PC방 4명 모집", description: "오버워치 같이 하실 분", distance: "300m", duration: "180분", likes: 10, comments: 1, timeAgo: "1시간 전", authorNickname: "감자튀김", authorLevel: 31, peopleCount: 4, location: { lat: 37.3498, lng: 127.1108, placeName: "PC방 미금역점" } },
  // 드라마 · 영화 (media)
  { id: "m1", category: "media", status: "모집중", title: "넷플릭스 같이 정주행", description: "주말마다 같이 정주행할 분 모집", distance: "100m", duration: "240분", likes: 14, comments: 1, timeAgo: "45분 전", authorNickname: "멜론은 키위를 좋아해", authorLevel: 18, peopleCount: 4, location: { lat: 37.3510, lng: 127.1088, placeName: "분당 정자동" } },
  // 도와주세요! (help)
  { id: "h1", category: "help", status: "모집중", title: "이사 짐 옮길 분", description: "오후 시간 잠깐 도와주실 분 구해요", distance: "120m", duration: "30분", likes: 3, comments: 1, timeAgo: "5분 전", authorNickname: "껍질은 달걀껍질", authorLevel: 12, peopleCount: 2, location: { lat: 37.3492, lng: 127.1101, placeName: "분당 정자동 아파트" } },

  // ── 카테고리별 10개 보장을 위한 추가 게시글 ─────────────────────
  // 맛집 & 먹거리 (food) — +6
  { id: "fd11", category: "food", status: "모집중", title: "마라탕 메이트", description: "오늘 저녁 마라탕 같이 드실 분", distance: "250m", duration: "60분", likes: 9, comments: 2, timeAgo: "25분 전", authorNickname: "수정", authorLevel: 14, peopleCount: 4, location: { lat: 37.3508, lng: 127.1098, placeName: "탕화쿵푸 정자점" } },
  { id: "fd12", category: "food", status: "모집중", title: "치킨 한 마리", description: "야식 같이 시켜 먹어요", distance: "180m", duration: "45분", likes: 6, comments: 1, timeAgo: "50분 전", authorNickname: "재민", authorLevel: 10, peopleCount: 3, location: { lat: 37.3499, lng: 127.1085, placeName: "BHC 정자점" } },
  { id: "fd13", category: "food", status: "모집중", title: "브런치 카페", description: "주말 브런치 같이 가요", distance: "550m", duration: "90분", likes: 11, comments: 3, timeAgo: "3시간 전", authorNickname: "예린", authorLevel: 16, peopleCount: 4, location: { lat: 37.3528, lng: 127.1063, placeName: "라이크라이크 카페" } },
  { id: "fd14", category: "food", status: "모집중", title: "삼겹살 회식", description: "퇴근 후 가볍게 삼겹살 어때요", distance: "320m", duration: "120분", likes: 8, comments: 2, timeAgo: "4시간 전", authorNickname: "준호", authorLevel: 15, peopleCount: 6, location: { lat: 37.3490, lng: 127.1110, placeName: "정자 고기굽는집" } },
  { id: "fd15", category: "food", status: "모집중", title: "초밥 점심", description: "맛있는 초밥집 같이 가실 분", distance: "420m", duration: "70분", likes: 14, comments: 4, timeAgo: "1일 전", authorNickname: "민지", authorLevel: 19, peopleCount: 4, location: { lat: 37.3515, lng: 127.1078, placeName: "스시노믹 정자점" } },
  { id: "fd16", category: "food", status: "모집완료", title: "김치찌개 점심", description: "정자동 김치찌개 맛집 출발해요", distance: "230m", duration: "60분", likes: 7, comments: 2, timeAgo: "2일 전", authorNickname: "옥자", authorLevel: 11, peopleCount: 3, location: { lat: 37.3502, lng: 127.1100, placeName: "어머니 김치찌개" } },

  // 공동구매 / 소분하기 (share) — +7
  { id: "sh11", category: "share", status: "모집중", title: "딸기 한 박스 나눔", description: "농장 직배송 딸기 박스 나눠요", distance: "300m", duration: "20분", likes: 10, comments: 3, timeAgo: "1시간 전", authorNickname: "지윤", authorLevel: 13, peopleCount: 4, location: { lat: 37.3486, lng: 127.1077, placeName: "도깨비 식자재마트" } },
  { id: "sh12", category: "share", status: "모집중", title: "휴지 대용량", description: "코스트코 휴지 대용량 나눌 분", distance: "700m", duration: "60분", likes: 6, comments: 1, timeAgo: "2시간 전", authorNickname: "준호", authorLevel: 15, peopleCount: 3, location: { lat: 37.3470, lng: 127.1130, placeName: "코스트코 분당점" } },
  { id: "sh13", category: "share", status: "모집중", title: "참외 박스", description: "참외 한 박스 나누실 분~", distance: "260m", duration: "25분", likes: 5, comments: 2, timeAgo: "3시간 전", authorNickname: "서아", authorLevel: 14, peopleCount: 3, location: { lat: 37.3490, lng: 127.1085, placeName: "정자동 농수산물직판장" } },
  { id: "sh14", category: "share", status: "모집중", title: "쌀 20kg 분할", description: "쌀 5kg씩 나누실 분 구해요", distance: "190m", duration: "15분", likes: 4, comments: 1, timeAgo: "5시간 전", authorNickname: "현우", authorLevel: 17, peopleCount: 4, location: { lat: 37.3505, lng: 127.1092, placeName: "정자동 미곡상" } },
  { id: "sh15", category: "share", status: "모집중", title: "샴푸 박스", description: "코스트코 샴푸 박스 나눠요", distance: "700m", duration: "60분", likes: 7, comments: 2, timeAgo: "1일 전", authorNickname: "유나", authorLevel: 22, peopleCount: 3, location: { lat: 37.3470, lng: 127.1130, placeName: "코스트코 분당점" } },
  { id: "sh16", category: "share", status: "모집완료", title: "한라봉 박스", description: "제주산 한라봉 5kg 박스 나눠요", distance: "320m", duration: "25분", likes: 12, comments: 4, timeAgo: "2일 전", authorNickname: "정희", authorLevel: 9, peopleCount: 4, location: { lat: 37.3491, lng: 127.1082, placeName: "정자동 청과상" } },
  { id: "sh17", category: "share", status: "모집중", title: "세제 대용량", description: "세제 대용량 같이 사실 분", distance: "450m", duration: "40분", likes: 3, comments: 1, timeAgo: "3일 전", authorNickname: "성훈", authorLevel: 20, peopleCount: 3, location: { lat: 37.3478, lng: 127.1115, placeName: "이마트 정자점" } },

  // 같이 운동해요 (sport) — +6
  { id: "sp11", category: "sport", status: "모집중", title: "테니스 메이트", description: "주말 아침 테니스 같이 쳐요", distance: "320m", duration: "90분", likes: 9, comments: 2, timeAgo: "1시간 전", authorNickname: "도윤", authorLevel: 18, peopleCount: 4, location: { lat: 37.3525, lng: 127.1075, placeName: "정자 테니스장" } },
  { id: "sp12", category: "sport", status: "모집중", title: "주말 풋살", description: "토요일 풋살 같이 차요", distance: "600m", duration: "120분", likes: 15, comments: 5, timeAgo: "2시간 전", authorNickname: "민호", authorLevel: 18, peopleCount: 10, location: { lat: 37.3460, lng: 127.1120, placeName: "분당 풋살파크" } },
  { id: "sp13", category: "sport", status: "모집중", title: "필라테스 메이트", description: "주 2회 필라테스 같이 갈 분", distance: "250m", duration: "60분", likes: 7, comments: 1, timeAgo: "3시간 전", authorNickname: "은채", authorLevel: 15, peopleCount: 3, location: { lat: 37.3500, lng: 127.1098, placeName: "더 핏 필라테스" } },
  { id: "sp14", category: "sport", status: "모집중", title: "새벽 수영", description: "새벽 수영 메이트 구해요", distance: "350m", duration: "60분", likes: 5, comments: 1, timeAgo: "5시간 전", authorNickname: "지호", authorLevel: 19, peopleCount: 2, location: { lat: 37.3520, lng: 127.1070, placeName: "분당 스포츠센터" } },
  { id: "sp15", category: "sport", status: "모집중", title: "탁구 한판", description: "동네 탁구장 같이 가실 분", distance: "180m", duration: "75분", likes: 4, comments: 2, timeAgo: "1일 전", authorNickname: "병태", authorLevel: 9, peopleCount: 4, location: { lat: 37.3496, lng: 127.1090, placeName: "정자 탁구장" } },
  { id: "sp16", category: "sport", status: "모집중", title: "자전거 라이딩", description: "한강 라이딩 같이 가요", distance: "400m", duration: "180분", likes: 18, comments: 6, timeAgo: "2일 전", authorNickname: "태양", authorLevel: 21, peopleCount: 8, location: { lat: 37.3515, lng: 127.1083, placeName: "탄천 자전거도로" } },

  // 도와주세요! (help) — +7
  { id: "hp11", category: "help", status: "모집중", title: "택배 받아주실 분", description: "오후 시간대 택배 대신 받아주세요", distance: "100m", duration: "10분", likes: 2, comments: 1, timeAgo: "20분 전", authorNickname: "치즈복이", authorLevel: 8, peopleCount: 1, location: { lat: 37.3504, lng: 127.1094, placeName: "정자동 우편함 앞" } },
  { id: "hp12", category: "help", status: "모집중", title: "강아지 산책 부탁", description: "오늘 저녁 산책 대신 부탁드려요", distance: "200m", duration: "30분", likes: 4, comments: 2, timeAgo: "1시간 전", authorNickname: "토마토킹", authorLevel: 13, peopleCount: 1, location: { lat: 37.3520, lng: 127.1085, placeName: "정자일로 공원" } },
  { id: "hp13", category: "help", status: "모집중", title: "노트북 추천 부탁", description: "100만원대 노트북 추천 부탁드려요", distance: "150m", duration: "20분", likes: 6, comments: 3, timeAgo: "3시간 전", authorNickname: "참치는 등푸른", authorLevel: 7, peopleCount: 2, location: { lat: 37.3500, lng: 127.1090, placeName: "정자동 전자상가" } },
  { id: "hp14", category: "help", status: "모집중", title: "에어컨 청소 업체", description: "에어컨 청소 업체 추천 좀 부탁드려요", distance: "120m", duration: "15분", likes: 3, comments: 1, timeAgo: "5시간 전", authorNickname: "감자튀김", authorLevel: 31, peopleCount: 1, location: { lat: 37.3503, lng: 127.1093, placeName: "정자동 아파트" } },
  { id: "hp15", category: "help", status: "모집중", title: "잃어버린 지갑", description: "정자동 카페 근처에서 지갑 잃어버렸어요", distance: "300m", duration: "30분", likes: 8, comments: 4, timeAgo: "1일 전", authorNickname: "라면 한 봉지", authorLevel: 10, peopleCount: 1, location: { lat: 37.3515, lng: 127.1078, placeName: "투썸플레이스" } },
  { id: "hp16", category: "help", status: "모집중", title: "고양이 임시 보호", description: "주말 동안 고양이 봐주실 분", distance: "150m", duration: "60분", likes: 5, comments: 2, timeAgo: "2일 전", authorNickname: "수박나라", authorLevel: 12, peopleCount: 1, location: { lat: 37.3498, lng: 127.1095, placeName: "정자동 아파트" } },
  { id: "hp17", category: "help", status: "모집중", title: "정형외과 추천", description: "근처 정형외과 추천해 주세요", distance: "0m", duration: "0분", likes: 4, comments: 2, timeAgo: "3일 전", authorNickname: "닭볶음탕수", authorLevel: 11, peopleCount: 1, location: { lat: 37.3505, lng: 127.1092, placeName: "정자동 메디컬센터" } },

  // 게임파티 (game) — +7
  { id: "gm11", category: "game", status: "모집중", title: "롤 듀오 구해요", description: "골드 듀오 파트너 모집", distance: "100m", duration: "120분", likes: 12, comments: 3, timeAgo: "30분 전", authorNickname: "당근소년", authorLevel: 17, peopleCount: 2, location: { lat: 37.3498, lng: 127.1108, placeName: "PC방 미금역점" } },
  { id: "gm12", category: "game", status: "모집중", title: "마인크래프트 서버", description: "같이 서버 운영하실 분 찾아요", distance: "0m", duration: "0분", likes: 7, comments: 1, timeAgo: "1시간 전", authorNickname: "지호", authorLevel: 19, peopleCount: 6, location: { lat: 37.3504, lng: 127.1094, placeName: "온라인" } },
  { id: "gm13", category: "game", status: "모집중", title: "스팀 협동게임", description: "협동 무료게임 같이 해요", distance: "0m", duration: "0분", likes: 5, comments: 2, timeAgo: "2시간 전", authorNickname: "도윤", authorLevel: 18, peopleCount: 4, location: { lat: 37.3504, lng: 127.1094, placeName: "온라인" } },
  { id: "gm14", category: "game", status: "모집중", title: "보드게임 카페", description: "보드게임 카페 같이 가실 분", distance: "650m", duration: "120분", likes: 9, comments: 3, timeAgo: "3시간 전", authorNickname: "정희", authorLevel: 9, peopleCount: 6, location: { lat: 37.3480, lng: 127.1140, placeName: "보드앤플레이 보드게임카페" } },
  { id: "gm15", category: "game", status: "모집중", title: "철권 매칭 메이트", description: "오프라인 격투게임 메이트 구해요", distance: "180m", duration: "150분", likes: 6, comments: 1, timeAgo: "5시간 전", authorNickname: "성훈", authorLevel: 20, peopleCount: 4, location: { lat: 37.3500, lng: 127.1095, placeName: "정자 PC방" } },
  { id: "gm16", category: "game", status: "모집중", title: "방탈출 카페", description: "어려운 방탈출 도전 같이!", distance: "400m", duration: "90분", likes: 11, comments: 4, timeAgo: "1일 전", authorNickname: "옥자", authorLevel: 11, peopleCount: 4, location: { lat: 37.3492, lng: 127.1115, placeName: "이스케이프 룸 정자점" } },
  { id: "gm17", category: "game", status: "모집완료", title: "포커 친목", description: "친목 포커 같이 하실 분", distance: "220m", duration: "180분", likes: 8, comments: 2, timeAgo: "2일 전", authorNickname: "재민", authorLevel: 10, peopleCount: 6, location: { lat: 37.3502, lng: 127.1097, placeName: "정자동 카페" } },

  // 드라마 · 영화 (media) — +9
  { id: "md11", category: "media", status: "모집중", title: "오징어 게임 시즌2", description: "넷플릭스 동시 시청해요!", distance: "0m", duration: "0분", likes: 16, comments: 4, timeAgo: "20분 전", authorNickname: "멜론은 키위를 좋아해", authorLevel: 18, peopleCount: 6, location: { lat: 37.3510, lng: 127.1088, placeName: "온라인 / 분당 정자동" } },
  { id: "md12", category: "media", status: "모집중", title: "어벤져스 정주행", description: "마블 시리즈 정주행 메이트", distance: "150m", duration: "240분", likes: 11, comments: 2, timeAgo: "1시간 전", authorNickname: "민지", authorLevel: 19, peopleCount: 4, location: { lat: 37.3508, lng: 127.1090, placeName: "분당 정자동" } },
  { id: "md13", category: "media", status: "모집중", title: "주말 신작 영화", description: "주말 신작 영화 같이 봐요", distance: "550m", duration: "150분", likes: 14, comments: 3, timeAgo: "2시간 전", authorNickname: "서아", authorLevel: 14, peopleCount: 4, location: { lat: 37.3460, lng: 127.1145, placeName: "CGV 분당" } },
  { id: "md14", category: "media", status: "모집중", title: "공포영화 메이트", description: "혼자 보기 무서운 공포영화 같이!", distance: "200m", duration: "120분", likes: 9, comments: 2, timeAgo: "3시간 전", authorNickname: "현우", authorLevel: 17, peopleCount: 4, location: { lat: 37.3510, lng: 127.1088, placeName: "분당 정자동" } },
  { id: "md15", category: "media", status: "모집중", title: "디즈니플러스 공유", description: "디플 같이 결제할 분 (3인)", distance: "0m", duration: "0분", likes: 7, comments: 1, timeAgo: "5시간 전", authorNickname: "은채", authorLevel: 15, peopleCount: 3, location: { lat: 37.3504, lng: 127.1094, placeName: "온라인" } },
  { id: "md16", category: "media", status: "모집중", title: "독립영화 상영회", description: "독립영화 상영회 같이 가요", distance: "700m", duration: "180분", likes: 6, comments: 2, timeAgo: "6시간 전", authorNickname: "예린", authorLevel: 16, peopleCount: 5, location: { lat: 37.3470, lng: 127.1060, placeName: "분당 아트홀" } },
  { id: "md17", category: "media", status: "모집중", title: "고전영화 모임", description: "흑백영화 함께 보는 모임", distance: "250m", duration: "150분", likes: 5, comments: 1, timeAgo: "1일 전", authorNickname: "병태", authorLevel: 9, peopleCount: 4, location: { lat: 37.3520, lng: 127.1080, placeName: "정자동 카페" } },
  { id: "md18", category: "media", status: "모집중", title: "리뷰 클럽", description: "본 영화 리뷰 같이 쓰는 모임", distance: "300m", duration: "90분", likes: 4, comments: 2, timeAgo: "2일 전", authorNickname: "철수", authorLevel: 23, peopleCount: 4, location: { lat: 37.3500, lng: 127.1095, placeName: "정자동 스터디카페" } },
  { id: "md19", category: "media", status: "모집완료", title: "다큐멘터리 토론", description: "다큐 보고 같이 토론해요", distance: "400m", duration: "120분", likes: 8, comments: 3, timeAgo: "3일 전", authorNickname: "태양", authorLevel: 21, peopleCount: 6, location: { lat: 37.3495, lng: 127.1100, placeName: "정자도서관" } },

  // 자유게시판 (free) — +7
  { id: "f11", category: "free", status: "모집중", title: "동네 분리수거 시간", description: "분리수거 시간 아시는 분?", distance: "0m", duration: "0분", likes: 4, comments: 2, timeAgo: "10분 전", authorNickname: "포도껍질", authorLevel: 15 },
  { id: "f12", category: "free", status: "모집중", title: "공원 야간 개방", description: "정자동 공원 야간 개방 시간 아시는 분", distance: "0m", duration: "0분", likes: 3, comments: 1, timeAgo: "25분 전", authorNickname: "단무지가 부럽다", authorLevel: 11 },
  { id: "f13", category: "free", status: "모집중", title: "오늘 비 오나요?", description: "외출하려는데 비 올까봐요..", distance: "0m", duration: "0분", likes: 5, comments: 3, timeAgo: "1시간 전", authorNickname: "감자 없는 카레", authorLevel: 7 },
  { id: "f14", category: "free", status: "모집중", title: "동네 자랑 한 마디", description: "오늘 새로 생긴 빵집 너무 좋아요", distance: "0m", duration: "0분", likes: 12, comments: 5, timeAgo: "2시간 전", authorNickname: "껍질은 달걀껍질", authorLevel: 12 },
  { id: "f15", category: "free", status: "모집중", title: "층간소음 고민", description: "어떻게 해결하셨나요?", distance: "0m", duration: "0분", likes: 9, comments: 6, timeAgo: "3시간 전", authorNickname: "두부의 단단함", authorLevel: 8 },
  { id: "f16", category: "free", status: "모집중", title: "이사 떡 인사", description: "옆집 이사오시면 떡 돌리시나요?", distance: "0m", duration: "0분", likes: 6, comments: 4, timeAgo: "1일 전", authorNickname: "깻잎쟁이", authorLevel: 13 },
  { id: "f17", category: "free", status: "모집중", title: "도서관 추천", description: "정자도서관 vs 야탑도서관?", distance: "0m", duration: "0분", likes: 7, comments: 3, timeAgo: "2일 전", authorNickname: "점심은 감튀", authorLevel: 9 },

  // 추천해요 (recommend) — +8
  { id: "r11", category: "recommend", status: "모집중", title: "햄버거 맛집", description: "쉑쉑보다 맛있는 곳 발견!", distance: "0m", duration: "0분", likes: 22, comments: 4, timeAgo: "15분 전", authorNickname: "감자튀김", authorLevel: 31 },
  { id: "r12", category: "recommend", status: "모집중", title: "분위기 좋은 카페", description: "분위기 좋은 조용한 카페 추천", distance: "0m", duration: "0분", likes: 16, comments: 2, timeAgo: "40분 전", authorNickname: "포도껍질", authorLevel: 15 },
  { id: "r13", category: "recommend", status: "모집중", title: "드라마 추천", description: "최근 본 드라마 중 갓작이에요", distance: "0m", duration: "0분", likes: 19, comments: 5, timeAgo: "1시간 전", authorNickname: "멜론은 키위를 좋아해", authorLevel: 18 },
  { id: "r14", category: "recommend", status: "모집중", title: "운동복 브랜드", description: "기능 좋은 운동복 브랜드 공유해요", distance: "0m", duration: "0분", likes: 11, comments: 3, timeAgo: "2시간 전", authorNickname: "민호", authorLevel: 18 },
  { id: "r15", category: "recommend", status: "모집중", title: "정자동 미용실", description: "친절한 디자이너 있는 곳 추천", distance: "0m", duration: "0분", likes: 14, comments: 2, timeAgo: "3시간 전", authorNickname: "지윤", authorLevel: 13 },
  { id: "r16", category: "recommend", status: "모집중", title: "데이트 코스", description: "분당 데이트 코스 추천이요", distance: "0m", duration: "0분", likes: 17, comments: 4, timeAgo: "5시간 전", authorNickname: "수정", authorLevel: 14 },
  { id: "r17", category: "recommend", status: "모집중", title: "주말 나들이", description: "차 없이 가기 좋은 나들이 장소", distance: "0m", duration: "0분", likes: 13, comments: 3, timeAgo: "1일 전", authorNickname: "혜진", authorLevel: 10 },
  { id: "r18", category: "recommend", status: "모집중", title: "올해 베스트셀러", description: "올해 읽은 책 중 추천!", distance: "0m", duration: "0분", likes: 9, comments: 2, timeAgo: "2일 전", authorNickname: "옥자", authorLevel: 11 },
];

// 게시글 ID 별로 보여줄 댓글 (board-detail 화면에서 사용)
export const POST_COMMENTS: Record<string, { id: string; nickname: string; content: string; timeAgo: string }[]> = {
  f1: [
    { id: "f1c1", nickname: "감자 없는 카레", content: "OO분식집이 가깝고 좋아요.", timeAgo: "1분 전" },
    { id: "f1c2", nickname: "두부의 단단함", content: "조금 더 걸어가서 있는 ㅁㅁ분식집도 괜찮아요!", timeAgo: "5분 전" },
    { id: "f1c3", nickname: "포도껍질", content: "버스타고 나가야 하긴 하는데 ㅎㅎ떡볶이 집도 맛있었어요.", timeAgo: "7분 전" },
  ],
  f2: [
    { id: "f2c1", nickname: "껍질은 달걀껍질", content: "저도요! 같이 놀러가요!", timeAgo: "2분 전" },
    { id: "f2c2", nickname: "감자튀김", content: "주말에 시간 비어요 :)", timeAgo: "8분 전" },
  ],
  f3: [
    { id: "f3c1", nickname: "포도껍질", content: "OO카페 추천드려요. 콘센트도 많아요!", timeAgo: "3분 전" },
  ],
  "2": [
    { id: "2c1", nickname: "껍질은 달걀껍질", content: "저요! 한 조각만 주세요~", timeAgo: "1분 전" },
    { id: "2c2", nickname: "감자 없는 카레", content: "위치 어디세요?", timeAgo: "4분 전" },
  ],
  "6": [
    { id: "6c1", nickname: "감자튀김", content: "키친타올 저도 사고 싶었어요!", timeAgo: "10분 전" },
  ],
  r1: [
    { id: "r1c1", nickname: "두부의 단단함", content: "제목 알려주세요!", timeAgo: "2분 전" },
    { id: "r1c2", nickname: "포도껍질", content: "방금 봤는데 진짜 재밌어요!", timeAgo: "12분 전" },
  ],
  r2: [
    { id: "r2c1", nickname: "감자 없는 카레", content: "위치 좀 부탁드려요~", timeAgo: "8분 전" },
  ],
  g1: [
    { id: "g1c1", nickname: "멜론은 키위를 좋아해", content: "보드게임 카페 어디로 가시나요?", timeAgo: "5분 전" },
    { id: "g1c2", nickname: "감자튀김", content: "토요일 가능합니다!", timeAgo: "15분 전" },
  ],
  g2: [
    { id: "g2c1", nickname: "껍질은 달걀껍질", content: "이미 마감됐나요? ㅠㅠ", timeAgo: "20분 전" },
  ],
  "3": [
    { id: "3c1", nickname: "두부의 단단함", content: "저도 강아지 산책 같이 가고 싶어요!", timeAgo: "10분 전" },
  ],
  "4": [
    { id: "4c1", nickname: "감자튀김", content: "어느 헬스장이세요?", timeAgo: "12분 전" },
  ],
  m1: [
    { id: "m1c1", nickname: "포도껍질", content: "요즘 OOO 정주행 중인데 같이 봐요!", timeAgo: "20분 전" },
  ],
  "1": [
    { id: "1c1", nickname: "껍질은 달걀껍질", content: "저요! 저요!", timeAgo: "1분 전" },
    { id: "1c2", nickname: "감자 없는 카레", content: "오! 떡볶이 정말 좋아해요", timeAgo: "5분 전" },
    { id: "1c3", nickname: "멜론은 키위를 좋아해", content: "떡볶이 가게 이름이 뭐에요?", timeAgo: "7분 전" },
  ],
  "5": [
    { id: "5c1", nickname: "두부의 단단함", content: "치킨 좋아요, 어디 거 시키시나요?", timeAgo: "9분 전" },
  ],
  h1: [
    { id: "h1c1", nickname: "감자 없는 카레", content: "몇 시까지 도와드리면 될까요?", timeAgo: "3분 전" },
  ],
};

export const COMMENTS = [
  { id: "1", nickname: "껍질은 달걀껍질", content: "저요! 저요!", timeAgo: "1분 전" },
  { id: "2", nickname: "감자 없는 카레", content: "오! 떡볶이 정말 좋아해요", timeAgo: "5분 전" },
  { id: "3", nickname: "멜론은 키위를 좋아해", content: "떡볶이 가게 이름이 뭐에요?", timeAgo: "7분 전" },
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
};

export const CHATROOMS: ChatRoom[] = [
  { id: "1", name: "다같이 러닝해요", subtitle: "무지는 단무지", isGroup: true, memberCount: 6, lastMessage: "내일 7시 한강에서 만나요!", lastTime: "오후 3:15", unread: 3, pinned: true, online: true, meeting: { date: "5/10 (화)", time: "오후 7:00", place: "반포 한강공원 8번 출구" } },
  { id: "2", name: "껍질은 달걀껍질", subtitle: "1:1", isGroup: false, memberCount: 2, lastMessage: "사진 보내드렸어요 📸", lastTime: "오후 2:48", unread: 1, online: true },
  { id: "3", name: "동네 떡볶이 모임", subtitle: "무지는 단무지, 외 4명", isGroup: true, memberCount: 5, lastMessage: "맛있겠다 ㅋㅋㅋ", lastTime: "오후 1:30", unread: 0, pinned: true, meeting: { date: "5/11 (수)", time: "오후 6:30", place: "정자동 떡볶이천국" } },
  { id: "4", name: "감자 없는 카레", subtitle: "1:1", isGroup: false, memberCount: 2, lastMessage: "넵 알겠습니다~", lastTime: "오전 11:20", unread: 0, muted: true },
  { id: "5", name: "주말 등산 크루", subtitle: "무지는 단무지, 외 7명", isGroup: true, memberCount: 8, lastMessage: "이번주는 패스할게요!", lastTime: "어제", unread: 12, meeting: { date: "5/14 (토)", time: "오전 6:00", place: "관악산 사당역 입구" } },
  { id: "6", name: "멜론은 키위를 좋아해", subtitle: "1:1", isGroup: false, memberCount: 2, lastMessage: "감사합니다 :)", lastTime: "어제", unread: 0 },
  { id: "7", name: "공구러 모임 🛒", subtitle: "무지는 단무지, 외 12명", isGroup: true, memberCount: 13, lastMessage: "수박 소분 마감입니다", lastTime: "5/7", unread: 0, muted: true, meeting: { date: "5/9 (월)", time: "오후 8:00", place: "분당 정자동 마트 앞" } },
  { id: "8", name: "토마토킹", subtitle: "1:1", isGroup: false, memberCount: 2, lastMessage: "다음에 또 봐요!", lastTime: "5/5", unread: 0 },
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
};

export const CHAT_MESSAGES: ChatMessage[] = [
  { id: "0", nickname: "", content: "무지는 단무지님이 들어왔습니다", time: "", mine: false, date: "2026-05-08", type: "system" },
  { id: "1", nickname: "무지는 단무지", content: "안녕하세요 :D", time: "15:05", mine: false },
  { id: "2", nickname: "무지는 단무지", content: "러닝 크루 모집하시는거 맞으세요?", time: "15:05", mine: false, reactions: [{ emoji: "👍", count: 2 }] },
  { id: "3", nickname: "", content: "네 맞아요! 매주 화/목 7시예요 🏃‍♀️", time: "15:08", mine: true, read: true, date: "2026-05-09" },
  { id: "4", nickname: "감자튀김", content: "오 저도 참가하고 싶어요!", time: "15:09", mine: false, replyTo: { nickname: "무지는 단무지", content: "네 맞아요! 매주 화/목 7시예요 🏃‍♀️" } },
  { id: "5", nickname: "", content: "환영해요~", time: "15:10", mine: true, read: true, reactions: [{ emoji: "❤️", count: 1, mine: false }, { emoji: "🎉", count: 2, mine: true }] },
  { id: "6", nickname: "무지는 단무지", content: "한강 어디서 모이나요?", time: "15:11", mine: false },
  { id: "7", nickname: "", content: "반포 한강공원 8번 출구 앞이에요!", time: "15:12", mine: true, read: false, readBy: 1 },
];

export const CHAT_QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export const CHAT_MEMBERS = [
  { id: "self", nickname: "무지는 단무지", isMe: true, isHost: false },
  { id: "host", nickname: "감자튀김", isMe: false, isHost: true },
  { id: "member", nickname: "껍질은 달걀껍질", isMe: false, isHost: false },
];

export const POINT_HISTORY = [
  { id: "1", date: "26.04.08", title: "친구 초대", note: "", amount: 50 },
  { id: "2", date: "26.04.07", title: "단기 모임 참여", note: "바퀴 벌레 잡아 주실분", amount: 20 },
  { id: "3", date: "26.04.01", title: "아이템 구매", note: "노란 원목 침대", amount: -100 },
  { id: "4", date: "26.03.27", title: "아이템 구매", note: "핑크 의자", amount: -50 },
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

export const TITLES = [
  "#벌레_해결사",
  "#반찬_요정",
  "#집밥_나눔왕",
  "#전등교체_마법사",
  "#조립식가구_장인",
  "#못박기_달인",
  "#분리수거_박사",
  "#공구의_주인",
  "#맛집_네비게이터",
  "#동네_보안관",
  "#정글_집사",
  "#프로_공구러",
  "#슬기로운_혼삶",
  "#홈트_동기부여",
];

export type Badge = {
  id: string;       // badge_01 ~ badge_23
  label: string;
  condition: string;
  date?: string;    // 획득 시 날짜 존재
};

export const BADGES: Badge[] = [
  { id: "badge_01", label: "빨래 요정",      condition: "세탁 관련 게시글을 5개 이상 작성하세요.",           date: "2025.10.11" },
  { id: "badge_02", label: "장보기 달인",    condition: "공동구매 모임에 3회 이상 참여하세요.",              date: "2025.09.22" },
  { id: "badge_03", label: "분리수거 요원",  condition: "분리수거 관련 글을 5개 이상 작성하세요.",           date: "2025.08.07" },
  { id: "badge_04", label: "설거지 명수",    condition: "음식 나눔 후기를 3개 이상 작성하세요.",             date: "2025.06.30" },
  { id: "badge_05", label: "재료 손질 장인", condition: "집밥 관련 게시글을 10개 이상 작성하세요.",          date: "2025.05.10" },
  { id: "badge_06", label: "홈카페 사장님",  condition: "카페 모임에 5회 이상 참여하세요.",                  date: "2025.04.01" },
  { id: "badge_07", label: "다정한 이웃",    condition: "이웃에게 댓글을 50개 이상 달아주세요.",             date: "2025.03.15" },
  { id: "badge_08", label: "꿀잠 수호자",    condition: "출석 체크를 30일 연속 달성하세요.",                 date: "2025.02.18" },
  { id: "badge_09", label: "먼지 사냥꾼",    condition: "청소 관련 게시글을 5개 이상 작성하세요.",           date: "2025.01.20" },
  { id: "badge_10", label: "지구 지킴이",    condition: "환경 관련 모임에 3회 이상 참여하세요.",             date: "2024.12.05" },
  { id: "badge_11", label: "집밥 고수",      condition: "음식 나눔 모임에 5회 이상 참여하세요.",             date: "2024.11.11" },
  { id: "badge_12", label: "방구석 독서가",  condition: "독서 모임에 3회 이상 참여하세요.",                  date: "2024.10.10" },
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
];

export const FRIENDS = [
  { id: "2", nickname: "껍질은 달걀껍질", avatarBg: "#C7BDFF" },
  { id: "3", nickname: "감자 없는 카레", avatarBg: "#FFCFCF" },
  { id: "4", nickname: "감자튀김", avatarBg: "#FCEBB5" },
  { id: "5", nickname: "멜론은 키위", avatarBg: "#CCBCE0" },
  { id: "6", nickname: "토마토킹", avatarBg: "#DDC0FF" },
  { id: "7", nickname: "당근소년", avatarBg: "#FCEBB5" },
  { id: "8", nickname: "참치는 등푸른", avatarBg: "#C7BDFF" },
  { id: "9", nickname: "수박나라", avatarBg: "#CAE4B9" },
  { id: "10", nickname: "라면 한 봉지", avatarBg: "#FCEBB5" },
  { id: "11", nickname: "치즈볶이", avatarBg: "#FFCFCF" },
  { id: "12", nickname: "닭볶음탕수", avatarBg: "#DDC0FF" },
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
