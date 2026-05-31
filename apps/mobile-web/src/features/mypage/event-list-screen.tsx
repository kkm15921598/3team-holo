import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/lib/supabaseClient";

type EventItem = { id: string; title: string; body: string; createdAt: number };

/**
 * 이벤트 — 기본 제공되는 '출석 체크 이벤트' + Supabase `events` 테이블(best-effort)의 추가 이벤트.
 * 테이블/행이 없으면 출석 이벤트만 노출.
 */
export function EventListScreen() {
  const navigate = useNavigate();
  const [items, setItems] = useState<EventItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("events")
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (cancelled || error || !Array.isArray(data)) return;
        setItems(
          data.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            title: String(r.title ?? ""),
            body: String(r.body ?? ""),
            createdAt: r.created_at ? new Date(String(r.created_at)).getTime() : Date.now(),
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex flex-1 flex-col bg-white">
      <header className="flex h-12 shrink-0 items-center border-b border-holo-line-3 px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">이벤트</span>
      </header>

      <div className="flex flex-col gap-3 px-4 pt-1 pb-6">
        {/* 기본 제공 — 출석 체크 이벤트(상시) */}
        <button
          type="button"
          onClick={() => navigate("/event/attendance")}
          className="flex items-center gap-3 rounded-holo-input bg-holo-gradient-soft p-4 text-left text-white active:opacity-90"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center"><CalendarLineIcon /></span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[15px] font-bold">매일 출석 체크</span>
            <span className="mt-0.5 text-[12px] opacity-90">
              매일 출석하고 포인트 받기 · 7일 연속 보너스
            </span>
          </span>
          <span className="shrink-0 text-[13px] font-semibold">참여 ›</span>
        </button>

        {/* 운영 이벤트(Supabase) */}
        {items.map((e) => (
          <div key={e.id} className="rounded-holo-input border border-holo-line bg-white p-4">
            <p className="text-[15px] font-bold text-holo-ink">{e.title}</p>
            {e.body && (
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-holo-ink-2">
                {e.body}
              </p>
            )}
            <p className="mt-2 text-[11px] text-holo-ink-3">{fmtDate(e.createdAt)}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function CalendarLineIcon() {
  // 출석 배너용 Material `calendar` 라인 아이콘(이모지 대체). 그라데이션 위라 흰색 상속.
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
      <path d="m8.5 14 2 2 3.5-3.5" />
    </svg>
  );
}
