import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TITLES_META, type TitleMeta, type TitleTier } from "@/shared/mock/data";
import { useProfile } from "@/shared/hooks/use-profile";
import { setTitle as storeSetTitle } from "@/shared/stores/profile-store";
import { useAccountStats } from "@/shared/stores/account-stats-store";
import { saveChoice } from "@/shared/stores/account-choices-store";

/** 등급별 표시 메타 (라벨/색상). */
const TIER_DISPLAY: Record<
  TitleTier,
  { label: string; chipBg: string; chipText: string; ring: string }
> = {
  starter: {
    label: "가입 칭호",
    chipBg: "bg-holo-lilac-card-2",
    chipText: "text-holo-purple-mid",
    ring: "border-holo-purple-mid",
  },
  common: {
    label: "일반",
    chipBg: "bg-holo-surface-2",
    chipText: "text-holo-ink-2",
    ring: "border-holo-line",
  },
  rare: {
    label: "희귀",
    chipBg: "bg-[#E8F0FF]",
    chipText: "text-[#3366CC]",
    ring: "border-[#3366CC]/40",
  },
  legendary: {
    label: "전설",
    chipBg: "bg-[#FFF1D6]",
    chipText: "text-[#C77B00]",
    ring: "border-[#C77B00]/50",
  },
};

/**
 * 사용자에게 노출되는 탭 — 일반 / 희귀 / 전설 3개.
 * starter("가입 칭호") 는 별도 탭으로 분리하지 않고 "일반" 탭 안에 함께 보여준다.
 * (개수가 적고, 사용자 관점에선 가입 시점부터 가지고 있는 평범한 칭호로 인식되기 때문.)
 */
type VisibleTier = "common" | "rare" | "legendary";
const TIER_TABS: { id: VisibleTier; label: string }[] = [
  { id: "common", label: "일반" },
  { id: "rare", label: "희귀" },
  { id: "legendary", label: "전설" },
];

/** 어떤 탭에 어떤 tier 가 속하는지 — common 탭은 starter 도 포함. */
function tiersInTab(tab: VisibleTier): TitleTier[] {
  return tab === "common" ? ["starter", "common"] : [tab];
}

export function MyTitlesScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const stats = useAccountStats();
  const [selected, setSelected] = useState<string>(profile.title);
  /** 현재 선택된 탭 — 일반/희귀/전설 중 하나. 기본 "일반". */
  const [activeTier, setActiveTier] = useState<VisibleTier>("common");

  const unlockedTitles = useMemo(
    () => new Set(stats.acquiredTitles),
    [stats.acquiredTitles],
  );

  /** 활성 탭에 속하는 tier 집합 — common 탭이면 starter 도 포함. */
  const tierSet = useMemo(() => new Set<TitleTier>(tiersInTab(activeTier)), [activeTier]);

  /** 활성 탭의 획득한 칭호 — TITLES_META 원래 순서 유지. */
  const acquiredList = useMemo<TitleMeta[]>(
    () =>
      TITLES_META.filter((t) => unlockedTitles.has(t.name) && tierSet.has(t.tier)),
    [unlockedTitles, tierSet],
  );

  /** 활성 탭의 미획득(잠긴) 칭호. starter 는 가입 즉시 보유라 보통 비어있음. */
  const lockedList = useMemo<TitleMeta[]>(
    () =>
      TITLES_META.filter((t) => !unlockedTitles.has(t.name) && tierSet.has(t.tier)),
    [unlockedTitles, tierSet],
  );

  const handleEquip = (name: string) => {
    if (!unlockedTitles.has(name)) return;
    setSelected(name);
    storeSetTitle(name);
    saveChoice("title", name);
  };

  return (
    <main className="flex flex-1 flex-col overflow-y-auto pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          나의 칭호
        </span>
        <span className="ml-auto text-[13px] text-holo-ink-3">
          {stats.acquiredTitles.length} / {TITLES_META.length}개
        </span>
      </header>

      {/* 현재 장착 칭호 */}
      <section className="mx-4 rounded-[14px] bg-holo-lilac-card-2 px-4 py-3">
        <p className="text-[12px] text-holo-ink-3">현재 장착 칭호</p>
        <p className="mt-1 text-[15px] font-semibold text-holo-purple-mid">
          {selected}
        </p>
      </section>

      <p className="mt-3 px-4 text-[12px] text-holo-ink-3">
        보유한 칭호를 눌러 변경할 수 있어요
      </p>

      {/* ── 등급별 탭 — 일반 / 희귀 / 전설 ── */}
      <div className="mt-3 flex gap-2 px-4">
        {TIER_TABS.map((tab) => {
          const on = activeTier === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTier(tab.id)}
              className={`flex-1 rounded-full py-1.5 text-[13px] font-semibold transition ${
                on
                  ? "bg-holo-purple-mid text-white shadow-sm"
                  : "bg-holo-surface-2 text-holo-ink-3"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 1) 보유한 칭호 (활성 탭 기준) ── */}
      <section className="mt-4 px-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-holo-ink">
              보유한 칭호
            </span>
            <TierBadge tier={activeTier} />
          </div>
          <span className="text-[12px] text-holo-ink-3">
            {acquiredList.length}개
          </span>
        </div>
        {acquiredList.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-holo-line bg-white py-6 text-center text-[12px] text-holo-ink-3">
            아직 획득한 칭호가 없어요
          </p>
        ) : (
          // 항목 텍스트가 길어져서 한 행에 2개씩 들어가는 2열 그리드로 노출.
          <ul className="grid grid-cols-2 gap-2">
            {acquiredList.map((t) => (
              <TitleCard
                key={t.name}
                title={t}
                unlocked={true}
                on={selected === t.name}
                onClick={() => handleEquip(t.name)}
                showTierChip
              />
            ))}
          </ul>
        )}
      </section>

      {/* ── 2) 획득 가능한 칭호 (활성 탭 기준, 잠금) ── */}
      {lockedList.length > 0 && (
        <section className="mt-5 px-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-holo-ink">
                획득 가능한 칭호
              </span>
              <TierBadge tier={activeTier} />
            </div>
            <span className="text-[12px] text-holo-ink-3">
              {lockedList.length}개
            </span>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {lockedList.map((t) => (
              <TitleCard
                key={t.name}
                title={t}
                unlocked={false}
                showTierChip
                on={false}
                onClick={() => undefined}
              />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

/**
 * 섹션 헤더 옆에 붙는 등급 라벨 칩 — "일반" / "희귀" / "전설".
 * 활성 탭의 색상(TIER_DISPLAY)을 그대로 따라가서 어떤 등급을 보고 있는지 명확.
 */
function TierBadge({ tier }: { tier: VisibleTier }) {
  const d = TIER_DISPLAY[tier];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${d.chipBg} ${d.chipText}`}
    >
      {d.label}
    </span>
  );
}

/**
 * 칭호 카드 — 2열 그리드용. 보유/잠금 상태에 따라 스타일 분기.
 * 그리드 셀 너비가 좁아 텍스트가 줄바꿈될 수 있어 break-keep + leading-snug 로 보기 좋게 정리.
 */
function TitleCard({
  title,
  unlocked,
  on,
  onClick,
  showTierChip,
}: {
  title: TitleMeta;
  unlocked: boolean;
  on: boolean;
  onClick: () => void;
  showTierChip?: boolean;
}) {
  const tierDisplay = TIER_DISPLAY[title.tier];
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={!unlocked}
        className={`flex h-full w-full flex-col rounded-[12px] border px-3 py-2.5 text-left transition ${
          on
            ? "border-holo-purple-mid bg-holo-purple-mid text-white shadow-sm"
            : unlocked
              ? `${tierDisplay.ring} bg-white text-holo-ink hover:border-holo-purple-mid hover:text-holo-purple-mid`
              : "cursor-not-allowed border-holo-line bg-holo-surface-2 text-holo-ink-4"
        }`}
      >
        {/* 등급 칩 / 잠금 / 장착 표시 — 한 줄에 한 개만 들어가도록 카드 상단에 별도 배치 */}
        <span className="mb-1 flex min-h-[18px] items-center gap-1">
          {showTierChip && !on && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tierDisplay.chipBg} ${tierDisplay.chipText}`}
            >
              {tierDisplay.label}
            </span>
          )}
          {on && (
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold">
              장착 중
            </span>
          )}
          {!unlocked && (
            <span className="ml-auto text-[11px]" aria-label="잠김">
              🔒
            </span>
          )}
        </span>
        <span className="break-keep text-[13px] font-semibold leading-snug">
          {title.name}
        </span>
        <span
          className={`mt-1 break-keep text-[11px] leading-snug ${
            on
              ? "text-white/85"
              : unlocked
                ? "text-holo-ink-3"
                : "text-holo-ink-4"
          }`}
        >
          {title.condition}
        </span>
      </button>
    </li>
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
