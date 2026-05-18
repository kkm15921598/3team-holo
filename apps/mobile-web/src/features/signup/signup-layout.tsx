import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useSignup } from "@/shared/contexts/signup-context";
import { ConfirmModal } from "@/shared/components/confirm-modal";

type SignupLayoutProps = {
  // 단계를 7단계까지 확장하여 정의
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  children: ReactNode;
  /** 스크롤 영역 밖, 화면 하단에 고정될 footer (예: "다음" 버튼) */
  footer?: ReactNode;
  /** true 면 스크롤 방향에 무관하게 footer 가 항상 노출됨 — 다음 단계가 가능해진 시점에 사용. */
  keepFooterVisible?: boolean;
};

const TOTAL_STEPS = 7;

export function SignupLayout({
  step,
  children,
  footer,
  keepFooterVisible,
}: SignupLayoutProps) {
  const navigate = useNavigate();
  const { isDirty, reset } = useSignup();
  const [showExit, setShowExit] = useState(false);

  /** 스크롤 방향에 따른 footer 표시 — 내릴 땐 숨김, 올릴 땐 자연스럽게 다시 등장. */
  const [footerVisible, setFooterVisible] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el || !footer) return;
    const onScroll = () => {
      // 강제 노출 모드면 스크롤로 인한 숨김을 비활성화 — 다음 단계 진행이 가능해진 상태.
      if (keepFooterVisible) {
        setFooterVisible(true);
        lastScrollYRef.current = el.scrollTop;
        return;
      }
      const currentY = el.scrollTop;
      const lastY = lastScrollYRef.current;
      const delta = currentY - lastY;
      // 5px 이상의 의미 있는 이동만 감지 (작은 떨림 무시)
      if (delta > 5) {
        setFooterVisible(false);
      } else if (delta < -5) {
        setFooterVisible(true);
      }
      lastScrollYRef.current = currentY;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, [footer, keepFooterVisible]);

  // keepFooterVisible 이 true 로 켜지는 순간 즉시 footer 를 띄워준다.
  useEffect(() => {
    if (keepFooterVisible) setFooterVisible(true);
  }, [keepFooterVisible]);

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

      {/* 메인 콘텐츠 영역 — 창이 작아지거나 키패드가 올라와도 스크롤로 모든 항목 접근 가능.
          footer 가 있으면 콘텐츠는 footer 영역을 침범하지 않는다 (footer 가 별도 flex 슬롯). */}
      <div
        ref={scrollAreaRef}
        id="signup-scroll-area"
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${footer ? "pb-4" : "pb-8"}`}
      >
        {children}
      </div>

      {/* 화면 하단 고정 footer — 스크롤 내릴 때 접혀 사라져 흰 여백이 남지 않음.
          올릴 땐 다시 자연스럽게 펼쳐짐. max-height + opacity 트랜지션. */}
      {footer && (
        <div
          className={`shrink-0 overflow-hidden bg-white transition-[max-height,opacity] duration-300 ease-out ${
            footerVisible ? "max-h-[160px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 pb-6 pt-3">{footer}</div>
        </div>
      )}

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
