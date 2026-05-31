import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BADGES } from "@/shared/mock/data";
import { evaluateAchievements } from "@/shared/lib/achievements";
import { getBadgeById } from "@/badge";
import { useProfile } from "@/shared/hooks/use-profile";
import { setEquippedBadgeId as storeSetBadge } from "@/shared/stores/profile-store";
import {
  useAccountStats,
  getBadgeAcquiredDate,
} from "@/shared/stores/account-stats-store";
import { saveChoice } from "@/shared/stores/account-choices-store";

export function MyBadgesScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const stats = useAccountStats();
  const [equippedId, setEquippedId] = useState<string>(profile.equippedBadgeId);
  const [modal, setModal] = useState<{ id: string; isAcquired: boolean } | null>(null);
  // 진입 시 기준 충족한 배지 자동 발급(멱등).
  useEffect(() => {
    evaluateAchievements();
  }, []);

  // 실제 획득한 뱃지 집합 — account-stats-store 의 acquiredBadgeIds 가 출처.
  // 장착 뱃지는 반드시 acquired 안에 들어 있어야 한다.
  const unlockedSet = useMemo(
    () => new Set(stats.acquiredBadgeIds),
    [stats.acquiredBadgeIds],
  );

  /**
   * 뱃지 렌더 순서:
   *  1) 획득한 뱃지를 먼저 표시 — 최근 획득일 내림차순(YYYY.MM.DD 문자열 비교).
   *  2) 미획득 뱃지는 그 뒤에 mock 선언 순서대로.
   * 사용자의 최신 성취가 그리드 상단에 보이도록 정렬한다.
   * 획득일은 acquiredBadgeDates(실 store) → BADGES.date(시드) 순으로 폴백.
   */
  const sortedBadges = useMemo(() => {
    const acquired = BADGES.filter((b) => unlockedSet.has(b.id));
    const locked = BADGES.filter((b) => !unlockedSet.has(b.id));
    acquired.sort((a, b) => {
      const aDate =
        stats.acquiredBadgeDates[a.id] ?? a.date ?? "";
      const bDate =
        stats.acquiredBadgeDates[b.id] ?? b.date ?? "";
      // 날짜 없는 항목은 항상 아래로
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      // "2026.05.17" 같은 zero-padded 문자열은 localeCompare 로도 정확히 비교됨
      return bDate.localeCompare(aDate);
    });
    return [...acquired, ...locked];
  }, [unlockedSet, stats.acquiredBadgeDates]);

  const equipped = BADGES.find((b) => b.id === equippedId)!;
  const equippedImg = getBadgeById(equippedId);
  const modalBadge = modal ? BADGES.find((b) => b.id === modal.id)! : null;
  const modalImg = modal ? getBadgeById(modal.id) : null;

  return (
    <main className="flex flex-1 flex-col overflow-y-auto pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <header className="flex h-12 shrink-0 items-center border-b border-holo-line-3 px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">나의 뱃지</span>
        <span className="ml-auto text-[13px] text-holo-ink-3">{stats.acquiredBadgeIds.length} / {BADGES.length}개</span>
      </header>

      {/* 현재 장착 뱃지 */}
      <section className="mx-4 flex items-center gap-3 rounded-[14px] bg-holo-lilac-card-2 px-4 py-3">
        {equippedImg ? (
          <img src={equippedImg.src} alt={equipped.label} className="h-12 w-12 object-contain" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-holo-surface-2" />
        )}
        <div>
          <p className="text-[12px] text-holo-ink-3">현재 장착 뱃지</p>
          <p className="mt-0.5 text-[15px] font-semibold text-holo-purple-mid">{equipped.label}</p>
        </div>
      </section>

      {/* 뱃지 그리드 — 획득 뱃지(최근순) 먼저, 미획득은 뒤에. */}
      <section className="mt-4 px-4">
        <div className="grid grid-cols-3 gap-3">
          {sortedBadges.map((b) => {
            const acquired = unlockedSet.has(b.id);
            const isEquipped = b.id === equippedId;
            const img = getBadgeById(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setModal({ id: b.id, isAcquired: acquired })}
                className={`relative flex flex-col items-center gap-2 rounded-[16px] border p-3 transition active:scale-95 ${
                  isEquipped
                    ? "border-holo-purple-mid bg-holo-purple-mid/5"
                    : acquired
                      ? "border-holo-line bg-white"
                      : "border-holo-line bg-holo-surface-2"
                }`}
              >
                {/* 장착 표시 */}
                {isEquipped && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-holo-purple-mid">
                    <CheckIcon />
                  </span>
                )}
                {/* 뱃지 이미지 */}
                <div className={`flex h-[60px] w-[60px] items-center justify-center ${!acquired ? "opacity-30 grayscale" : ""}`}>
                  {img ? (
                    <img src={img.src} alt={b.label} className="h-full w-full object-contain" />
                  ) : (
                    <div className="h-full w-full rounded-full bg-holo-surface-2" />
                  )}
                </div>
                <span className={`text-center text-[11px] font-semibold leading-tight ${acquired ? "text-holo-ink" : "text-holo-ink-4"}`}>
                  {b.label}
                </span>
                <span className="text-[10px] text-holo-ink-4">
                  {acquired
                    ? (getBadgeAcquiredDate(b.id) ?? b.date ?? "")
                    : "미획득"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 모달 */}
      {modal && modalBadge && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-[300px] rounded-[18px] bg-white p-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`mx-auto h-[80px] w-[80px] ${!modal.isAcquired ? "opacity-40 grayscale" : ""}`}>
              {modalImg ? (
                <img src={modalImg.src} alt={modalBadge.label} className="h-full w-full object-contain" />
              ) : (
                <div className="h-full w-full rounded-full bg-holo-surface-2" />
              )}
            </div>
            <p className="mt-3 text-[16px] font-bold text-holo-ink">{modalBadge.label}</p>
            {modalImg && (
              <p className="mt-1 text-[13px] text-holo-ink-3">"{modalImg.wittyCopy}"</p>
            )}

            {modal.isAcquired ? (
              <>
                {(() => {
                  const d = getBadgeAcquiredDate(modalBadge.id) ?? modalBadge.date;
                  return d ? (
                    <p className="mt-1 text-[12px] text-holo-ink-3">획득일 {d}</p>
                  ) : null;
                })()}
                <button
                  type="button"
                  onClick={() => {
                    setEquippedId(modalBadge.id);
                    storeSetBadge(modalBadge.id);
                    saveChoice("equippedBadgeId", modalBadge.id);
                    setModal(null);
                  }}
                  disabled={equippedId === modalBadge.id}
                  className={`mt-4 h-[46px] w-full rounded-holo-pill text-[14px] font-semibold transition ${
                    equippedId === modalBadge.id
                      ? "bg-holo-ink-4 text-white cursor-default"
                      : "bg-holo-gradient text-white active:scale-[0.99]"
                  }`}
                >
                  {equippedId === modalBadge.id ? "현재 장착 중" : "뱃지 장착하기"}
                </button>
              </>
            ) : (
              <>
                <p className="mt-3 text-[13px] font-semibold text-holo-ink-3">획득 조건</p>
                <p className="mt-1 text-[13px] leading-relaxed text-holo-ink">{modalBadge.condition}</p>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="mt-4 h-[46px] w-full rounded-holo-pill border border-holo-line text-[14px] text-holo-ink"
                >
                  닫기
                </button>
              </>
            )}
          </div>
        </div>
      )}
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

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m4 12 6 6 10-14" />
    </svg>
  );
}
