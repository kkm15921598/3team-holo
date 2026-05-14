import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SPLASH_DELAY_MS = 1800;

export function SplashScreen() {
  const navigate = useNavigate();

  // 일정 시간 후 자동으로 로그인 화면으로 이동
  useEffect(() => {
    const t = window.setTimeout(() => {
      navigate("/login", { replace: true });
    }, SPLASH_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [navigate]);

  return (
    <main className="flex flex-1 select-none flex-col items-center bg-white">
      {/* 레이아웃: 로고는 화면 중앙. 안내 문구는 자동전환이라 제거. */}
      <div className="mt-auto flex flex-col items-center gap-3">
        <img
          src="/illustrations/splash-logo.png"
          alt=""
          className="h-[112px] w-[132px] animate-holo-pulse object-contain"
          aria-hidden
        />
        <span className="font-fredoka text-[40px] font-semibold leading-none text-holo-purple">
          HOLO
        </span>
      </div>

      <span className="mb-20 mt-auto" aria-hidden />
    </main>
  );
}