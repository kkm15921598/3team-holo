import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { draftsStore, type Draft } from "./drafts-store";

export function BoardDraftsScreen() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<Draft[]>(draftsStore.getDrafts());
  const [manageMode, setManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    return draftsStore.subscribe(() => setDrafts(draftsStore.getDrafts()));
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleManageButton = () => {
    if (manageMode && selectedIds.size > 0) {
      // Delete selected drafts and exit manage mode
      draftsStore.remove(Array.from(selectedIds));
      setSelectedIds(new Set());
      setManageMode(false);
    } else {
      // Toggle manage mode (also resets selection on entering/exiting)
      setManageMode((m) => !m);
      setSelectedIds(new Set());
    }
  };

  const openDraft = (d: Draft) => {
    navigate("/board/write", {
      state: { draftId: d.id, title: d.title, content: d.description },
    });
  };

  const showDeleteLabel = manageMode && selectedIds.size > 0;
  const buttonLabel = showDeleteLabel ? "삭제" : "관리하기";

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between px-4">
        <div className="flex items-center">
          <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <h1 className="ml-2 text-[16px] font-semibold text-holo-ink">임시 보관함</h1>
        </div>
        {drafts.length > 0 && (
          <button
            type="button"
            onClick={handleManageButton}
            className={`text-[14px] ${
              showDeleteLabel ? "font-semibold text-[#E04646]" : "text-holo-purple-mid"
            }`}
          >
            {buttonLabel}
          </button>
        )}
      </header>

      {drafts.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[14px] text-holo-ink-3">
          임시 보관된 게시글이 없습니다.
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {drafts.map((d) => {
            const selected = selectedIds.has(d.id);
            return (
              <li key={d.id} className="border-b border-holo-line">
                <button
                  type="button"
                  onClick={() => (manageMode ? toggleSelect(d.id) : openDraft(d))}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  {manageMode && (
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected
                          ? "border-holo-purple-mid bg-holo-purple-mid"
                          : "border-holo-line bg-white"
                      }`}
                      aria-hidden
                    >
                      {selected && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                  )}
                  <div className="h-16 w-16 shrink-0 rounded bg-holo-line-3" />
                  <div className="flex flex-1 flex-col justify-center">
                    <span className="text-[15px] font-semibold text-holo-ink">
                      {d.title || "(제목 없음)"}
                    </span>
                    <p className="mt-1 line-clamp-1 text-[13px] text-holo-ink-3">
                      {d.description}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
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
