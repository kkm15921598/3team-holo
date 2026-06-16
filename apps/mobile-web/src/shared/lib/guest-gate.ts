/**
 * 가입 게이트 — 게스트(둘러보기)가 "쓰기/상호작용" 동작을 시도하면 가입 안내 모달을 띄운다.
 *
 * 사용법(액션 핸들러 맨 앞):
 *   if (!requireAuth()) return;   // 게스트면 모달이 뜨고 동작 중단
 *
 * 화면 전체를 막을 때(글쓰기/채팅방/프로필 편집 등):
 *   const blocked = useGuestScreenGuard();
 *   if (blocked) return null;
 *
 * 모달 자체는 루트에 한 번 마운트된 <GuestGateModal /> 가 이 이벤트를 듣고 그린다.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isGuest } from "@/shared/stores/guest-store";

const GATE_EVENT = "holo:guest-gate";

/** 가입 안내 모달을 띄운다(직접 호출도 가능). */
export function openGuestGate(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GATE_EVENT));
}

/** 가입 안내 모달 열림 이벤트 구독 — GuestGateModal 전용. */
export function subscribeGuestGate(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(GATE_EVENT, handler);
  return () => window.removeEventListener(GATE_EVENT, handler);
}

/**
 * 동작 허용 여부를 반환한다.
 * - 로그인 상태: true (동작 진행)
 * - 게스트: false 를 반환하며 가입 안내 모달을 띄운다(동작 중단).
 */
export function requireAuth(): boolean {
  if (!isGuest()) return true;
  openGuestGate();
  return false;
}

/**
 * 화면 전체를 게스트로부터 막는 가드 훅.
 * 게스트가 글쓰기/채팅방/프로필 편집 등 "쓰기 전용" 화면에 진입하면
 * 가입 안내 모달을 띄우고 이전 화면으로 되돌린다.
 * 반환값이 true 면 컴포넌트는 즉시 null 을 렌더해 내용 노출을 막는다.
 */
export function useGuestScreenGuard(): boolean {
  const navigate = useNavigate();
  const [blocked] = useState(() => isGuest());

  useEffect(() => {
    if (blocked) {
      openGuestGate();
      navigate(-1);
    }
  }, [blocked, navigate]);

  return blocked;
}
