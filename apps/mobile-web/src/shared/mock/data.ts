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
  { day: 5, points: 25, checked: false, isToday: false },
  { day: 6, points: 5,  checked: false, isToday: false },
  { day: 7, points: 55, checked: false, isToday: false, label: "전체보너스" },
];

export const ATTENDANCE_STREAK = 20; // 연속 출석일 수
