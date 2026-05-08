import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

type SignupLayoutProps = {
<<<<<<< HEAD
  step: 1 | 2 | 3 | 4 | 5;
=======
  step: 1 | 2 | 3 | 4 | 5 | 6;
>>>>>>> 46c84a5f3cbe41fddf3c74c072c05038e30320aa
  children: ReactNode;
};

export function SignupLayout({ step, children }: SignupLayoutProps) {
  const navigate = useNavigate();
<<<<<<< HEAD
  const widthPct = (step / 5) * 100;
=======
  const widthPct = (step / 6) * 100;
>>>>>>> 46c84a5f3cbe41fddf3c74c072c05038e30320aa

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
      </div>
      <div className="h-[5px] w-full bg-holo-line-2">
        <div
          className="h-full bg-holo-gradient transition-[width]"
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <div className="flex flex-1 flex-col px-4 pb-8 pt-7">{children}</div>
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
