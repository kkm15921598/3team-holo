import { useNavigate } from "react-router-dom";
import { ATTENDANCE_DAYS, ATTENDANCE_STREAK } from "@/shared/mock/data";

export function AttendanceScreen() {
  const navigate = useNavigate();
  const todayDay = ATTENDANCE_DAYS.find((d) => d.isToday);
  const checkedCount = ATTENDANCE_DAYS.filter((d) => d.checked).length;

  return (
    <main className="flex flex-1 flex-col bg-[#F7F6FB] pb-6 overflow-y-auto">
      <header className="flex h-12 w-full items-center px-4">
        <button type="button" aria-label="back" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
      </header>

      <div className="flex flex-col items-center mt-2">
        <span className="font-fredoka text-[36px] font-semibold leading-none text-holo-purple">
          HOLO
        </span>
        <p className="mt-1 text-[13px] text-gray-400 text-center px-6">
          매일 출석하면 포인트 지급, 연속 출석 시 추가 MILEAGE 지급
        </p>
      </div>

      <div className="mx-4 mt-5 rounded-2xl bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-bold text-holo-ink">
            이번 주 출석 <span className="text-holo-purple">{checkedCount}/7</span>
          </p>
          <CalendarIcon />
        </div>
        <div className="mt-3 flex gap-2">
          {ATTENDANCE_DAYS.map((d) => (
            <div
              key={d.day}
              className={[
                "h-3 w-3 rounded-full",
                d.checked ? "bg-holo-purple" : d.isToday ? "bg-holo-purple opacity-50" : "bg-gray-200",
              ].join(" ")}
            />
          ))}
        </div>
        <p className="mt-3 text-[13px] text-gray-500">
          현재 <span className="font-bold text-holo-purple">{ATTENDANCE_STREAK}일</span> 연속 출석 중
        </p>
      </div>

      <div className="mx-4 mt-4 grid grid-cols-4 gap-2">
        {ATTENDANCE_DAYS.map((d) => (
          <DayCard key={d.day} day={d} />
        ))}
      </div>

      <div className="mx-4 mt-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
        <p className="text-[13px] font-bold text-holo-ink">출석 안내</p>
        <ul className="mt-2 space-y-1">
          <li className="flex gap-1.5 text-[12px] text-gray-500">
            <span className="text-holo-purple shrink-0">•</span>
            매일 출석 시 최소 5P를 받습니다
          </li>
          <li className="flex gap-1.5 text-[12px] text-gray-500">
            <span className="text-holo-purple shrink-0">•</span>
            연속 출석이면 출석날에 따라 추가 포인트를 받을 수 있습니다
          </li>
          <li className="flex gap-1.5 text-[12px] text-gray-500">
            <span className="text-holo-purple shrink-0">•</span>
            연속 출석이 끊어지면 1일차부터 다시 시작합니다
          </li>
        </ul>
      </div>

      <div className="px-4 mt-6">
        <button
          type="button"
          className="h-[56px] w-full rounded-holo-pill bg-holo-ink text-[16px] font-semibold text-white active:opacity-80"
        >
          오늘 출석하고 {todayDay?.points ?? 5}P 받기
        </button>
      </div>
    </main>
  );
}

function DayCard({ day }: { day: (typeof ATTENDANCE_DAYS)[number] }) {
  const base = "flex flex-col items-center justify-center rounded-2xl px-1 py-3 text-center";

  if (day.checked) {
    return (
      <div className={base + " bg-white shadow-sm"}>
        <p className="text-[11px] text-gray-400">{day.day}일차</p>
        <CheckIcon />
        <p className="mt-1 text-[13px] font-bold text-holo-purple">{day.points}P</p>
      </div>
    );
  }

  if (day.isToday) {
    return (
      <div className={base + " bg-holo-purple shadow-sm"}>
        <p className="text-[11px] text-purple-200">{day.day}일차</p>
        <p className="mt-1 text-[18px] font-extrabold text-white">{day.points}P</p>
        <p className="text-[10px] text-purple-200">오늘</p>
      </div>
    );
  }

  return (
    <div className={base + " bg-white shadow-sm"}>
      <p className="text-[11px] text-gray-400">{day.day}일차</p>
      <p className="mt-1 text-[18px] font-extrabold text-holo-ink">{day.points}P</p>
      {day.label != null && (
        <span className="mt-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-[9px] font-semibold text-holo-purple">
          {day.label}
        </span>
      )}
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="m9 16 2 2 4-4" stroke="#7C3AED" strokeWidth="2" />
    </svg>
  );
}
