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

const TIER_ORDER: TitleTier[] = ["starter", "common", "rare", "legendary"];

export function MyTitlesScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const stats = useAccountStats();
  const [selected, setSelected] = useState<string>(profile.title);

  const unlockedTitles = useMemo(
    () => new Set(stats.acquiredTitles),
    [stats.acquiredTitles],
  );

  /** 획득한 칭호 — TITLES_META 원래 순서를 유지하면서 보유한 것만 추림. */
  const acquiredList = useMemo<TitleMeta[]>(
    () => TITLES_META.filter((t) => unlockedTitles.has(t.name)),
    [unlockedTitles],
  );

  /** 미획득(잠긴) 칭호 — 등급별로 분리. starter 는 보통 가입 즉시 보유라 미획득 섹션에선 비어있게 됨. */
  const lockedGroups = useMemo(() => {
    const map: Record<TitleTier, TitleMeta[]> = {
      starter: [],
      common: [],
      rare: [],
      legendary: [],
    };
    for (const t of TITLES_META) {
      if (!unlockedTitles.has(t.name)) map[t.tier].push(t);
    }
    return map;
  }, [unlockedTitles]);

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

      {/* ── 1) 보유한 칭호 — 등급 무관 상단 노출 ── */}
      <section className="mt-3 px-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[13px] font-semibold text-holo-ink">
            보유한 칭호
          </span>
          <span className="text-[12px] text-holo-ink-3">
            {acquiredList.length}개
          </span>
        </div>
        {acquiredList.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-holo-line bg-white py-6 text-center text-[12px] text-holo-ink-3">
            아직 획득한 칭호가 없어요
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
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

      {/* ── 2) 획득 가능한 칭호 (등급별, 잠금 상태) ── */}
      {TIER_ORDER.map((tier) => {
        const list = lockedGroups[tier];
        if (list.length === 0) return null;
        const tierDisplay = TIER_DISPLAY[tier];
        // 전체 등급 보유율도 같이 노출하면 진행도를 가늠하기 쉬움
        const total = TITLES_META.filter((t) => t.tier === tier).length;
        const acquiredInTier = total - list.length;
        return (
          <section key={tier} className="mt-5 px-4">
            <div className="mb-2 flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tierDisplay.chipBg} ${tierDisplay.chipText}`}
                >
                  {tierDisplay.label}
                </span>
                <span className="text-[13px] font-semibold text-holo-ink">
                  획득 가능한 칭호
                </span>
              </div>
              <span className="text-[12px] text-holo-ink-3">
                {acquiredInTier} / {total}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {list.map((t) => (
                <TitleCard
                  key={t.name}
                  title={t}
                  unlocked={false}
                  on={false}
                  onClick={() => undefined}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}

/** 칭호 카드 — 보유/잠금 상태에 따라 스타일 분기. showTierChip 시 등급 칩을 함께 노출. */
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
        className={`flex w-full flex-col rounded-[12px] border px-4 py-3 text-left transition ${
          on
            ? "border-holo-purple-mid bg-holo-purple-mid text-white shadow-sm"
            : unlocked
              ? `${tierDisplay.ring} bg-white text-holo-ink hover:border-holo-purple-mid hover:text-holo-purple-mid`
              : "cursor-not-allowed border-holo-line bg-holo-surface-2 text-holo-ink-4"
        }`}
      >
        <span className="flex items-center gap-2">
          <span className="flex-1 text-[14px] font-semibold">
            {title.name}
          </span>
          {showTierChip && !on && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tierDisplay.chipBg} ${tierDisplay.chipText}`}
            >
              {tierDisplay.label}
            </span>
          )}
          {!unlocked && <span className="text-[11px]">🔒</span>}
          {on && (
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold">
              장착 중
            </span>
          )}
        </span>
        <span
          className={`mt-1 text-[12px] ${
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
