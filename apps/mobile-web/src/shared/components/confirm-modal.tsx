import type { ReactNode } from "react";

type Props = {
  open: boolean;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * 흰 카드 + 하단 검정 버튼바 (네 / 아니오) 형태의 확인 다이얼로그.
 * 디자인 시스템 공용 — 친구 추가, 구매, 차단 등 어디서든 재사용.
 */
export function ConfirmModal({
  open,
  message,
  confirmLabel = "네",
  cancelLabel = "아니오",
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-6"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[300px] overflow-hidden rounded-[14px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
      >
        <div className="px-5 py-6 text-center text-[14px] font-semibold leading-snug text-holo-ink">
          {message}
        </div>
        <div className="flex bg-[#1A1A1A] text-white">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 text-center text-[15px] font-medium transition-colors hover:bg-black/80"
          >
            {confirmLabel}
          </button>
          <span className="w-px self-stretch bg-white/30" aria-hidden />
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 text-center text-[15px] font-medium transition-colors hover:bg-black/80"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
