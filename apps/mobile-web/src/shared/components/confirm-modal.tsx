import type { ReactNode } from "react";

type Props = {
  open: boolean;
  /** 본문 — 굵게 표시되는 첫 줄 (또는 메시지 본체). */
  message: ReactNode;
  /** 메시지 밑에 회색으로 작게 표시되는 부연 설명 (선택). */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * true 면 확인 버튼 한 개만 노출 — 단순 안내 다이얼로그.
   * 기본값 false: 취소 + 확인 두 버튼.
   */
  singleAction?: boolean;
  onConfirm: () => void;
  /** singleAction=true 인 경우 생략 가능 — 그땐 확인 누르면 onConfirm 호출. */
  onCancel?: () => void;
  /**
   * 메시지 영역과 버튼 영역 사이에 끼울 추가 컨텐츠 (예: 신고 사유 입력란).
   * 보통은 사용하지 않음.
   */
  children?: ReactNode;
};

/**
 * 홀로의 모든 확인/안내 다이얼로그의 단일 출처.
 *
 * 시각 디자인은 마이페이지 "로그아웃 하시겠어요?" 모달을 표준으로 한다:
 *  - 320px 미만의 둥근(rounded-[14px]) 흰 카드
 *  - 가운데 정렬, 굵은 본문(14px) + 회색 부연(12px)
 *  - 알약(rounded-full) 버튼 두 개. 취소=흰색+테두리, 확인=홀로 보라.
 *  - 한 버튼 모드(singleAction)는 확인 버튼만 노출 (전체 너비).
 *
 * 다이얼로그를 새로 만들 일이 있으면 이 컴포넌트를 쓰고, 인라인으로
 * 모달을 직접 그리지 말 것 — 디자인이 어긋난다.
 */
export function ConfirmModal({
  open,
  message,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  singleAction = false,
  onConfirm,
  onCancel,
  children,
}: Props) {
  if (!open) return null;
  // singleAction 일 때 onCancel 이 안 넘어오면 확인 클릭으로 닫히도록 폴백.
  const handleCancel = onCancel ?? onConfirm;
  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 px-6"
      onClick={handleCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[300px] rounded-[14px] bg-white p-5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
      >
        <p className="text-[14px] font-semibold leading-snug text-holo-ink">
          {message}
        </p>
        {description !== undefined && description !== null && description !== "" && (
          <p className="mt-2 text-[12px] leading-relaxed text-holo-ink-3">
            {description}
          </p>
        )}
        {children !== undefined && children !== null && (
          <div className="mt-3">{children}</div>
        )}
        <div className="mt-4 flex gap-2">
          {!singleAction && (
            <button
              type="button"
              onClick={handleCancel}
              className="h-10 flex-1 rounded-full border border-holo-line text-[13px] text-holo-ink"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 flex-1 rounded-full bg-holo-purple-mid text-[13px] font-semibold text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
