import { useNavigate } from "react-router-dom";
import { ATTENDANCE_DAYS } from "@/shared/mock/data";

export function AttendanceScreen() {
  const navigate = useNavigate();
  return (
    <main className="flex flex-1 flex-col items-center px-4 pt-4 pb-6">
      <header className="flex h-12 w-full items-center">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
      </header>
      <div className="mt-4 flex flex-col items-center">
        <span className="font-fredoka text-[40px] font-semibold leading-none text-holo-purple">
          HOLO
        </span>
        <p className="mt-3 text-[16px] font-semibold text-holo-ink">출석체크</p>
      </div>

      <div className="mt-6 grid w-full grid-cols-4 gap-3">
        {ATTENDANCE_DAYS.map((d) => (
          <div
            key={d.day}
            className="flex aspect-[85/109] flex-col items-center justify-center rounded-[10px] bg-white text-center shadow-holo-card"
          >
            {d.allClear ? (
              <>
                <p className="text-[14px] font-semibold text-holo-ink">ALL</p>
                <p className="text-[14px] font-semibold text-holo-ink">CLEAR!</p>
                <p className="mt-2 text-[14px] font-semibold text-holo-purple-text">{d.reward}</p>
              </>
            ) : (
              <>
                <p className="text-[14px] font-semibold text-holo-ink">{d.day}일차</p>
                {d.illustration && <span className="mt-2 text-[24px]">🪑</span>}
                {d.reward && (
                  <p className="mt-2 text-[14px] font-semibold text-holo-purple-text">{d.reward}</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-auto h-[60px] w-full rounded-holo-pill bg-holo-ink text-[16px] font-semibold text-white"
      >
        보상받기
      </button>
    </main>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
