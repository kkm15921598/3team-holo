import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useSignup } from "@/shared/contexts/signup-context";

type SignupLayoutProps = {
<<<<<<< HEAD
  step: 1 | 2 | 3 | 4 | 5;
=======
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
>>>>>>> feat/auth-onboarding-2
  children: ReactNode;
};

const TOTAL_STEPS = 7;

export function SignupLayout({ step, children }: SignupLayoutProps) {
  const navigate = useNavigate();
<<<<<<< HEAD
  const widthPct = (step / 5) * 100;
=======
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
>>>>>>> feat/auth-onboarding-2

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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
