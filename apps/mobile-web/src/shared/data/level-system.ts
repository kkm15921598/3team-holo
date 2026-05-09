/**
 * HOLO 레벨 / 경험치 시스템
 * - 만렙: 30 (추후 업데이트로 확장)
 * - 1~10 레벨까지는 빠른 레벨업 구간 (유저 유치)
 * - 1레벨 경험치는 5 → 가입+접속만 해도 즉시 레벨업
 * - 튜토리얼 + 동네 인증 → 3레벨 / 첫 글 → 5레벨 / 접속만 한 달 → 20레벨
 */

/** 레벨업에 필요한 누적 경험치 (LEVEL_XP[level]) */
export const LEVEL_XP: Record<number, number> = {
  1: 5,
  2: 10,
  3: 10,
  4: 20,
  5: 20,
  6: 30,
  7: 30,
  8: 40,
  9: 40,
  10: 50,
  11: 50,
  12: 60,
  13: 70,
  14: 80,
  15: 90,
  16: 100,
  17: 110,
  18: 120,
  19: 130,
  20: 140,
  21: 150,
  22: 200,
  23: 250,
  24: 300,
  25: 350,
  26: 400,
  27: 500,
  28: 600,
  29: 750,
  30: 900,
};

export const MAX_LEVEL = 30;

/** 행위별 경험치 보상 */
export const XP_REWARDS = {
  /** 첫 가입 + 접속 (튜토리얼) */
  signup: 5,
  /** 일일 접속 */
  dailyLogin: 5,
  /** 첫 가구 배치 */
  firstFurniturePlace: 10,
  /** 첫 글 작성 */
  firstPost: 20,
  /** 동네 인증 (위치 인증) */
  neighborhoodVerify: 10,
  /** 게시판에 글쓰기 (1건) */
  boardPost: 5,
  /** 게시판에 댓글 달기 (1건) */
  boardComment: 1,
  /** 단발성 모임 참여 */
  oneTimeMeetup: 20,
  /** 장기성 모임 참여 (건당) */
  recurringMeetup: 20,
  /** 친구 초대 가입 시 (마케팅용) */
  inviteFriend: 50,
} as const;

export type XpRewardKey = keyof typeof XP_REWARDS;

/** 일일 경험치 적립 한도 (글 5개 / 댓글 5개 = 30 XP) */
export const DAILY_XP_CAP = 30;

/** 적립 캡 안내 문구 */
export const DAILY_XP_NOTE =
  "글쓰기·댓글 작성 자체에는 제한이 없지만, 하루 30 XP 까지만 경험치 적립이 됩니다 (글 5개 + 댓글 5개 기준).";

/** 누적 경험치를 받아 현재 레벨, 현재 레벨에서의 진행도, 다음 레벨까지 남은 XP 를 반환 */
export function getLevelInfo(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number; // 0..1
} {
  let remaining = Math.max(0, totalXp);
  let level = 1;
  while (level < MAX_LEVEL && remaining >= LEVEL_XP[level]) {
    remaining -= LEVEL_XP[level];
    level += 1;
  }
  const nextLevelXp = level >= MAX_LEVEL ? LEVEL_XP[MAX_LEVEL] : LEVEL_XP[level];
  const currentLevelXp = level >= MAX_LEVEL ? nextLevelXp : remaining;
  const progress = nextLevelXp > 0 ? Math.min(1, currentLevelXp / nextLevelXp) : 1;
  return { level, currentLevelXp, nextLevelXp, progress };
}

/** 단일 행위에 대한 보상을 dailyEarned 캡 안에서 적용 가능한 금액으로 환산 */
export function applyDailyCap(reward: number, dailyEarned: number): number {
  const remaining = Math.max(0, DAILY_XP_CAP - dailyEarned);
  return Math.min(reward, remaining);
}
