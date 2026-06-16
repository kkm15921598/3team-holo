import { useNavigate } from "react-router-dom";
import { useIsGuest, exitGuestMode } from "@/shared/stores/guest-store";

/**
 * 둘러보기(게스트) 안내 배너 — 게스트 모드일 때 하단 탭 바 바로 위에 항상 표시.
 *
 * "둘러보는 중이에요"를 알리고, 탭하면 로그인 화면으로 이동해 가입/로그인을 유도한다.
 * 로그인 상태에서는 렌더되지 않는다.
 */
export function GuestBanner() {
  const navigate = useNavigate();
  const guest = useIsGuest();

  if (!guest) return null;

  return (
    <button
      type="button"
      onClick={() => {
        exitGuestMode();
        navigate("/login");
      }}
      className="flex w-full shrink-0 items-center justify-center gap-2 bg-holo-gradient px-4 py-2.5 text-[13px] font-semibold text-white"
    >
      <span aria-hidden>👋</span>
      <span>둘러보는 중이에요 · 로그인하고 시작하기</span>
    </button>
  );
}
