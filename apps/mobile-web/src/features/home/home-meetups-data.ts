import { personaByName } from "./home-faces";
import type { Meetup } from "./home-meetup-card";

const p = (name: string) => {
  const persona = personaByName(name);
  if (!persona) throw new Error(`Unknown persona: ${name}`);
  return persona;
};

export const MEETUP_POOL: Meetup[] = [
  {
    id: "1",
    title: "점심 번개",
    distance: "500m",
    duration: "20분",
    description: "오피스 단지 떡볶이 메이트!",
    members: [p("춤추는 토끼"), p("산책하는 강아지"), p("사진찍는 사슴")],
  },
  {
    id: "2",
    title: "수박 소분",
    distance: "350m",
    duration: "15분",
    description: "마트에서 산 큰 수박 나눌 분~",
    members: [p("노래하는 햇살"), p("다정한 토끼"), p("사랑스러운 백합"), p("발랄한 코스모스"), p("산뜻한 봄"), p("반짝이는 별"), p("다정한 별빛")],
    totalCount: 7,
  },
  {
    id: "hm3",
    title: "편의점 야식",
    distance: "120m",
    duration: "5분",
    description: "혼자 먹긴 많아서요 ㅎㅎ",
    members: [p("신나는 펭귄")],
    dim: true,
  },
  {
    id: "hm4",
    title: "코스트코 소분",
    distance: "700m",
    duration: "50분",
    description: "코스트코에서 함께 장 보고 나눌 분~",
    members: [p("씩씩한 사슴"), p("반짝이는 별")],
  },
  {
    id: "hm5",
    title: "러닝 메이트",
    distance: "200m",
    duration: "60분",
    description: "오늘 저녁에 같이 뛰어요!",
    members: [p("용감한 곰"), p("사랑스러운 백합"), p("그림그리는 곰"), p("산뜻한 봄"), p("빛나는 해바라기")],
    totalCount: 5,
  },
  {
    id: "hm6",
    title: "스터디 카페",
    distance: "400m",
    duration: "120분",
    description: "조용히 공부할 분 모집해요",
    members: [p("다정한 별빛"), p("글쓰는 부엉이"), p("재밌는 너구리")],
  },
  {
    id: "hm7",
    title: "보드게임 모임",
    distance: "650m",
    duration: "90분",
    description: "할리갈리 마피아 환영해요",
    members: [p("재밌는 너구리"), p("신나는 펭귄"), p("그림그리는 곰"), p("발랄한 코스모스"), p("씩씩한 사슴"), p("산책하는 강아지")],
    totalCount: 6,
  },
  {
    id: "hm8",
    title: "카페 투어",
    distance: "800m",
    duration: "180분",
    description: "동네 신상 카페 같이 가요",
    members: [p("춤추는 토끼"), p("사진찍는 사슴")],
  },
  {
    id: "hm9",
    title: "산책 메이트",
    distance: "150m",
    duration: "40분",
    description: "공원 한바퀴 같이 돌 분~",
    members: [p("다정한 토끼"), p("책읽는 알파카")],
  },
  {
    id: "hm10",
    title: "독서 모임",
    distance: "550m",
    duration: "75분",
    description: "이번 주 책 같이 읽어요",
    members: [p("정겨운 단풍"), p("씩씩한 늑대"), p("다정한 토끼"), p("책읽는 알파카")],
  },
];

/** Fisher-Yates shuffle, returns the first `count` items */
export function pickRandomMeetups(count: number, exclude?: Meetup[]): Meetup[] {
  const excludeIds = new Set((exclude ?? []).map((m) => m.id));
  const candidates =
    excludeIds.size && MEETUP_POOL.length > count
      ? MEETUP_POOL.filter((m) => !excludeIds.has(m.id))
      : [...MEETUP_POOL];

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, count);
}
