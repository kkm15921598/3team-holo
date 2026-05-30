/**
 * 모임 일정까지 남은 일수(D-day) 계산. KST 로컬 날짜(자정 기준)로 계산한다.
 * eventDate 는 "YYYY-MM-DD". 일정 미정/형식오류면 null.
 */
export type Dday = {
  /** 표시 라벨: "D-3" / "D-DAY" / "종료" */
  label: string;
  /** 남은 일수(오늘=0, 미래>0, 지남<0) */
  daysLeft: number;
  isToday: boolean;
  isPast: boolean;
};

export function meetupDday(eventDate?: string | null): Dday | null {
  if (!eventDate) return null;
  const parts = String(eventDate).split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  const target = new Date(y, m - 1, d);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLeft = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  const isToday = daysLeft === 0;
  const isPast = daysLeft < 0;
  return {
    label: isPast ? "종료" : isToday ? "D-DAY" : `D-${daysLeft}`,
    daysLeft,
    isToday,
    isPast,
  };
}
