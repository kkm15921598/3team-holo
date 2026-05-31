import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/lib/supabaseClient";

type Notice = { id: string; title: string; body: string; createdAt: number };

/**
 * 공지사항 — Supabase `notices` 테이블에서 읽어온다(best-effort). 테이블/행이 없으면 빈 상태.
 * 운영자가 DB 에 행을 추가하면 그대로 노출된다(앱 빌드 불필요).
 */
export function NoticeScreen() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notice[] | null>(null); // null=로딩
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("notices")
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !Array.isArray(data)) {
          setItems([]); // 테이블 미존재 등 — 빈 상태
          return;
        }
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
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">공지사항</span>
      </header>

      {items === null ? null : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
          <span className="text-[40px]">📭</span>
          <p className="mt-3 text-[14px] font-medium text-holo-ink-2">등록된 공지가 없어요</p>
          <p className="mt-1 text-[12px] text-holo-ink-3">새 소식이 생기면 여기에 올라와요</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-holo-line-3 px-4">
          {items.map((n) => {
            const open = openId === n.id;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : n.id)}
                  className="flex w-full items-center justify-between gap-2 py-4 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-holo-ink">
                      {n.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-holo-ink-3">
                      {fmtDate(n.createdAt)}
                    </span>
                  </span>
                  <Chevron open={open} />
                </button>
                {open && (
                  <p className="whitespace-pre-wrap pb-4 text-[13px] leading-relaxed text-holo-ink-2">
                    {n.body}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
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
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#A8A8A8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
