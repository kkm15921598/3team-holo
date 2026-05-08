import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useSignup } from "@/shared/contexts/signup-context";

type SignupLayoutProps = {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  children: ReactNode;
};

const TOTAL_STEPS = 7;

/**
 * 가입 흐름 공용 레이아웃.
 * - 상단 뒤로가기 버튼 + 진행률 바 + n/7 카운터
 * - step=1(약관)에서 뒤로가기 → 가입 흐름을 떠나는 행위이므로 isDirty가 있으면 종료 확인 모달
 * - step>=2 → 단계 사이를 자연스럽게 뒤로 이동 (Context 덕에 입력값 유지됨)
 *
 * 레이아웃 메모:
 * - main이 max-h-[100dvh] + overflow-hidden 으로 viewport에 잠겨 있어,
 *   안쪽 콘텐츠가 늘어나도 페이지 자체가 스크롤되지 않습니다.
 * - 페이지 안에서 길어질 수 있는 영역(예: terms의 약관 ul)은 자체 overflow-y-auto
 *   로 스크롤하면 됩니다.
 */
export function SignupLayout({ step, children }: SignupLayoutProps) {
  const navigate = useNavigate();
  const { isDirty, reset } = useSignup();
  const [showExit, setShowExit] = useState(false);

  const widthPct = (step / TOTAL_STEPS) * 100;

  const handleBack = () => {
    if (step === 1 && isDirty) {
      setShowExit(true);
      return;
    }
    navigate(-1);
  };

  const handleConfirmExit = () => {
    reset();
    setShowExit(false);
    navigate(-1);
  };

  return (
    <main className="flex max-h-[100dvh] flex-1 flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <button type="button" aria-label="뒤로" onClick={handleBack}>
          <BackIcon />
        </button>
        <span className="text-[12px] tabular-nums text-holo-ink-3">
          {step}/{TOTAL_STEPS}
        </span>
      </div>
      <div className="h-[5px] w-full shrink-0 bg-holo-line-2">
        <div
          className="h-full bg-holo-gradient transition-[width]"
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-8 pt-7">
        {children}
      </div>

      {showExit && (
        <ExitConfirmModal
          onCancel={() => setShowExit(false)}
          onConfirm={handleConfirmExit}
        />
      )}
    </main>
  );
}

/**
 * 가입 흐름 종료 확인 모달.
 * 입력한 값이 있는 상태에서 가입 흐름을 벗어나려 할 때 한 번 더 확인합니다.
 */
function ExitConfirmModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[320px] rounded-[18px] bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-[16px] font-semibold text-holo-ink">
          가입을 그만두시겠어요?
        </p>
        <p className="mt-2 text-center text-[13px] leading-relaxed text-holo-ink-3">
          지금까지 입력하신 정보는 저장되지 않아요.
          <br />
          그래도 나가시겠어요?
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-[48px] flex-1 rounded-holo-pill border border-holo-line text-[14px] font-semibold text-holo-ink"
          >
            계속 가입하기
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-[48px] flex-1 rounded-holo-pill bg-holo-error text-[14px] font-semibold text-white"
          >
            나가기
          </button>
        </div>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1A1A1A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
