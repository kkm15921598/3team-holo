import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TITLES } from "@/shared/mock/data";
import { useProfile } from "@/shared/hooks/use-profile";
import { setTitle as storeSetTitle } from "@/shared/stores/profile-store";
import { useAccountStats } from "@/shared/stores/account-stats-store";
import { saveChoice } from "@/shared/stores/account-choices-store";

export function MyTitlesScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const stats = useAccountStats();
  const [selected, setSelected] = useState<string>(profile.title);

  // 실제 보유한 칭호 = stats.acquiredTitles
  const unlockedTitles = useMemo(
    () => new Set(stats.acquiredTitles),
    [stats.acquiredTitles],
  );

  return (
    <main className="flex flex-1 flex-col overflow-y-auto pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">나의 칭호</span>
        <span className="ml-auto text-[13px] text-holo-ink-3">{stats.acquiredTitles.length} / {TITLES.length}개</span>
      </header>

      {/* 현재 장착 칭호 */}
      <section className="mx-4 rounded-[14px] bg-holo-lilac-card-2 px-4 py-3">
        <p className="text-[12px] text-holo-ink-3">현재 장착 칭호</p>
        <p className="mt-1 text-[15px] font-semibold text-holo-purple-mid">{selected}</p>
      </section>

      {/* 보유 칭호 목록 */}
      <section className="mt-4 px-4">
        <p className="mb-3 text-[13px] text-holo-ink-3">칭호를 눌러 변경할 수 있어요</p>
        <div className="flex flex-wrap gap-2">
          {TITLES.map((t) => {
            const on = selected === t;
            const unlocked = unlockedTitles.has(t);
            const handleClick = () => {
              if (!unlocked) return;
              setSelected(t);
              storeSetTitle(t);
              saveChoice("title", t);
            };
            return (
              <button
                key={t}
                type="button"
                onClick={handleClick}
                disabled={!unlocked}
                className={`rounded-[20px] border px-4 py-2 text-[13px] font-medium transition ${
                  on
                    ? "border-holo-purple-mid bg-holo-purple-mid text-white shadow-sm"
                    : unlocked
                      ? "border-holo-line bg-white text-holo-ink hover:border-holo-purple-mid hover:text-holo-purple-mid"
                      : "cursor-not-allowed border-holo-line bg-holo-surface-2 text-holo-ink-4"
                }`}
              >
                {t}
                {!unlocked && <span className="ml-1 text-[11px]">🔒</span>}
              </button>
            );
          })}
        </div>
      </section>
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
