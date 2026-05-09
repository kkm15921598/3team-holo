/**
 * HOLO 뱃지 라이브러리 — 23종
 * badge_NN.png ↔ 한글 이름 매핑
 */
import b01 from "./badge_01.png";
import b02 from "./badge_02.png";
import b03 from "./badge_03.png";
import b04 from "./badge_04.png";
import b05 from "./badge_05.png";
import b06 from "./badge_06.png";
import b07 from "./badge_07.png";
import b08 from "./badge_08.png";
import b09 from "./badge_09.png";
import b10 from "./badge_10.png";
import b11 from "./badge_11.png";
import b12 from "./badge_12.png";
import b13 from "./badge_13.png";
import b14 from "./badge_14.png";
import b15 from "./badge_15.png";
import b16 from "./badge_16.png";
import b17 from "./badge_17.png";
import b18 from "./badge_18.png";
import b19 from "./badge_19.png";
import b20 from "./badge_20.png";
import b21 from "./badge_21.png";
import b22 from "./badge_22.png";
import b23 from "./badge_23.png";

export type Badge = {
  id: string; // "badge_01" ~ "badge_23"
  name: string; // 한글 이름
  englishTitle: string; // 영문 (뱃지 이미지 안의 라벨)
  src: string; // import 된 이미지 URL
};

export const BADGES: Badge[] = [
  { id: "badge_01", name: "빨래 요정", englishTitle: "LAUNDRY DAY", src: b01 },
  { id: "badge_02", name: "장보기 달인", englishTitle: "GROCERY RUN", src: b02 },
  { id: "badge_03", name: "분리수거 요원", englishTitle: "GARBAGE DISPOSAL", src: b03 },
  { id: "badge_04", name: "설거지 명수", englishTitle: "DISHES CLOUD", src: b04 },
  { id: "badge_05", name: "재료 손질 장인", englishTitle: "MEAL PREP", src: b05 },
  { id: "badge_06", name: "홈카페 사장님", englishTitle: "COFFEE RITUAL", src: b06 },
  { id: "badge_07", name: "다정한 이웃", englishTitle: "POST BOX", src: b07 },
  { id: "badge_08", name: "꿀잠 수호자", englishTitle: "BED MAKING", src: b08 },
  { id: "badge_09", name: "먼지 사냥꾼", englishTitle: "FLOOR SWEEP", src: b09 },
  { id: "badge_10", name: "지구 지킴이", englishTitle: "RECYCLING SORT", src: b10 },
  { id: "badge_11", name: "집밥 고수", englishTitle: "HOME COOK", src: b11 },
  { id: "badge_12", name: "방구석 독서가", englishTitle: "READING NOOK", src: b12 },
  { id: "badge_13", name: "정주행의 달인", englishTitle: "TV BINGE", src: b13 },
  { id: "badge_14", name: "산책 대장", englishTitle: "WALKING DOG OUT", src: b14 },
  { id: "badge_15", name: "릴렉스 마스터", englishTitle: "SHOWER BREAK", src: b15 },
  { id: "badge_16", name: "초록 집사", englishTitle: "PLANT CARE", src: b16 },
  { id: "badge_17", name: "베이킹 마법사", englishTitle: "BAKING BATCH", src: b17 },
  { id: "badge_18", name: "꿀광 피부", englishTitle: "SKINCARE ROUTINE", src: b18 },
  { id: "badge_19", name: "오운완 실천가", englishTitle: "GYM SESSION", src: b19 },
  { id: "badge_20", name: "숙면 전문가", englishTitle: "SLEEP WELL", src: b20 },
  { id: "badge_21", name: "동네 미식가", englishTitle: "LOCAL FOODIE", src: b21 },
  { id: "badge_22", name: "동네 소통가", englishTitle: "NEIGHBOR TALK", src: b22 },
  { id: "badge_23", name: "HOLO 수호신", englishTitle: "HOLO GUARDIAN", src: b23 },
];

/** 한글 이름으로 뱃지 조회 */
export function getBadgeByName(name: string): Badge | undefined {
  return BADGES.find((b) => b.name === name);
}

/** id (badge_01 형식) 로 뱃지 조회 */
export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}
