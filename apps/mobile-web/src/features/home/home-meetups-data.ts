import type { Meetup } from "./home-meetup-card";

export const MEETUP_POOL: Meetup[] = [
  {
    id: "1",
    title: "점심 번개",
    distance: "500m",
    duration: "20분",
    description: "오피스 단지 떡볶이 메이트!",
    avatars: [
      { bg: "#F4A261", emoji: "🧑" },
      { bg: "#E76F51", emoji: "👩" },
      { bg: "#457B9D", emoji: "🧔" },
    ],
  },
  {
    id: "2",
    title: "수박 소분",
    distance: "350m",
    duration: "15분",
    description: "마트에서 산 큰 수박 나눌 분~",
    avatars: [
      { bg: "#E9C46A", emoji: "👩" },
      { bg: "#A8DADC", emoji: "🧓" },
    ],
  },
  {
    id: "3",
    title: "편의점 야식",
    distance: "120m",
    duration: "5분",
    description: "혼자 먹긴 많아서요 ㅎㅎ",
    avatars: [{ bg: "#CDB4DB", emoji: "🧑" }],
  },
  {
    id: "4",
    title: "코스트코 소분",
    distance: "700m",
    duration: "50분",
    description: "코스트코에서 함께 장 보고 나눌 분~",
    avatars: [
      { bg: "#F4A261", emoji: "👨" },
      { bg: "#2A9D8F", emoji: "👩" },
    ],
  },
  {
    id: "5",
    title: "러닝 메이트",
    distance: "200m",
    duration: "60분",
    description: "오늘 저녁에 같이 뛰어요!",
    avatars: [
      { bg: "#E76F51", emoji: "🏃" },
      { bg: "#A8DADC", emoji: "🏃" },
      { bg: "#F4A261", emoji: "💪" },
    ],
  },
  {
    id: "6",
    title: "스터디 카페",
    distance: "400m",
    duration: "120분",
    description: "조용히 공부할 분 모집해요",
    avatars: [
      { bg: "#CDB4DB", emoji: "📚" },
      { bg: "#E9C46A", emoji: "✍️" },
    ],
  },
  {
    id: "7",
    title: "보드게임 모임",
    distance: "650m",
    duration: "90분",
    description: "할리갈리 마피아 환영해요",
    avatars: [
      { bg: "#457B9D", emoji: "🎲" },
      { bg: "#E76F51", emoji: "🃏" },
      { bg: "#2A9D8F", emoji: "♟️" },
    ],
  },
  {
    id: "8",
    title: "카페 투어",
    distance: "800m",
    duration: "180분",
    description: "동네 신상 카페 같이 가요",
    avatars: [
      { bg: "#F4A261", emoji: "☕" },
      { bg: "#CDB4DB", emoji: "🥐" },
    ],
  },
  {
    id: "9",
    title: "산책 메이트",
    distance: "150m",
    duration: "40분",
    description: "공원 한바퀴 같이 돌 분~",
    avatars: [
      { bg: "#A8DADC", emoji: "🚶" },
      { bg: "#E9C46A", emoji: "🐕" },
    ],
  },
  {
    id: "10",
    title: "독서 모임",
    distance: "550m",
    duration: "75분",
    description: "이번 주 책 같이 읽어요",
    avatars: [
      { bg: "#CDB4DB", emoji: "📖" },
      { bg: "#457B9D", emoji: "📕" },
    ],
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
