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
  { id: "free", label: "자유게시판" },
  { id: "share", label: "공동구매 / 소분하기" },
  { id: "recommend", label: "추천해요" },
  { id: "game", label: "게임파티" },
  { id: "sport", label: "같이 운동해요" },
  { id: "media", label: "드라마 · 영화" },
  { id: "food", label: "맛집 & 먹거리" },
  { id: "help", label: "도와주세요!" },
] as const;

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
};

export const POSTS: Post[] = [
  { id: "1", category: "food", status: "모집중", title: "점심 번개", description: "오피스 단지 떡볶이 메이트!", distance: "500m", duration: "20분", likes: 5, comments: 3, timeAgo: "33분 전", authorNickname: "무지는 단무지", authorLevel: 24 },
  { id: "2", category: "share", status: "모집완료", title: "수박 소분", description: "마트에서 산 큰 수박 나눌 분~", distance: "350m", duration: "15분", likes: 12, comments: 7, timeAgo: "33분 전", authorNickname: "무지는 단무지", authorLevel: 24 },
  { id: "3", category: "sport", status: "모집중", title: "강아지 산책친구 구해요", description: "매주 주말 한강공원 산책", distance: "200m", duration: "60분", likes: 12, comments: 7, timeAgo: "33분 전", authorNickname: "무지는 단무지", authorLevel: 24 },
  { id: "4", category: "sport", status: "모집중", title: "헬스장 등록 같이 해요", description: "마트에서 산 큰 수박 나눌 분", distance: "200m", duration: "60분", likes: 12, comments: 7, timeAgo: "33분 전", authorNickname: "무지는 단무지", authorLevel: 24 },
  { id: "5", category: "food", status: "모집중", title: "점심 번개", description: "오피스 단지 떡볶이 메이트!", distance: "500m", duration: "20분", likes: 5, comments: 2, timeAgo: "33분 전", authorNickname: "무지는 단무지", authorLevel: 24 },
  { id: "6", category: "share", status: "모집완료", title: "수박 소분", description: "마트에서 산 큰 수박 나눌 분", distance: "350m", duration: "15분", likes: 12, comments: 7, timeAgo: "33분 전", authorNickname: "무지는 단무지", authorLevel: 24 },
];

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

export const BADGES = [
  { id: 1, label: "미식가", date: "2025.10.11" },
  { id: 2, label: "다정한 이웃", date: "2025.09.22" },
  { id: 3, label: "집밥 고수", date: "2025.08.07" },
  { id: 4, label: "골목 대장", date: "2025.06.30" },
  { id: 5, label: "이웃 친구", date: "2025.05.10" },
  { id: 6, label: "동네 명사", date: "2025.04.01" },
  { id: 7, label: "탐험가", date: "2025.03.15" },
  { id: 8, label: "산책 메이트", date: "2025.02.18" },
  { id: 9, label: "수다왕", date: "2025.01.20" },
  { id: 10, label: "리뷰어", date: "2024.12.05" },
  { id: 11, label: "단골", date: "2024.11.11" },
  { id: 12, label: "초대장인", date: "2024.10.10" },
];

export const FRIENDS = [
  { id: "1", nickname: "무지는 단무지", avatarBg: "#FCEBB5" },
  { id: "2", nickname: "껍질은 달걀껍질", avatarBg: "#C7BDFF" },
  { id: "3", nickname: "감자 없는 카레", avatarBg: "#FFCFCF" },
  { id: "4", nickname: "껍질은 달걀껍질", avatarBg: "#FCEBB5" },
  { id: "5", nickname: "무지는 단무지", avatarBg: "#CCBCE0" },
  { id: "6", nickname: "껍질은 달걀껍질", avatarBg: "#DDC0FF" },
  { id: "7", nickname: "무지는 단무지", avatarBg: "#FCEBB5" },
  { id: "8", nickname: "껍질은 달걀껍질", avatarBg: "#C7BDFF" },
  { id: "9", nickname: "감자 없는 카레", avatarBg: "#CAE4B9" },
  { id: "10", nickname: "껍질은 달걀껍질", avatarBg: "#FCEBB5" },
  { id: "11", nickname: "무지는 단무지", avatarBg: "#FFCFCF" },
  { id: "12", nickname: "껍질은 달걀껍질", avatarBg: "#DDC0FF" },
];

export const ATTENDANCE_DAYS = [
  { day: 1, reward: "500P" },
  { day: 2, illustration: true },
  { day: 3 },
  { day: 4, reward: "500P" },
  { day: 5 },
  { day: 6 },
  { day: 7, reward: "500P" },
  { day: 8, allClear: true, reward: "1500P" },
];
