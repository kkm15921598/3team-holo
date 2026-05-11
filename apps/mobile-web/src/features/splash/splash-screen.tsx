import { useNavigate } from "react-router-dom";

export function SplashScreen() {
  const navigate = useNavigate();

  const goToLogin = () => navigate("/login", { replace: true });

  return (
<<<<<<< HEAD
    <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-white">
      <img
        src="/illustrations/splash-logo.svg"
        alt=""
        className="h-32 w-32 object-contain"
        aria-hidden
      />
      <span className="font-fredoka text-[40px] font-semibold leading-none text-holo-purple">
        HOLO
=======
    <main
      role="button"
      tabIndex={0}
      onClick={goToLogin}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToLogin();
        }
      }}
      className="flex flex-1 cursor-pointer select-none flex-col items-center bg-white"
    >
      {/*
        레이아웃: 로고는 화면 중앙, 안내 문구는 화면 하단 근처.
        - 로고 묶음에 mt-auto, 안내에도 mt-auto를 줘서 남은 공간을 양쪽으로 균등 분배.
        - 결과: 로고가 화면 중앙쯤, 안내는 mb-20 위치에 분리되어 표시.
      */}
      <div className="mt-auto flex flex-col items-center gap-3">
        <img
          src="/illustrations/splash-logo.png"
          alt=""
          className="h-[112px] w-[132px] animate-pulse object-contain"
          aria-hidden
        />
        <span className="font-fredoka text-[40px] font-semibold leading-none text-holo-purple">
          HOLO
        </span>
      </div>

      <span className="mb-20 mt-auto animate-pulse text-sm text-holo-purple/60">
        화면을 터치하세요
>>>>>>> feat/auth-onboarding-2
      </span>
    </main>
  );
}
