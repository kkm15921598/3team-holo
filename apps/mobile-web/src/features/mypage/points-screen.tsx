import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ME, POINT_HISTORY, POINT_GUIDE_ONCE, POINT_GUIDE_REPEAT } from "@/shared/mock/data";

export function PointsScreen() {
  const navigate = useNavigate();
  const [showGuide, setShowGuide] = useState(false);

  return (
    <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2 pb-4">
      <header className="flex h-12 shrink-0 items-center px-0">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">포인트</span>
      </header>

      {/* Balance */}
      <section className="flex items-center justify-between rounded-holo-input bg-holo-purple-mid px-5 py-4 text-white">
        <span className="text-[14px] font-semibold">보유포인트</span>
        <span className="text-[20px] font-bold">{ME.points} P</span>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-3 gap-2">
        <Quick label="출석체크" icon={<CalIcon />} onClick={() => navigate("/event/attendance")} />
        <Quick label="무료포인트" icon={<PCircleIcon />} onClick={() => alert("준비 중")} />
        <Quick label="상점" icon={<ShopIcon />} onClick={() => navigate("/myroom")} />
      </section>

      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="self-end text-[12px] text-holo-ink-3 underline"
      >
        ⓘ 포인트 획득 가이드
      </button>

      {/* History */}
      <section>
        <p className="border-b border-holo-surface-2 pb-2 text-[16px] font-semibold text-holo-ink">
          포인트 이용 내역
        </p>
        <ul className="flex flex-col">
          {POINT_HISTORY.map((h) => (
            <li key={h.id} className="flex items-start gap-3 border-b border-holo-line-3 py-3">
              <span className="text-[13px] text-holo-ink-2">{h.date}</span>
              <div className="flex flex-1 flex-col">
                <span className="text-[14px] text-holo-ink">{h.title}</span>
                {h.note && <span className="text-[12px] text-holo-ink-3">{h.note}</span>}
              </div>
              <span
                className={`text-[14px] font-bold ${
                  h.amount >= 0 ? "text-holo-purple-mid" : "text-holo-error-2"
                }`}
              >
                {h.amount >= 0 ? "+" : ""}
                {h.amount}P
              </span>
            </li>
          ))}
        </ul>
      </section>

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </main>
  );
}

function Quick({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[84px] flex-col items-center justify-center gap-1.5 rounded-holo-card bg-white shadow-holo-card"
    >
      <span className="text-holo-purple-mid">{icon}</span>
      <span className="text-[13px] font-semibold text-holo-ink">{label}</span>
    </button>
  );
}

function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[320px] rounded-[15px] bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between">
          <span className="text-[16px] font-semibold text-holo-ink">포인트 획득 가이드</span>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <Section title="일회성 적립" rows={POINT_GUIDE_ONCE} />
        <Section title="여러번 적립" rows={POINT_GUIDE_REPEAT} />

        <p className="mt-3 text-[11px] text-holo-ink-3">
          · 글쓰기를 통한 적립은 하루 30p 제한 있습니다.
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  return (
    <div className="mb-3">
      <p className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-holo-ink">
        <span className="h-3 w-1 bg-holo-purple-mid" />
        {title}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-holo-input bg-holo-surface-2 p-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-[13px] text-holo-ink">
            <span>{r.label}</span>
            <span className="font-semibold text-holo-purple-mid">{r.value}P</span>
          </div>
        ))}
      </div>
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
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="m6 6 12 12M6 18 18 6" />
    </svg>
  );
}
function CalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M9 14h.01M13 14h.01M17 14h.01M9 18h.01" />
    </svg>
  );
}
function PCircleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 16V8h4a3 3 0 0 1 0 6H9" />
    </svg>
  );
}
function ShopIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </svg>
  );
}
