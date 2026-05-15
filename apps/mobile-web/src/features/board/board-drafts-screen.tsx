import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { draftsStore, type Draft } from "./drafts-store";

export function BoardDraftsScreen() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<Draft[]>(draftsStore.getDrafts());
  const [manage, setManage] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    return draftsStore.subscribe(() => setDrafts(draftsStore.getDrafts()));
  }, []);

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleManage = () => {
    setManage((m) => !m);
    setSelected(new Set());
  };

  const handleDelete = () => {
    if (selected.size === 0) return;
    draftsStore.remove(Array.from(selected));
    setSelected(new Set());
    setManage(false);
  };

  const openDraft = (d: Draft) => {
    navigate("/board/write", {
      state: { draftId: d.id, title: d.title, content: d.description },
    });
  };

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <h1 className="ml-2 text-[16px] font-semibold text-holo-ink">임시 보관함</h1>
      </header>

      <div className="flex h-12 shrink-0 items-center justify-between border-b border-holo-line-3 px-4">
        <span className="text-[14px] font-semibold text-holo-ink">
          {manage ? "삭제할 게시글을 선택해 주세요" : "임시 보관함"}
        </span>
        {drafts.length > 0 && (
          manage ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={selected.size === 0}
              className={`rounded-full px-3 py-1 text-[13px] font-semibold text-white ${
                selected.size === 0 ? "bg-holo-ink-4" : "bg-holo-purple-mid"
              }`}
            >
              삭제하기
            </button>
          ) : (
            <button
              type="button"
              onClick={handleToggleManage}
              className="text-[13px] text-holo-ink-2"
            >
              관리하기
            </button>
          )
        )}
      </div>

      {drafts.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[14px] text-holo-ink-3">
          임시 보관된 게시글이 없습니다.
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {drafts.map((d) => {
            const on = selected.has(d.id);
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => (manage ? toggle(d.id) : openDraft(d))}
                  className={`relative flex w-full items-start gap-3 rounded-holo-card bg-white p-4 text-left shadow-holo-card ${
                    manage && on ? "ring-2 ring-holo-purple-mid" : ""
                  }`}
                >
                  <div className="flex flex-1 flex-col">
                    <span className="text-[16px] font-normal text-[#000000]">
                      {d.title || "(제목 없음)"}
                    </span>
                    <span className="mt-1 text-[14px] font-normal text-[#979797]">
                      {d.description}
                    </span>
                  </div>
                  {!manage && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center self-center rounded-full bg-holo-lilac-light text-white">
                      <ArrowChip />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function ArrowChip() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
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
