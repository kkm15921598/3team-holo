/**
 * 닉네임으로 작성자의 성별("M" | "F")과 출생연도/나이를 결정한다.
 *
 * 성별:
 * 1) PERSONAS 에 등록된 닉네임이면 그 persona 의 face 경로로 판정
 *    (`/woman/...` → F, `/man/...` → M)
 * 2) 그 외 닉네임은 문자열 해시 mod 2 로 결정적 fallback — 같은 닉네임은 항상 같은 성별
 *
 * 나이:
 *   본인인증으로 가입 시 출생연도가 결정된다는 가정하에, 닉네임 해시로 출생연도를
 *   결정적으로 산출. 나이는 매번 (오늘 연도 - 출생연도) 로 계산되므로 해가 바뀌면
 *   자동으로 한 살 더 든다. 출생연도는 "지금 시점 기준 10~79세" 범위로 분포시킨다.
 *
 * Phase D에서 Supabase 의 user 테이블 gender/birth_year 컬럼으로 교체될 예정.
 */
import { personaByName } from "@/features/home/home-faces";

export type AuthorGender = "M" | "F";

/** 같은 닉네임에 대해 항상 같은 32bit unsigned 해시를 돌려준다 (FNV-1a) */
function hashNickname(nickname: string): number {
  let h = 2166136261;
  for (let i = 0; i < nickname.length; i++) {
    h ^= nickname.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getAuthorGender(nickname: string): AuthorGender {
  const persona = personaByName(nickname);
  if (persona) {
    if (persona.face.includes("/woman/")) return "F";
    if (persona.face.includes("/man/")) return "M";
  }
  // 해시 기반 결정적 fallback — 같은 닉네임은 항상 같은 성별
  return hashNickname(nickname) % 2 === 0 ? "M" : "F";
}

/**
 * 출생연도 — 닉네임 해시로 결정적으로 산출.
 * 분포 기준은 2026년 시점 "10세 ~ 79세" (70개 연령 버킷).
 * 출생연도 자체는 고정값이므로 시간이 흘러도 변하지 않고, 실제 나이는 getAuthorAge() 가 계산.
 */
const BIRTH_ANCHOR_YEAR = 2026;
const BIRTH_AGE_MIN = 10;
const BIRTH_AGE_RANGE = 70; // 10 ~ 79

export function getAuthorBirthYear(nickname: string): number {
  const ageAtAnchor =
    BIRTH_AGE_MIN + (hashNickname(nickname) % BIRTH_AGE_RANGE);
  return BIRTH_ANCHOR_YEAR - ageAtAnchor;
}

/**
 * 현재 시점의 만 나이(연 단위 단순 계산).
 * 정확한 생일 기준 만 나이는 아니지만, 데모용으로 "해가 바뀌면 +1" 효과를 위해 충분.
 * Phase D 에서 실제 생일 데이터로 교체 시 정확한 만 나이 계산으로 변경.
 */
export function getAuthorAge(nickname: string): number {
  return new Date().getFullYear() - getAuthorBirthYear(nickname);
}

/**
 * 검색 필터 라벨("10대" / "20대" / "30대" / "40대 이상") 을 나이 범위로 매핑.
 * - "10대" → [10, 19]
 * - "20대" → [20, 29]
 * - "30대" → [30, 39]
 * - "40대 이상" → [40, Infinity]  (50대·60대·70대 모두 포함)
 * 알 수 없는 라벨이면 null 반환 — 호출 측에서 필터를 건너뛰면 됨.
 */
export function ageRangeForFilterLabel(
  label: string,
): [number, number] | null {
  const m = label.match(/^(\d+)대(\s*이상)?$/);
  if (!m) return null;
  const lower = Number(m[1]);
  if (m[2]) return [lower, Number.POSITIVE_INFINITY];
  return [lower, lower + 9];
}

/**
 * timeAgo("방금 전", "N분 전", "N일 전", "N주 전", "N개월 전", "N년 전") 를
 * 해석해 글이 작성된 "연도" 를 추정한다. 분/시간/일은 모두 현재 연도로 간주
 * (한 해 안의 차이라 연도 변화 없음). 주/개월/년 단위는 해당 만큼 뺀 날짜의 연도.
 */
function postYearFromTimeAgo(
  timeAgo: string | undefined,
  now: Date = new Date(),
): number {
  if (!timeAgo) return now.getFullYear();
  if (/방금/.test(timeAgo)) return now.getFullYear();
  // "N년 전" 먼저 매칭 (그 외 단위와 우선순위 분리)
  const yearMatch = timeAgo.match(/(\d+)\s*년/);
  if (yearMatch) return now.getFullYear() - Number(yearMatch[1]);
  const monthMatch = timeAgo.match(/(\d+)\s*개월/);
  if (monthMatch) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - Number(monthMatch[1]));
    return d.getFullYear();
  }
  const weekMatch = timeAgo.match(/(\d+)\s*주/);
  if (weekMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() - Number(weekMatch[1]) * 7);
    return d.getFullYear();
  }
  // 분/시간/일 단위는 모두 같은 연도로 처리
  return now.getFullYear();
}

/**
 * 작성 시점의 작성자 나이.
 * = (글이 쓰인 연도) - (작성자 출생연도)
 *
 * 글이 한 번 쓰이면 그 시점 나이는 영구적으로 고정된다. 즉 19살에 쓴 글은
 * 작성자가 20세가 돼도 여전히 "10대 필터" 에 그대로 남는다. 이는 "글 자체에
 * 작성자의 당시 나이가 묻혀 있다" 는 정책을 단순 mock 으로 재현한 것.
 */
export function getAuthorAgeAtPost(
  nickname: string,
  timeAgo: string | undefined,
): number {
  return postYearFromTimeAgo(timeAgo) - getAuthorBirthYear(nickname);
}
