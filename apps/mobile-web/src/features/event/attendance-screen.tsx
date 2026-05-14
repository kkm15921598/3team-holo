import { useNavigate } from "react-router-dom";
import { ATTENDANCE_DAYS, ATTENDANCE_STREAK } from "@/shared/mock/data";

type Day = (typeof ATTENDANCE_DAYS)[number];

export function AttendanceScreen() {
  const navigate = useNavigate();
  const todayDay = ATTENDANCE_DAYS.find((d) => d.isToday);
  const checkedCount = ATTENDANCE_DAYS.filter((d) => d.checked).length;

  const firstRow = ATTENDANCE_DAYS.slice(0, 4);
  const secondRow = ATTENDANCE_DAYS.slice(4, 7);

  return (
    <main className="flex flex-1 flex-col bg-[#F7F6FB] pb-6 overflow-y-auto">
      <header className="flex h-12 w-full items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
      </header>

      {/* 타이틀 영역 */}
      <div className="mt-2 flex flex-col items-center px-6">
        <span className="font-fredoka text-[36px] font-semibold leading-none text-holo-purple">
          HOLO
        </span>
        <h1 className="mt-2 text-[18px] font-bold text-holo-ink">출석체크</h1>
        <p className="mt-1 text-center text-[12px] text-gray-400">
          매일 출석하면 5P 지급 · 연속 출석 시 추가 보너스 지급
        </p>
      </div>

      {/* 이번 주 출석 카드 */}
      <section className="mx-4 mt-5 rounded-2xl bg-white px-4 py-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[15px] font-bold text-holo-ink">
              이번 주 출석{" "}
              <span className="text-holo-purple">{checkedCount} / 7</span>
            </p>
            <div className="mt-3 flex gap-2">
              {ATTENDANCE_DAYS.map((d) => (
                <span
                  key={d.day}
                  className={`block h-3 w-3 rounded-full ${
                    d.checked
                      ? "bg-holo-purple"
                      : d.isToday
                      ? "bg-holo-purple/40"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className="mt-3 text-[12px] text-gray-500">
              현재{" "}
              <span className="font-bold text-holo-purple">
                {ATTENDANCE_STREAK}일
              </span>{" "}
              연속 출석 중
            </p>
          </div>
          <CalendarIllustration />
        </div>
      </section>

      {/* 일별 카드 — 1행 4칸, 2행 3칸 */}
      <div className="mx-4 mt-5 grid grid-cols-4 gap-2">
        {firstRow.map((d) => (
          <DayCardSlot key={d.day} day={d} />
        ))}
      </div>
      <div className="mx-4 mt-2 grid grid-cols-3 gap-2">
        {secondRow.map((d) => (
          <DayCardSlot key={d.day} day={d} />
        ))}
      </div>

      {/* 출석 안내 */}
      <section className="mx-4 mt-5 rounded-2xl bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <InfoBadge />
          <p className="text-[14px] font-bold text-holo-ink">출석 안내</p>
        </div>
        <ul className="mt-2 space-y-1 pl-7">
          <li className="flex gap-1.5 text-[12px] text-gray-500">
            <span className="text-holo-purple shrink-0">•</span>
            매일 출석 시 최소 5P를 받아요
          </li>
          <li className="flex gap-1.5 text-[12px] text-gray-500">
            <span className="text-holo-purple shrink-0">•</span>
            연속 출석하면 특정 날짜에 추가 포인트를 받아요
          </li>
          <li className="flex gap-1.5 text-[12px] text-gray-500">
            <span className="text-holo-purple shrink-0">•</span>
            연속 출석이 끊기면 다시 1일차부터 시작해요
          </li>
        </ul>
      </section>

      {/* 출석 버튼 */}
      <div className="mt-6 px-4">
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

function DayCardSlot({ day }: { day: Day }) {
  // "오늘" 카드는 위에 pill을 띄우기 위해 relative wrapping이 필요
  if (day.isToday) {
    return (
      <div className="relative pt-3">
        <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-full bg-holo-purple px-2.5 py-0.5 text-[10px] font-semibold text-white">
          오늘
        </span>
        <div className="flex h-[88px] flex-col items-center justify-center rounded-2xl border-2 border-holo-purple bg-white px-1 py-3 text-center">
          <p className="text-[11px] text-gray-400">{day.day}일차</p>
          <p className="mt-1 text-[18px] font-extrabold text-holo-purple">
            {day.points}P
          </p>
        </div>
      </div>
    );
  }

  if (day.checked) {
    return (
      <div className="pt-3">
        <div className="flex h-[88px] flex-col items-center justify-between rounded-2xl bg-holo-lilac-card-2 px-1 py-2 text-center">
          <p className="text-[11px] text-gray-500">{day.day}일차</p>
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-holo-purple/30 bg-white">
            <CheckIcon />
          </span>
          <p className="text-[11px] font-medium text-holo-purple">완료</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-3">
      <div className="flex h-[88px] flex-col items-center justify-center rounded-2xl bg-holo-lilac-card-2 px-1 py-2 text-center">
        <p className="text-[11px] text-gray-500">{day.day}일차</p>
        <p className="mt-1 text-[18px] font-extrabold text-holo-purple">
          {day.points}P
        </p>
        {day.label && (
          <span className="mt-1 text-[10px] font-medium text-holo-purple-mid">
            {day.label}
          </span>
        )}
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1A1A1A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#7C3AED"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CalendarIllustration() {
  // 우측 상단 일러스트(달력+체크) — 간단한 SVG로 일러스트풍 처리
  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      {/* 노트 시트 베이스 */}
      <rect x="9" y="11" width="38" height="40" rx="6" fill="#E5DCF7" />
      <rect x="9" y="11" width="38" height="40" rx="6" stroke="#C7BDFF" strokeWidth="1.5" />
      {/* 상단 바 */}
      <rect x="9" y="11" width="38" height="9" rx="6" fill="#C7BDFF" />
      <rect x="14" y="7" width="3" height="8" rx="1.5" fill="#7448DD" />
      <rect x="39" y="7" width="3" height="8" rx="1.5" fill="#7448DD" />
      {/* 큰 보라 체크 */}
      <path
        d="M21 36 L27 42 L37 30"
        stroke="#7448DD"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* 반짝이 */}
      <path
        d="M48 16 L48 22 M45 19 L51 19"
        stroke="#C7BDFF"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M52 32 L52 36 M50 34 L54 34"
        stroke="#C7BDFF"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InfoBadge() {
  return (
    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-holo-lilac-card-2">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7448DD"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8h.01" />
        <path d="M11 12h1v5h1" />
      </svg>
    </span>
  );
}
