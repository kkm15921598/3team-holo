// 1:1 (DM) 채팅방의 결정론적 ID 헬퍼.
//
// 기존엔 `f${friendId}-${Date.now()}` 처럼 클라이언트별로 유일한 ID를 만들어
// 두 사용자가 서로 다른 room_id 로 메시지를 주고받아 한쪽도 못 보는 버그가 있었다.
// 두 사용자의 phone 을 정렬 결합해 동일한 room_id 를 갖도록 보장한다.

import { supabase } from "@/shared/lib/supabaseClient";

export const DM_ROOM_PREFIX = "dm-";

/** 두 phone 을 정렬해 결합한 결정론적 DM room_id 를 반환. */
export function dmRoomIdFor(phoneA: string, phoneB: string): string {
  const sorted = [phoneA, phoneB].sort();
  return `${DM_ROOM_PREFIX}${sorted[0]}-${sorted[1]}`;
}

/**
 * 1:1 방인지 판정.
 * "dm-<phoneA>-<phoneB>" 형식이면 true.
 */
export function isDmRoomId(roomId: string): boolean {
  return roomId.startsWith(DM_ROOM_PREFIX);
}

/**
 * DM room_id 에서 내 phone 이 아닌 상대방 phone 을 뽑아낸다.
 * 형식이 어긋나거나 내 phone 이 포함돼 있지 않으면 null.
 */
export function getOtherPhoneFromDmId(
  roomId: string,
  myPhone: string,
): string | null {
  if (!isDmRoomId(roomId)) return null;
  const rest = roomId.slice(DM_ROOM_PREFIX.length);
  // phone 은 숫자로만 이뤄져 있다고 가정.
  // dm-<A>-<B> 에서 마지막 '-' 가 두 phone 의 구분자.
  const dashIdx = rest.lastIndexOf("-");
  if (dashIdx < 0) return null;
  const a = rest.slice(0, dashIdx);
  const b = rest.slice(dashIdx + 1);
  if (a === myPhone) return b;
  if (b === myPhone) return a;
  return null;
}

/** users 테이블에서 닉네임으로 phone 을 조회. 없으면 null. */
export async function lookupPhoneByNickname(
  nickname: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("phone")
    .eq("nickname", nickname)
    .maybeSingle();
  if (error || !data) return null;
  return (data.phone as string | undefined) ?? null;
}
