import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmModal } from "./confirm-modal";
import { subscribeGuestGate } from "@/shared/lib/guest-gate";

/**
 * 가입 안내 모달 — 루트에 한 번만 마운트한다(main.tsx).
 *
 * 게스트가 글쓰기/댓글/좋아요/채팅 등 로그인이 필요한 동작을 시도하면
 * guest-gate 의 requireAuth()/openGuestGate() 가 이벤트를 쏘고, 이 컴포넌트가
 * "가입하시면 쓰실 수 있어요" 안내를 띄운다. 확인 → 회원가입 플로우로 이동.
 */
export function GuestGateModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeGuestGate(() => setOpen(true)), []);

  return (
    <ConfirmModal
      open={open}
      message="로그인하면 쓸 수 있어요"
      description="가입하시면 글쓰기, 댓글, 채팅 등 모든 기능을 이용하실 수 있어요."
      confirmLabel="회원가입"
      cancelLabel="둘러보기 계속"
      onConfirm={() => {
        setOpen(false);
        navigate("/signup/terms");
      }}
      onCancel={() => setOpen(false)}
    />
  );
}
