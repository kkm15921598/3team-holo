import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate("/login", { replace: true }), 1500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-white">
      <img
        src="/illustrations/splash-logo.svg"
        alt=""
        className="h-32 w-32 object-contain"
        aria-hidden
      />
      <span className="font-fredoka text-[40px] font-semibold leading-none text-holo-purple">
        HOLO
      </span>
    </main>
  );
}
