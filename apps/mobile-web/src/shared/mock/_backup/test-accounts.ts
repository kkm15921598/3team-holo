/**
 * 테스트 계정 mock — 로그인 / 아이디 찾기 / 비밀번호 찾기 등에서 공유.
 * Phase D에서 Supabase 인증으로 교체 예정.
 */
import type { Gender } from "@/shared/stores/verification-store";
import type { PlacedFurniture } from "@/features/myroom/myroom-data";

/** 테스트 계정 로그인 시 모든 store 에 시드할 mock 데이터 */
export type AccountSeedData = {
  level: number;
  /** 실제 획득한 뱃지 id 리스트 — 마이페이지에서 활성으로 보이는 항목 */
  acquiredBadgeIds: string[];
  /** 실제 획득한 칭호 리스트 */
  acquiredTitles: string[];
  points: number;
  /** 참여한 모임 post id 들 */
  joinedPostIds: string[];
  /** 좋아요 누른 post id 들 */
  likedPostIds: string[];
  /** 최근 본 글 (가장 최근이 0번) */
  viewedPostIds: string[];
  /** 작성한 댓글 — postId 와 content 만 지정, nickname 은 자동 채움 */
  comments: Array<{ id: string; postId: string; content: string; timeAgo: string; parentId?: string }>;
  /** 작성한 게시글 — postsStore.prepend 로 추가됨 */
  authoredPosts: Array<{
    id: string;
    category: string;
    status: "모집중" | "모집완료";
    title: string;
    description: string;
    distance: string;
    duration: string;
    likes: number;
    comments: number;
    timeAgo: string;
    authorLevel: number;
    meetupType?: string;
    peopleCount?: number | null;
    place?: string;
  }>;
};

export type TestAccount = {
  phone: string;
  password: string;
  name: string;
  gender: Gender;
  /** 아이디 찾기 결과로 노출되는 사용자 아이디 */
  id: string;
  joinedAt: string;
  /** 닉네임 — 회원가입 닉네임 추천기와 같은 (형용사 + 명사) 톤 */
  nickname: string;
  /** 장착 칭호 — mock/data.ts TITLES 중 하나 */
  title: string;
  /** 장착 뱃지 id — badge_01 ~ badge_23 */
  equippedBadgeId: string;
  /** 친구 추가용 고유 ID (5자 영숫자). 계정마다 다르고 친구추가 QR 화면에 노출된다. */
  friendCode: string;
  /** 프로필 얼굴 URL — 계정별로 고정 얼굴을 지정. 없으면 성별 기본 얼굴 사용. */
  profileFace?: string;
  /** 마이룸 가구 배치 — 계정별 컨셉으로 미리 꾸며둔 룸 */
  myroomItems: PlacedFurniture[];
  /** 마이룸 상태 메시지 (말풍선) */
  statusMessage: string;
  /** 로그인 시 데모 데이터로 store 들을 시드하는 mock — 없으면 시드 안 함 */
  seedData?: AccountSeedData;
};

export const TEST_ACCOUNTS: Record<string, TestAccount> = {
  "01012341234": {
    phone: "01012341234",
    password: "test1234",
    name: "김민준",
    gender: "M",
    id: "test1234",
    joinedAt: "2026.05.15",
    nickname: "다정한 바리스타",
    title: "#홈트_동기부여",
    equippedBadgeId: "badge_06", // 홈카페 사장님
    friendCode: "bri07",
    // 성인 남자 풀(man/man) 중 [1] — 웨이브 갈색머리 청년
    profileFace: encodeURI(
      "/illustrations/icons_face/man/man/Gemini_Generated_Image_2yfg492yfg492yfg 5.png",
    ),
    // 홈카페 톤 — 원목 유리 책장 + 노란 1인 소파 + 미니 책상 + 원목 스탠드 조명 + 포스터 액자
    // 배열 순서가 곧 z-order 이므로 조명을 마지막에 두어 책상 위로 렌더.
    myroomItems: [
      // 뒷벽 포스터 액자 세트 (Lv.5 해금)
      { id: "wall-m1", kind: "wall", variant: "03", flipped: false, x: 110, y: 30, width: 75 },
      // 좌측 원목 유리 책장 — 바닥에 닿도록 y 내림
      { id: "bookshelf-m1", kind: "bookshelf", variant: "02", flipped: false, x: 60, y: 140, width: 70 },
      // 중앙 좌측 노란 1인 소파
      { id: "chair-m1", kind: "chair", variant: "02", flipped: false, x: 140, y: 200, width: 58 },
      // 우측 원목 미니 책상 (Lv.7 해금)
      { id: "desk-m1", kind: "desk", variant: "04", flipped: true, x: 240, y: 190, width: 80 },
      // 책상 위 원목 스탠드 조명 — 책상 상판에 얹히도록 y 를 170 으로 조정
      { id: "lighting-m1", kind: "lighting", variant: "01", flipped: false, x: 265, y: 170, width: 22 },
    ],
    statusMessage: "내가 좋아하는 카페는 우리집 ☕",
    seedData: {
      level: 7,
      // 6개 — 가입 시 자동 발급되는 badge_24(홀로 입주자) + 운동·홈오피스 컨셉 + 장착 중인 badge_19
      acquiredBadgeIds: ["badge_24", "badge_06", "badge_08", "badge_14", "badge_15", "badge_19"],
      // 10개 — 가입 시 자동 발급되는 #홀로_입주자 + 홈트·홈오피스 컨셉 일반 칭호 9개
      acquiredTitles: [
        "#홀로_입주자",
        "#홈트_동기부여",
        "#운동메이트",
        "#슬기로운_혼삶",
        "#공구의_주인공",
        "#못박기_달인",
        "#조립식가구_장인",
        "#전등교체_마법사",
        "#분리수거_박사",
        "#동네_보안관",
      ],
      points: 1000,
      // 참여한 모임 4 — 운동 진행중 2개 + 종료된 모임 2개 (end-sp1, end-sp2)
      joinedPostIds: ["sp11", "sp14", "end-sp1", "end-sp2"],
      // 좋아요 8
      likedPostIds: ["hm3", "hm5", "hm7", "sp11", "sp14", "sp16", "fd14", "r13"],
      // 최근 본 게시물 13 (앞이 가장 최근)
      viewedPostIds: [
        "hm5", "sp11", "sp12", "sp14", "gm11",
        "hm3", "hm7", "fd14", "r13", "sp16",
        "fd12", "g2", "hp11",
      ],
      // 댓글 5
      comments: [
        { id: "m-c1", postId: "hm5", content: "페이스 얼마나 되세요?", timeAgo: "10분 전" },
        { id: "m-c2", postId: "sp11", content: "주말 테니스 좋아요!", timeAgo: "30분 전" },
        { id: "m-c3", postId: "sp12", content: "토요일 풋살 합류 가능합니다.", timeAgo: "1시간 전" },
        { id: "m-c4", postId: "gm11", content: "골드 듀오 가능합니다.", timeAgo: "2시간 전" },
        { id: "m-c5", postId: "hm3", content: "라면도 같이 시키실래요?", timeAgo: "어제" },
      ],
      // 작성한 게시글 3 — 운동·홈트 컨셉
      authoredPosts: [
        {
          id: "seed-m1",
          category: "sport",
          status: "모집중",
          title: "홈트 메이트 구해요",
          description: "주 3회 같이 운동 인증할 분 찾아요!",
          distance: "0m",
          duration: "60분",
          likes: 2,
          comments: 0,
          timeAgo: "3시간 전",
          authorLevel: 7,
          meetupType: "장기성 모임",
          peopleCount: 4,
          place: "분당 내 홈트",
        },
        {
          id: "seed-m2",
          category: "sport",
          status: "모집중",
          title: "저녁 러닝 같이 해요",
          description: "탄천에서 저녁 8시 출발!",
          distance: "300m",
          duration: "60분",
          likes: 9,
          comments: 0,
          timeAgo: "1일 전",
          authorLevel: 7,
          meetupType: "단기성 모임",
          peopleCount: 6,
          place: "탄천 산책로",
        },
        {
          id: "seed-m3",
          category: "recommend",
          status: "모집중",
          title: "단백질 셰이크 추천",
          description: "입에 잘 맞는 단백질 셰이크 공유해요",
          distance: "0m",
          duration: "0분",
          likes: 0,
          comments: 0,
          timeAgo: "2일 전",
          authorLevel: 7,
        },
      ],
    },
  },
  "01012345678": {
    phone: "01012345678",
    password: "test1234",
    name: "김서연",
    gender: "F",
    id: "test1234",
    joinedAt: "2026.05.08",
    nickname: "달콤한 무지",
    title: "#맛집_네비게이터",
    equippedBadgeId: "badge_21", // 동네 미식가
    friendCode: "ajhd5",
    // 라일락·핑크 톤 — 책상 + 의자만. 좌표는 floorTopY 기준으로 산정.
    myroomItems: [
      { id: "desk-w1", kind: "desk", variant: "01", flipped: false, x: 117, y: 135, width: 107 },
      { id: "chair-w1", kind: "chair", variant: "01", flipped: true, x: 248, y: 188, width: 55 },
    ],
    statusMessage: "디저트 메이트 환영해요 🍰",
    seedData: {
      level: 12,
      // 19개 — 가입 시 자동 발급되는 badge_24(홀로 입주자) + badge_01 ~ badge_17 + 장착 중인 badge_21
      acquiredBadgeIds: [
        "badge_24",
        "badge_01", "badge_02", "badge_03", "badge_04", "badge_05",
        "badge_06", "badge_07", "badge_08", "badge_09", "badge_10",
        "badge_11", "badge_12", "badge_13", "badge_14", "badge_15",
        "badge_16", "badge_17", "badge_21",
      ],
      // 16개 — 가입 #홀로_입주자 + 맛집·디저트 컨셉의 일반 칭호 15개
      acquiredTitles: [
        "#홀로_입주자",
        "#맛집_네비게이터",
        "#집밥_나눔왕",
        "#오늘은_내가요리사",
        "#냉장고_탐험가",
        "#배달비_절약러",
        "#공구의_주인공",
        "#소분_마스터",
        "#슬기로운_혼삶",
        "#프로_공구러",
        "#분리수거_박사",
        "#동네_보안관",
        "#조립식가구_장인",
        "#전등교체_마법사",
        "#못박기_달인",
        "#홈트_동기부여",
      ],
      points: 1000,
      // 참여한 모임 9 — 진행중 4개(맛집·먹거리/공구/미디어) + 종료된 모임 5개.
      // f1(자유게시판 — 모임 메타 없음)은 모임 채팅 대상이 아니므로 제외.
      joinedPostIds: [
        "hm3", "fd11", "sh11", "md11",
        "end-fd1", "end-fd2", "end-sh1", "end-md1", "end-fd3",
      ],
      // 좋아요 10
      likedPostIds: [
        "hm3", "hm4", "hm8", "hm10",
        "fd11", "fd13", "fd15", "fd16",
        "r13", "r14",
      ],
      // 최근 본 게시물 20
      viewedPostIds: [
        "hm3", "hm4", "hm8", "fd11", "fd13",
        "fd15", "fd16", "sh11", "sh13", "sh15",
        "hm10", "md11", "md12", "md14", "md15",
        "r13", "r14", "f1", "f2", "f12",
      ],
      // 댓글 28 — 다양한 게시글에 분산
      comments: [
        { id: "w-c1", postId: "hm3", content: "어느 편의점이세요? 같이 가요!", timeAgo: "5분 전" },
        { id: "w-c2", postId: "hm3", content: "라면도 좋고 컵라면도 좋아요", timeAgo: "12분 전" },
        { id: "w-c3", postId: "hm4", content: "휴지 같이 나누고 싶어요", timeAgo: "30분 전" },
        { id: "w-c4", postId: "hm4", content: "코스트코 몇 시 출발이세요?", timeAgo: "45분 전" },
        { id: "w-c5", postId: "hm8", content: "신상 카페 어디인가요?", timeAgo: "1시간 전" },
        { id: "w-c6", postId: "hm8", content: "저도 같이 갈래요!", timeAgo: "1시간 전" },
        { id: "w-c7", postId: "hm10", content: "어떤 책 읽나요?", timeAgo: "2시간 전" },
        { id: "w-c8", postId: "hm10", content: "독서 모임 처음인데 환영해주세요 :)", timeAgo: "2시간 전" },
        { id: "w-c9", postId: "fd11", content: "마라탕 좋아해요!", timeAgo: "3시간 전" },
        { id: "w-c10", postId: "fd13", content: "주말 브런치 좋아요", timeAgo: "3시간 전" },
        { id: "w-c11", postId: "fd13", content: "라이크라이크 카페 가본 곳이에요!", timeAgo: "4시간 전" },
        { id: "w-c12", postId: "fd15", content: "초밥 진짜 좋아해요", timeAgo: "5시간 전" },
        { id: "w-c13", postId: "fd15", content: "몇 시 출발이세요?", timeAgo: "5시간 전" },
        { id: "w-c14", postId: "sh11", content: "딸기 박스 같이 나눠요!", timeAgo: "6시간 전" },
        { id: "w-c15", postId: "sh13", content: "참외 좋아해요. 합류할게요.", timeAgo: "7시간 전" },
        { id: "w-c16", postId: "sh15", content: "샴푸 박스 정보 감사해요", timeAgo: "8시간 전" },
        { id: "w-c17", postId: "sp13", content: "필라테스 메이트 좋아요!", timeAgo: "10시간 전" },
        { id: "w-c18", postId: "md12", content: "마블 시리즈 정주행 좋아요", timeAgo: "어제" },
        { id: "w-c19", postId: "md14", content: "공포영화는 같이 봐야 재밌어요", timeAgo: "어제" },
        { id: "w-c20", postId: "md15", content: "디플 결제 합류할게요", timeAgo: "어제" },
        { id: "w-c21", postId: "f1", content: "OO분식집이 진짜 맛있어요", timeAgo: "1일 전" },
        { id: "w-c22", postId: "f2", content: "저도 주말에 시간 비어요!", timeAgo: "1일 전" },
        { id: "w-c23", postId: "r1", content: "스릴러 좋아해요, 제목 알려주세요!", timeAgo: "2일 전" },
        { id: "w-c24", postId: "r2", content: "그 가게 위치 좀 부탁드려요~", timeAgo: "2일 전" },
        { id: "w-c25", postId: "f12", content: "공원 야간 개방 시간 궁금했어요", timeAgo: "2일 전" },
        { id: "w-c26", postId: "1", content: "떡볶이 진짜 좋아해요!", timeAgo: "3일 전" },
        { id: "w-c27", postId: "1", content: "같이 가요!", timeAgo: "3일 전" },
        { id: "w-c28", postId: "hm6", content: "조용한 자리 있는 카페면 좋겠어요", timeAgo: "4일 전" },
      ],
      // 작성한 게시글 7 — 카페·디저트 컨셉
      authoredPosts: [
        {
          id: "seed-w1",
          category: "food",
          status: "모집중",
          title: "브런치 메이트 구해요",
          description: "주말 브런치 같이 가실 분~",
          distance: "200m",
          duration: "90분",
          likes: 16,
          comments: 18,
          timeAgo: "2시간 전",
          authorLevel: 12,
          meetupType: "단기성 모임",
          peopleCount: 4,
          place: "정자동 브런치 카페",
        },
        {
          id: "seed-w2",
          category: "recommend",
          status: "모집중",
          title: "디저트 맛집 추천",
          description: "분당에서 진짜 맛있는 디저트집 공유해요",
          distance: "0m",
          duration: "0분",
          likes: 18,
          comments: 0,
          timeAgo: "4시간 전",
          authorLevel: 12,
        },
        {
          id: "seed-w3",
          category: "food",
          status: "모집중",
          title: "동네 신상 카페",
          description: "정자동 신상 카페 같이 가실 분",
          distance: "350m",
          duration: "120분",
          likes: 2,
          comments: 0,
          timeAgo: "6시간 전",
          authorLevel: 12,
          meetupType: "단기성 모임",
          peopleCount: 3,
          place: "정자동 신상 카페",
        },
        {
          id: "seed-w4",
          category: "share",
          status: "모집중",
          title: "홈카페 도구 공구",
          description: "에스프레소 머신 공구하실 분",
          distance: "400m",
          duration: "30분",
          likes: 19,
          comments: 0,
          timeAgo: "1일 전",
          authorLevel: 12,
          meetupType: "단기성 모임",
          peopleCount: 4,
        },
        {
          id: "seed-w5",
          category: "food",
          status: "모집중",
          title: "베이커리 투어",
          description: "분당 베이커리 3곳 투어 같이 해요",
          distance: "600m",
          duration: "180분",
          likes: 0,
          comments: 0,
          timeAgo: "2일 전",
          authorLevel: 12,
          meetupType: "단기성 모임",
          peopleCount: 5,
        },
        {
          id: "seed-w6",
          category: "recommend",
          status: "모집중",
          title: "라떼 맛있는 카페",
          description: "정자동 라떼 맛집 공유해요",
          distance: "0m",
          duration: "0분",
          likes: 3,
          comments: 1,
          timeAgo: "3일 전",
          authorLevel: 12,
        },
        {
          id: "seed-w7",
          category: "food",
          status: "모집완료",
          title: "주말 케이크 모임",
          description: "케이크 클래스 같이 들으실 분",
          distance: "500m",
          duration: "150분",
          likes: 5,
          comments: 2,
          timeAgo: "5일 전",
          authorLevel: 12,
          meetupType: "단기성 모임",
          peopleCount: 4,
          place: "정자동 베이킹 스튜디오",
        },
      ],
    },
  },
};


export function findAccountByNameAndPhone(name: string, phone: string): TestAccount | undefined {
  const trimmed = name.trim();
  return Object.values(TEST_ACCOUNTS).find(
    (a) => a.name === trimmed && a.phone === phone,
  );
}
