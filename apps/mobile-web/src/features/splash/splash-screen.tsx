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
<<<<<<< HEAD
        src="/illustrations/splash-logo.svg"
        alt=""
        className="h-32 w-32 object-contain"
=======
        src="/illustrations/splash-logo.png"
        alt=""
        className="h-[112px] w-[132px] object-contain"
>>>>>>> 46c84a5f3cbe41fddf3c74c072c05038e30320aa
        aria-hidden
      />
      <span className="font-fredoka text-[40px] font-semibold leading-none text-holo-purple">
        HOLO
      </span>
    </main>
  );
}
