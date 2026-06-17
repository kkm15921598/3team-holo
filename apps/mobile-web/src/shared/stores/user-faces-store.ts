import { useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabaseClient";

/**
 * 사용자 닉네임 → 실제 프로필 얼굴(users.profile_face) 캐시.
 *
 * ▶ 왜 필요한가
 *   예전엔 "다른 사람"의 얼굴을 닉네임을 해시해서 생성(getAvatar)했다.
 *   그래서 본인이 직접 고른 프로필 사진(profile_face)이 정작 남에게는 안 보이고,
 *   다른 폰에서 보면 엉뚱한 얼굴이 떴다.
 *   이 스토어가 users.profile_face 를 받아와 캐시하고, getAvatar() 가 이 값을
 *   "우선" 사용하게 해 친구요청·친구목록·프로필·채팅·게시판 등 모든 화면에서
 *   실제 프로필 사진이 보이도록 한다. (사진을 안 정한 사용자는 기존 방식으로 폴백)
 */

const _faces = new Map<string, string>(); // nickname -> profile_face URL (빈 값은 저장 안 함)
const _listeners = new Set<() => void>();
let _primed = false;

function notify(): void {
  _listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* 구독자 콜백 오류는 무시 */
    }
  });
}

/** 캐시된 실제 얼굴 반환. 없으면 null → 호출측이 기존 닉네임 기반 얼굴로 폴백한다. */
export function getCachedFace(nickname: string | null | undefined): string | null {
  if (!nickname) return null;
  return _faces.get(nickname.trim()) ?? null;
}

/** 닉네임↔얼굴 한 건을 캐시에 반영(예: 본인 프로필 사진 변경 시 즉시 반영). */
export function setRealFace(
  nickname: string | null | undefined,
  face: string | null | undefined,
): void {
  const n = (nickname ?? "").trim();
  if (!n) return;
  const f = (face ?? "").trim();
  const prev = _faces.get(n) ?? null;
  if (f) _faces.set(n, f);
  else _faces.delete(n);
  if ((_faces.get(n) ?? null) !== prev) notify();
}

/**
 * users 테이블에서 닉네임+프로필얼굴을 한 번에 받아와 캐시를 채운다.
 * 여러 번 호출돼도 최초 1회만 실제로 조회한다(force=true 면 강제 갱신).
 */
export async function primeAllFaces(force = false): Promise<void> {
  if (_primed && !force) return;
  _primed = true;
  const { data, error } = await supabase
    .from("users")
    .select("nickname, profile_face");
  if (error || !data) {
    _primed = false; // 실패하면 다음 기회에 다시 시도할 수 있게 풀어둔다
    return;
  }
  let changed = false;
  for (const row of data as Array<{
    nickname?: string | null;
    profile_face?: string | null;
  }>) {
    const n = (row.nickname ?? "").trim();
    const f = (row.profile_face ?? "").trim();
    if (n && f && _faces.get(n) !== f) {
      _faces.set(n, f);
      changed = true;
    }
  }
  if (changed) notify();
}

/**
 * 타인의 얼굴을 그리는 화면 상단에서 호출하는 훅.
 *  - 마운트 시 얼굴 캐시를 한 번 받아오고(최초 1회만 실제 조회),
 *  - 캐시가 갱신되면 화면을 리렌더해 실제 프로필 사진이 즉시 반영되게 한다.
 */
export function useUserFacesReady(): void {
  const [, setV] = useState(0);
  useEffect(() => {
    const fn = () => setV((v) => v + 1);
    _listeners.add(fn);
    void primeAllFaces();
    return () => {
      _listeners.delete(fn);
    };
  }, []);
}
