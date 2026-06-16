import type { ReactNode } from "react";
import { useGuestScreenGuard } from "@/shared/lib/guest-gate";

/**
 * 게스트(둘러보기)가 "쓰기 전용" 화면(글쓰기/채팅방/프로필 편집 등)에 진입하면
 * 가입 안내 모달을 띄우고 이전 화면으로 되돌린다. 이 래퍼가 막는 동안 children
 * 화면은 아예 마운트되지 않아(=hooks 안전) 내용이 노출되지 않는다.
 */
export function RequireAuthRoute({ children }: { children: ReactNode }) {
  const blocked = useGuestScreenGuard();
  if (blocked) return null;
  return <>{children}</>;
}
