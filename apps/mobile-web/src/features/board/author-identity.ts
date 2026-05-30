import { getCurrentAccount } from "@/shared/stores/account-choices-store";
import { isMyNickname } from "@/shared/stores/profile-store";

/**
 * 글이 "내가 쓴 글"인지 판정 — 닉네임은 변경될 수 있으므로 전화번호(안정 식별자)를 우선한다.
 *
 * - authorPhone 이 있으면 현재 계정 phone 과 비교(닉네임을 바꿔도 정확).
 * - 레거시(전화번호 미보유) 글은 닉네임으로 폴백하되, 과거에 쓰던 닉네임까지 인정한다
 *   (isMyNickname). → 닉네임 변경 후에도 옛 글이 '내가 쓴 글'에서 사라지지 않는다.
 *
 * 닉네임 단독 비교(p.authorNickname === profile.nickname)를 쓰던 화면들이 닉네임 변경
 * 시 본인 글을 '남의 글'로 분류하던 버그(팅커벨 B 부류)의 단일 해결책.
 */
export function isMyPost(post: {
  authorPhone?: string | null;
  authorNickname: string;
}): boolean {
  const myPhone = getCurrentAccount();
  if (myPhone && post.authorPhone) return post.authorPhone === myPhone;
  return isMyNickname(post.authorNickname);
}
