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
    members: [p("수정"), p("도윤"), p("혜진")],
    tags: ["맛집", "먹거리", "단기성 소모임"],
  },
  {
    id: "2",
    title: "수박 소분",
    distance: "350m",
    duration: "15분",
    description: "마트에서 산 큰 수박 나눌 분~",
    members: [p("지윤"), p("정희"), p("예린"), p("민지"), p("서아"), p("은채"), p("유나")],
    totalCount: 7,
    tags: ["공동구매", "소분", "나눔", "단기성 소모임"],
  },
  {
    id: "3",
    title: "편의점 야식",
    distance: "120m",
    duration: "5분",
    description: "혼자 먹긴 많아서요 ㅎㅎ",
    members: [p("재민")],
    dim: true,
    tags: ["먹거리", "나눔", "단기성 소모임"],
  },
  {
    id: "4",
    title: "코스트코 소분",
    distance: "700m",
    duration: "50분",
    description: "코스트코에서 함께 장 보고 나눌 분~",
    members: [p("준호"), p("은채")],
    tags: ["공동구매", "소분", "나눔", "단기성 소모임"],
  },
  {
    id: "5",
    title: "러닝 메이트",
    distance: "200m",
    duration: "60분",
    description: "오늘 저녁에 같이 뛰어요!",
    members: [p("민호"), p("예린"), p("성훈"), p("서아"), p("태양")],
    totalCount: 5,
    tags: ["운동", "장기성 소모임"],
  },
  {
    id: "6",
    title: "스터디 카페",
    distance: "400m",
    duration: "120분",
    description: "조용히 공부할 분 모집해요",
    members: [p("유나"), p("현우"), p("지호")],
    tags: ["공부", "스터디", "카페", "장기성 소모임"],
  },
  {
    id: "7",
    title: "보드게임 모임",
    distance: "650m",
    duration: "90분",
    description: "할리갈리 마피아 환영해요",
    members: [p("지호"), p("재민"), p("성훈"), p("민지"), p("준호"), p("도윤")],
    totalCount: 6,
    tags: ["게임", "소통", "장기성 소모임"],
  },
  {
    id: "8",
    title: "카페 투어",
    distance: "800m",
    duration: "180분",
    description: "동네 신상 카페 같이 가요",
    members: [p("수정"), p("혜진")],
    tags: ["카페", "맛집", "단기성 소모임"],
  },
  {
    id: "9",
    title: "산책 메이트",
    distance: "150m",
    duration: "40분",
    description: "공원 한바퀴 같이 돌 분~",
    members: [p("정희"), p("철수")],
    tags: ["산책", "운동", "반려동물", "단기성 소모임"],
  },
  {
    id: "10",
    title: "독서 모임",
    distance: "550m",
    duration: "75분",
    description: "이번 주 책 같이 읽어요",
    members: [p("옥자"), p("병태"), p("정희"), p("철수")],
    tags: ["공부", "스터디", "장기성 소모임"],
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

/** 관심사와 겹치는 태그가 있는 모임을 우선으로 count 개 추천 */
export function pickRecommendedMeetups(
  interests: readonly string[],
  count: number,
  exclude?: Meetup[],
): Meetup[] {
  const excludeIds = new Set((exclude ?? []).map((m) => m.id));
  if (!interests || interests.length === 0) {
    return pickRandomMeetups(count, exclude);
  }
  const interestSet = new Set(interests);
  const scored = MEETUP_POOL
    .filter((m) => !excludeIds.has(m.id))
    .map((m) => {
      const overlap = (m.tags ?? []).filter((t) => interestSet.has(t)).length;
      return { m, overlap };
    });
  const matched = scored.filter((x) => x.overlap > 0);
  const others = scored.filter((x) => x.overlap === 0);
  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const byScore: Record<number, typeof scored> = {};
  for (const x of matched) {
    (byScore[x.overlap] = byScore[x.overlap] || []).push(x);
  }
  const scoreKeys = Object.keys(byScore).map(Number).sort((a, b) => b - a);
  const result: Meetup[] = [];
  for (const k of scoreKeys) {
    for (const x of shuffle(byScore[k])) {
      if (result.length >= count) break;
      result.push(x.m);
    }
    if (result.length >= count) break;
  }
  if (result.length < count) {
    for (const x of shuffle(others)) {
      if (result.length >= count) break;
      result.push(x.m);
    }
  }
  return result;
}
