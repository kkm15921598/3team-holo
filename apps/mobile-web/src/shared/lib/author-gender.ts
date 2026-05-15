/**
 * 닉네임으로 작성자의 성별("M" | "F")을 결정한다.
 *
 * 1) PERSONAS 에 등록된 닉네임이면 그 persona 의 face 경로로 판정
 *    (`/woman/...` → F, `/man/...` → M)
 * 2) 그 외 닉네임은 문자열 해시 mod 2 로 결정적 fallback — 같은 닉네임은 항상 같은 성별
 *
 * Phase D에서 Supabase 의 user 테이블 gender 컬럼으로 교체될 예정.
 */
import { personaByName } from "@/features/home/home-faces";

export type AuthorGender = "M" | "F";

export function getAuthorGender(nickname: string): AuthorGender {
  const persona = personaByName(nickname);
  if (persona) {
    if (persona.face.includes("/woman/")) return "F";
    if (persona.face.includes("/man/")) return "M";
  }
  // 해시 기반 결정적 fallback
  let h = 0;
  for (let i = 0; i < nickname.length; i++) {
    h = (h * 31 + nickname.charCodeAt(i)) >>> 0;
  }
  return h % 2 === 0 ? "M" : "F";
}
