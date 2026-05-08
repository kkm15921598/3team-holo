import { useNavigate } from "react-router-dom";

export function SplashScreen() {
  const navigate = useNavigate();

  const goToLogin = () => navigate("/login", { replace: true });

  return (
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
      className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 bg-white select-none"
    >
      <img
        src="/illustrations/splash-logo.png"
        alt=""
        className="h-[112px] w-[132px] animate-pulse object-contain"
        aria-hidden
      />
      <span className="font-fredoka text-[40px] font-semibold leading-none text-holo-purple">
        HOLO
      </span>
      <span className="mt-6 animate-pulse text-sm text-holo-purple/60">
        화면을 터치하세요
      </span>
    </main>
  );
}
