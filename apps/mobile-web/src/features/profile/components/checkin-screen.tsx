const TODAY = 14;
const STREAK = 3;
const CHECKED_DAYS = new Set([10, 11, 12, 13]);

export function CheckinScreen() {
  const isCheckedToday = CHECKED_DAYS.has(TODAY);

  return (
    <div className="flex flex-col gap-5 p-4">
      <section className="rounded-3xl bg-holo-gradient p-6 text-center text-white shadow-sm">
        <p className="text-xs opacity-90">연속 출석</p>
        <p className="mt-1 text-5xl font-bold">{STREAK}일</p>
        <p className="mt-2 text-xs opacity-90">7일 달성 시 +500P 보너스!</p>
      </section>

      <CalendarGrid today={TODAY} checked={CHECKED_DAYS} />

      <button
        type="button"
        disabled={isCheckedToday}
        className={`h-12 rounded-full text-sm font-semibold transition active:scale-[0.99] ${
          isCheckedToday
            ? "bg-gray-100 text-gray-400"
            : "bg-holo-gradient text-white shadow-md"
        }`}
      >
        {isCheckedToday ? "오늘 출석 완료" : "오늘 출석체크"}
      </button>

      <p className="text-center text-xs text-gray-500">
        매일 출석하면 10P, 7일 연속 시 +500P
      </p>
    </div>
  );
}

function CalendarGrid({ today, checked }: { today: number; checked: Set<number> }) {
  const daysInMonth = 30;
  const firstDayOffset = 2;
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <section className="rounded-2xl bg-gray-50 p-4">
      <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <span key={`e-${idx}`} className="aspect-square" />;
          const isToday = day === today;
          const isChecked = checked.has(day);
          return (
            <span
              key={day}
              className={`relative flex aspect-square items-center justify-center rounded-full text-xs ${
                isChecked
                  ? "bg-holo-purple text-white"
                  : isToday
                    ? "border border-holo-purple text-holo-purple-deep"
                    : "text-gray-700"
              }`}
            >
              {day}
            </span>
          );
        })}
      </div>
    </section>
  );
}
