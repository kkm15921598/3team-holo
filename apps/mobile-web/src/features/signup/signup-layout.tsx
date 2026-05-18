import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useSignup } from "@/shared/contexts/signup-context";
import { ConfirmModal } from "@/shared/components/confirm-modal";

type SignupLayoutProps = {
  // 단계를 7단계까지 확장하여 정의
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  children: ReactNode;
};

const TOTAL_STEPS = 7;

export function SignupLayout({ step, children }: SignupLayoutProps) {
  const navigate = useNavigate();
  const { isDirty, reset } = useSignup();
  const [showExit, setShowExit] = useState(false);

  // 중복 선언을 하나로 합치고 TOTAL_STEPS 기준으로 계산
  const widthPct = (step / TOTAL_STEPS) * 100;

  const handleBack = () => {
    // 1단계에서 수정한 내용이 있다면 나가기 확인 모달을 띄움
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
      {/* 상단 헤더 영역 */}
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <button type="button" aria-label="뒤로" onClick={handleBack}>
          <BackIcon />
        </button>
        <span className="text-[12px] tabular-nums text-holo-ink-3">
          {step}/{TOTAL_STEPS}
        </span>
      </div>

      {/* 진행 상태 바 (Progress Bar) */}
      <div className="h-[5px] w-full shrink-0 bg-holo-line-2">
        <div
          className="h-full bg-holo-gradient transition-[width] duration-300"
          style={{ width: `${widthPct}%` }}
        />
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-8 pt-7">
        {children}
      </div>

      {/* 가입 중단 확인 모달 */}
      <ConfirmModal
        open={showExit}
        message="가입을 그만두시겠어요?"
        description={
          <>
            지금까지 입력하신 정보는 저장되지 않아요.
            <br />
            그래도 나가시겠어요?
          </>
        }
        cancelLabel="계속 가입"
        confirmLabel="나가기"
        onCancel={() => setShowExit(false)}
        onConfirm={handleConfirmExit}
      />
    </main>
  );
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
