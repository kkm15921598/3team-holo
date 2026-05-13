// 시안에서 추출한 mock 데이터 — Phase D에서 Supabase로 교체 예정

export const ME = {
  nickname: "무지는 단무지",
  level: 24,
  points: 1264,
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

// Short labels used on Board2 cards (in-card badge before the title).
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

export type Post = {
  id: string;
  category: string; // category id
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
  // Optional meetup metadata (used by Board5 publish/edit flow)
  meetupType?: string;
  eventDate?: string;
  peopleCount?: number | null;
  place?: string;
};

export const POSTS: Post[] = [
  // 자유게시판 (free)
  { id: "f1", category: "free", status: "모집중", title: "떡볶이 어디가 맛있나요?", description: "아파트 근처 분식집이 궁금해요", distance: "0m", duration: "0분", likes: 12, comments: 3, timeAgo: "33분 전", authorNickname: "껍질은 달걀껍질", authorLevel: 12 },
  { id: "f2", category: "free", status: "모집중", title: "주말에 뭐 하세요?", description: "심심한데 같이 놀 친구 구해요", distance: "0m", duration: "0분", likes: 8, comments: 2, timeAgo: "1시간 전", authorNickname: "감자 없는 카레", authorLevel: 7 },
  { id: "f3", category: "free", status: "모집중", title: "근처 카페 추천", description: "공부할 만한 조용한 카페 있나요?", distance: "0m", duration: "0분", likes: 5, comments: 1, timeAgo: "2시간 전", authorNickname: "무지는 단무지", authorLevel: 24 },

  // 공동구매 / 소분하기 (share)
  { id: "2", category: "share", status: "모집완료", title: "수박 소분", description: "마트에서 산 큰 수박 나눌 분~", distance: "350m", duration: "15분", likes: 12, comments: 2, timeAgo: "33분 전", authorNickname: "멜론은 키위를 좋아해", authorLevel: 18, peopleCount: 5 },
  { id: "6", category: "share", status: "모집중", title: "키친타올 공구해요", description: "코스트코 키친타올 같이 나눌 분", distance: "350m", duration: "15분", likes: 6, comments: 1, timeAgo: "1시간 전", authorNickname: "두부의 단단함", authorLevel: 9, peopleCount: 5 },

  // 추천해요 (recommend)
  { id: "r1", category: "recommend", status: "모집중", title: "최근에 본 영화 추천", description: "스릴러 좋아하면 꼭 보세요!", distance: "0m", duration: "0분", likes: 25, comments: 2, timeAgo: "10분 전", authorNickname: "감자튀김", authorLevel: 31 },
  { id: "r2", category: "recommend", status: "모집중", title: "근처 맛집 추천", description: "골목 안쪽에 숨은 보석 같은 가게", distance: "0m", duration: "0분", likes: 18, comments: 1, timeAgo: "30분 전", authorNickname: "포도껍질", authorLevel: 15 },

  // 게임파티 (game)
  { id: "g1", category: "game", status: "모집중", title: "보드게임 같이 해요", description: "주말 저녁 보드게임 카페 모임", distance: "150m", duration: "120분", likes: 15, comments: 2, timeAgo: "20분 전", authorNickname: "껍질은 달걀껍질", authorLevel: 12, peopleCount: 6 },
  { id: "g2", category: "game", status: "모집완료", title: "PC방 4명 모집", description: "오버워치 같이 하실 분", distance: "300m", duration: "180분", likes: 10, comments: 1, timeAgo: "1시간 전", authorNickname: "감자튀김", authorLevel: 31, peopleCount: 4 },

  // 같이 운동해요 (sport)
  { id: "3", category: "sport", status: "모집중", title: "강아지 산책친구 구해요", description: "매주 주말 한강공원 산책", distance: "200m", duration: "60분", likes: 12, comments: 1, timeAgo: "33분 전", authorNickname: "감자 없는 카레", authorLevel: 7, peopleCount: 5 },
  { id: "4", category: "sport", status: "모집중", title: "헬스장 등록 같이 해요", description: "꾸준히 운동할 동료 구해요", distance: "200m", duration: "60분", likes: 12, comments: 1, timeAgo: "33분 전", authorNickname: "두부의 단단함", authorLevel: 9, peopleCount: 5 },

  // 드라마 · 영화 (media)
  { id: "m1", category: "media", status: "모집중", title: "넷플릭스 같이 정주행", description: "주말마다 같이 정주행할 분 모집", distance: "100m", duration: "240분", likes: 14, comments: 1, timeAgo: "45분 전", authorNickname: "멜론은 키위를 좋아해", authorLevel: 18, peopleCount: 4 },

  // 맛집 & 먹거리 (food)
  { id: "1", category: "food", status: "모집중", title: "점심 번개", description: "오피스 단지 떡볶이 메이트!", distance: "500m", duration: "20분", likes: 5, comments: 3, timeAgo: "33분 전", authorNickname: "무지는 단무지", authorLevel: 24, peopleCount: 5 },
  { id: "5", category: "food", status: "모집중", title: "야식 같이 시켜요", description: "치킨 같이 시킬 분 구해요", distance: "500m", duration: "20분", likes: 5, comments: 1, timeAgo: "33분 전", authorNickname: "포도껍질", authorLevel: 15, peopleCount: 4 },

  // 도와주세요! (help)
  { id: "h1", category: "help", status: "모집중", title: "이사 짐 옮길 분", description: "오후 시간 잠깐 도와주실 분 구해요", distance: "120m", duration: "30분", likes: 3, comments: 1, timeAgo: "5분 전", authorNickname: "껍질은 달걀껍질", authorLevel: 12, peopleCount: 2 },
];

// Context-appropriate comments per post for the detail screen.
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

export const CHATROOMS = [
  { id: "1", name: "다같이 러닝해요", subtitle: "샬랄라움밤바", isGroup: true },
  { id: "2", name: "다같이 러닝해요", subtitle: "샬랄라움밤바", isGroup: false },
  { id: "3", name: "다같이 러닝해요", subtitle: "샬랄라움밤바", isGroup: true },
  { id: "4", name: "다같이 러닝해요", subtitle: "샬랄라움밤바", isGroup: false },
  { id: "5", name: "다같이 러닝해요", subtitle: "샬랄라움밤바", isGroup: true },
  { id: "6", name: "다같이 러닝해요", subtitle: "샬랄라움밤바", isGroup: false },
  { id: "7", name: "다같이 러닝해요", subtitle: "샬랄라움밤바", isGroup: true },
  { id: "8", name: "다같이 러닝해요", subtitle: "샬랄라움밤바", isGroup: false },
];

export const CHAT_MESSAGES = [
  { id: "1", nickname: "닉네임", content: "안녕하세요 :D", time: "15:08", mine: false },
  { id: "2", nickname: "닉네임", content: "러닝 크루 모집하시는거 맞으세요?", time: "15:08", mine: false },
  { id: "3", nickname: "", content: "안녕하세요 :D", time: "15:08", mine: true },
  { id: "4", nickname: "닉네임", content: "안녕하세요! 반가워요", time: "15:08", mine: false },
];

export const CHAT_MEMBERS = [
  { id: "self", nickname: "샬랄라움밤바", isMe: true, isHost: false },
  { id: "host", nickname: "무지는단무지", isMe: false, isHost: true },
  { id: "member", nickname: "감자튀김", isMe: false, isHost: false },
];

export const POINT_HISTORY = [
  { id: "p1", date: "26.04.08", title: "출석체크 보상", note: "5일 연속", amount: 30 },
  { id: "p2", date: "26.04.07", title: "댓글 작성", amount: 5 },
  { id: "p3", date: "26.04.06", title: "게시글 작성", amount: 10 },
  { id: "p4", date: "26.04.05", title: "포인트 사용", note: "스티커 구매", amount: -50 },
  { id: "p5", date: "26.04.04", title: "친구 초대", amount: 20 },
];

export const POINT_GUIDE_ONCE = [
  { label: "회원가입", value: 100 },
  { label: "프로필 사진 등록", value: 30 },
  { label: "관심 카테고리 설정", value: 30 },
];

export const POINT_GUIDE_REPEAT = [
  { label: "출석체크", value: 5 },
  { label: "게시글 작성", value: 10 },
  { label: "댓글 작성", value: 5 },
  { label: "친구 초대", value: 20 },
];

export const ATTENDANCE_DAYS = [
  { day: 1, reward: "+5P" },
  { day: 2, reward: "+5P" },
  { day: 3, reward: "+10P", illustration: true },
  { day: 4, reward: "+5P" },
  { day: 5, reward: "+10P", illustration: true },
  { day: 6, reward: "+5P" },
  { day: 7, allClear: true, reward: "+50P" },
];

export const FRIENDS = [
  { id: "fr1", nickname: "껍질은 달걀껍질", avatarBg: "#FFE6A8" },
  { id: "fr2", nickname: "감자 없는 카레", avatarBg: "#FFCACA" },
  { id: "fr3", nickname: "멜론은 키위를 좋아해", avatarBg: "#CDE7B0" },
  { id: "fr4", nickname: "두부의 단단함", avatarBg: "#D8CFFE" },
  { id: "fr5", nickname: "감자튀김", avatarBg: "#FFE6A8" },
  { id: "fr6", nickname: "포도껍질", avatarBg: "#D8CFFE" },
];

export const BADGES = [
  { id: 1, label: "첫 게시글", date: "26.04.01" },
  { id: 2, label: "5일 출석", date: "26.04.05" },
  { id: 3, label: "친구 추가", date: "26.04.07" },
  { id: 4, label: "댓글 마스터", date: "26.04.08" },
];

export const TITLES = [
  "#벌레_해결사",
  "#친절한_이웃",
  "#수다쟁이",
  "#운동러",
  "#먹방러",
  "#영화광",
];
