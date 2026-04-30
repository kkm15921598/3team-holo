import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SignupProvider } from "@/features/auth/signup-context";

const STEPS = [
  { slug: "terms", title: "약관 동의" },
  { slug: "identity", title: "본인 정보" },
  { slug: "phone", title: "휴대폰 인증" },
  { slug: "address", title: "동네 인증" },
  { slug: "nickname", title: "프로필 설정" },
  { slug: "done", title: "가입 완료" },
] as const;

export function SignupLayout() {
  return (
    <SignupProvider>
      <div className="flex flex-1 flex-col">
        <SignupHeader />
        <main className="flex flex-1 flex-col overflow-y-auto bg-white">
          <Outlet />
        </main>
      </div>
    </SignupProvider>
  );
}

function SignupHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const slug = pathname.split("/").pop() ?? "";
  const idx = STEPS.findIndex((s) => s.slug === slug);
  const current = idx >= 0 ? idx : 0;
  const step = STEPS[current] ?? STEPS[0]!;
  const isDone = step.slug === "done";

  const handleBack = () => {
    if (current === 0) {
      navigate("/login", { replace: true });
      return;
    }
    navigate(-1);
  };

  return (
    <header className="shrink-0 border-b border-gray-100 bg-white">
      <div className="relative flex h-14 items-center justify-center px-4">
        {!isDone && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="뒤로 가기"
            className="absolute left-2 flex h-10 w-10 items-center justify-center text-gray-700 active:scale-95"
          >
            <BackIcon />
          </button>
        )}
        <h1 className="text-base font-semibold text-gray-900">{step.title}</h1>
        {!isDone && (
          <span className="absolute right-4 text-xs font-medium text-gray-400">
            {current + 1} / {STEPS.length - 1}
          </span>
        )}
      </div>
      {!isDone && (
        <div className="h-1 w-full bg-gray-100">
          <div
            className="h-full bg-holo-gradient transition-all"
            style={{ width: `${((current + 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      )}
    </header>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
