import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/shared/hooks/use-profile";
import { useAccountStats } from "@/shared/stores/account-stats-store";
import { ConfirmModal } from "@/shared/components/confirm-modal";
import { ME_PERSONA } from "../home/home-faces";
import { CATEGORIES, clampPlacement, DEFAULT_PLACEMENT, furnitureSrc, type CategoryKey, type PlacedFurniture } from "./myroom-data";
import type { CatalogItem } from "./myroom-data";
import { CATALOG } from "./myroom-catalog";
import { getPlacementWidth, getPlacementHeight } from "./myroom-dimensions";
import { RoomEditorView } from "./myroom-room-view";
import { StatusBubble } from "./myroom-status-bubble";
import {
  getLastSeenLevel,
  isNewlyUnlocked,
  purchaseItem,
  setLastSeenLevel,
  setMyroomItems,
  setStatusMessage,
  setStatusPosition,
  spendPoints,
  useMyroomItems,
  useOwnedSet,
  usePoints,
  useStatusMessage,
  useStatusPosition,
} from "./myroom-store";

export function MyroomScreen() {
  const navigate = useNavigate();
  const items = useMyroomItems();
  const owned = useOwnedSet();
  const points = usePoints();
  const profile = useProfile();
  // 실제 로그인 계정 레벨 — ME.level 은 mock 고정값(1)이라 가구 해금/Lv 표시가 어긋남.
  const { level } = useAccountStats();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<CategoryKey>("all");
  /** 구매 확인 다이얼로그 대상 (null = 닫힘) */
  const [pendingPurchase, setPendingPurchase] = useState<CatalogItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** 수정완료 확인 다이얼로그 열림 여부 */
  const [confirmDoneOpen, setConfirmDoneOpen] = useState(false);
  /** 뒤로가기(취소) 확인 다이얼로그 열림 여부 */
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  /** 화면 진입 시점의 방 상태 스냅샷 — "아니오" 시 복원용 */
  const [initialSnapshot] = useState<PlacedFurniture[]>(() => items);
  // 상태메시지/말풍선 위치도 진입 시점을 캡처 — 취소 시 가구뿐 아니라 이것들도 되돌린다.
  // (StatusBubble 은 편집/드래그 즉시 store+localStorage 에 저장하므로 복원 안 하면 남는다.)
  const statusMsg = useStatusMessage();
  const statusPos = useStatusPosition();
  const [statusSnapshot] = useState(() => statusMsg);
  const [statusPosSnapshot] = useState(() => statusPos);
  /** 카탈로그 드로어 펼침 상태 — 클릭/스크롤 시 100px 위로 올라옴 */
  const [catalogExpanded, setCatalogExpanded] = useState(false);
  const expandCatalog = () => setCatalogExpanded(true);

  /** 방 안의 가구 선택 → 드로어도 닫힘 (드로어가 가구를 가리지 않게) */
  const handleSelectInRoom = (id: string | null) => {
    setSelectedId(id);
    if (id !== null) setCatalogExpanded(false);
  };
  // 화면 진입 시점의 lastSeenLevel 을 캡쳐 → 이번 화면에서는 NEW 가 유지됨
  const [lastSeen] = useState(() => getLastSeenLevel(level));

  const confirmPurchase = () => {
    if (!pendingPurchase) return;
    const ok = spendPoints(pendingPurchase.price ?? 0, {
      title: "아이템 구매",
      note: pendingPurchase.label,
    });
    if (ok) {
      purchaseItem(pendingPurchase.kind, pendingPurchase.variant);
    } else {
      // 포인트 부족 — 이전엔 아무 피드백 없이 모달만 닫혀 '눌렀는데 아무 일 없음' 경험이었다.
      setToast("포인트가 부족해요");
      window.setTimeout(() => setToast(null), 1800);
    }
    setPendingPurchase(null);
  };

  const handleDone = () => {
    setConfirmDoneOpen(true);
  };

  /** "네" — 변경사항 그대로 저장 (이미 store 에 영구 저장됨) */
  const confirmDone = () => {
    setLastSeenLevel(level); // NEW 뱃지 초기화
    setConfirmDoneOpen(false);
    navigate(-1);
  };

  /** 뒤로가기 클릭 → 취소 확인 모달 */
  const handleBack = () => {
    setConfirmCancelOpen(true);
  };
  /** "네" — 수정 취소: 진입 시점 스냅샷(가구 + 상태메시지 + 말풍선 위치) 복원 후 뒤로 */
  const confirmCancel = () => {
    setMyroomItems(initialSnapshot);
    setStatusMessage(statusSnapshot);
    setStatusPosition(statusPosSnapshot);
    setConfirmCancelOpen(false);
    navigate(-1);
  };
  /** "아니오" — 모달만 닫고 화면에 머무름 */
  const dismissCancel = () => {
    setConfirmCancelOpen(false);
  };

  const filtered = useMemo(() => {
    if (activeCat === "all") {
      // 전체 탭: 잠금 레벨 오름차순 (해금된 건 0 으로 취급해 맨 앞)
      return [...CATALOG].sort((a, b) => (a.lockedAt ?? 0) - (b.lockedAt ?? 0));
    }
    return CATALOG.filter((c) => c.kind === activeCat);
  }, [activeCat]);

  const handleRemove = (id: string) => {
    setMyroomItems(items.filter((i) => i.id !== id));
    setSelectedId(null);
  };
  const handleFlip = (id: string) => {
    setMyroomItems(items.map((i) => (i.id === id ? { ...i, flipped: !i.flipped } : i)));
  };
  const handleMove = (id: string, x: number, y: number) => {
    setMyroomItems(
      items.map((i) => {
        if (i.id !== id) return i;
        // height 를 함께 넘겨야 가구 바닥이 룸 영역을 넘어가지 않도록 정확히 클램프된다.
        const h = getPlacementHeight(i.kind, i.variant);
        return { ...i, ...clampPlacement(x, y, i.width, h) };
      }),
    );
  };

  /** 한 단계 앞으로 (배열 끝쪽으로) → 다른 가구 위에 표시됨 */
  const handleBringForward = (id: string) => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1 || idx === items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setMyroomItems(next);
  };

  /** 한 단계 뒤로 (배열 앞쪽으로) → 다른 가구 아래로 가려짐 */
  const handleSendBackward = (id: string) => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx <= 0) return;
    const next = [...items];
    [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
    setMyroomItems(next);
  };

  /** 카탈로그 카드 클릭 → 마이룸에 배치하거나 이미 있으면 선택 */
  const handlePlaceFromCatalog = (item: CatalogItem) => {
    const isLocked = item.lockedAt !== undefined && item.lockedAt > level;
    const ownedKey = `${item.kind}:${item.variant}`;
    if (isLocked || !owned.has(ownedKey)) return;

    const existing = items.find((i) => i.kind === item.kind && i.variant === item.variant);
    if (existing) {
      setSelectedId(existing.id);
    } else {
      const d = DEFAULT_PLACEMENT[item.kind];
      const width = getPlacementWidth(item.kind, item.variant);
      const height = getPlacementHeight(item.kind, item.variant);
      const safe = clampPlacement(d.x, d.y, width, height);
      const placed: PlacedFurniture = {
        id: `${item.kind}-${item.variant}-${Date.now()}`,
        kind: item.kind,
        variant: item.variant,
        flipped: d.flipped ?? false,
        x: safe.x,
        y: safe.y,
        width,
      };
      setMyroomItems([...items, placed]);
      setSelectedId(placed.id);
    }
    setCatalogExpanded(false); // 가구 선택 시 드로어 다시 내려감
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <main className="flex flex-1 min-h-0 flex-col overflow-hidden px-4 pt-2">
      <header className="flex shrink-0 items-center justify-between pb-3">
        <div className="flex items-center">
          <button type="button" aria-label="뒤로" onClick={handleBack} className="p-1">
            <BackIcon />
          </button>
          <span className="ml-1 text-[16px] font-semibold text-holo-ink">마이룸 꾸미기</span>
        </div>
        <button
          type="button"
          onClick={handleDone}
          className="px-1 text-[16px] font-bold text-holo-purple-mid active:opacity-60"
        >
          완료
        </button>
      </header>

      <div className="flex shrink-0 items-center gap-3 pb-3">
        <img
          src={profile.profileFace ?? ME_PERSONA.face}
          alt={profile.nickname}
          className="h-12 w-12 rounded-full object-cover"
          draggable={false}
        />
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2">
            <span className="rounded-[4px] bg-holo-gradient-soft px-2 py-0.5 text-[11px] font-semibold text-white">
              Lv.{level}
            </span>
            <span className="text-[15px] font-semibold text-holo-ink">{profile.nickname}</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-holo-ink-3">
            내 포인트 <span className="font-semibold text-holo-purple-text">{points} P</span>
          </div>
        </div>
      </div>

      <div
        onClick={() => {
          if (catalogExpanded) setCatalogExpanded(false);
        }}
        className={`relative -mx-4 flex shrink-0 justify-center transition-[height] duration-300 ${
          catalogExpanded ? "h-[160px] overflow-hidden" : "h-[360px] overflow-visible"
        }`}
      >
        <RoomEditorView
          items={items}
          selectedId={selectedId}
          onSelect={handleSelectInRoom}
          onRemove={handleRemove}
          onFlip={handleFlip}
          onMove={handleMove}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
        />
        <StatusBubble />
      </div>

      {/* 카테고리 칩 — 고정 영역 (스크롤되지 않음) */}
      <div
        onClick={expandCatalog}
        className="no-scrollbar -mx-4 mt-2 shrink-0 overflow-x-auto px-4 py-2"
      >
        <div className="flex w-max gap-2">
          {CATEGORIES.map((c) => {
            const on = activeCat === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setActiveCat(c.key)}
                className={`shrink-0 rounded-[20px] px-4 py-1.5 text-[14px] ${
                  on
                    ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                    : "border border-holo-line text-holo-ink"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 카탈로그 그리드 — 자기 영역 안에서만 스크롤 */}
      <div
        onClick={expandCatalog}
        onScroll={expandCatalog}
        className="no-scrollbar -mx-4 flex flex-1 min-h-0 flex-col overflow-y-auto px-4 pb-6"
      >
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {filtered.map((it) => {
          const ownedKey = `${it.kind}:${it.variant}`;
          const isLocked = it.lockedAt !== undefined && it.lockedAt > level;
          const isItemOwned = owned.has(ownedKey);
          const canPlace = isItemOwned && !isLocked;
          return (
          <div key={it.id} className="flex flex-col">
            <article
              onClick={(e) => {
                e.stopPropagation();
                // 소유한 가구만 배치 + 드로어 닫힘. 미소유는 아무 동작 안 함 (구매 버튼 별도)
                if (canPlace) handlePlaceFromCatalog(it);
              }}
              className={`relative flex aspect-square flex-col overflow-hidden rounded-holo-input bg-holo-surface-2 p-3 ${canPlace ? "cursor-pointer transition-shadow hover:shadow-md" : ""}`}
            >
              {isNewlyUnlocked(it.lockedAt, level, lastSeen) && (
                <span className="absolute left-2 top-2 z-10 rounded-[10px] bg-holo-gradient-soft px-2 py-0.5 text-[10px] font-semibold text-white">
                  NEW
                </span>
              )}
              <div className="flex flex-1 items-center justify-center overflow-hidden">
                <img
                  src={furnitureSrc({ kind: it.kind, variant: it.variant, flipped: false })}
                  alt={it.label}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              {it.lockedAt !== undefined && it.lockedAt > level && (
                <div className="absolute inset-0 flex items-center justify-center rounded-holo-input bg-black/40">
                  <LockIcon />
                </div>
              )}
              {it.price !== undefined && !isLocked && !isItemOwned && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingPurchase(it);
                  }}
                  className="absolute bottom-3 left-3 right-3 z-10 rounded-full py-[6px] text-center text-[13px] tracking-tight text-white shadow-[0_3px_8px_rgba(255,108,184,0.35)]"
                  style={{ background: "#FF6CB8" }}
                >
                  <span style={{ fontWeight: 300 }}>{it.price}</span>
                  <span className="font-bold">P</span>
                  <span style={{ fontWeight: 300 }}> · 구매하기</span>
                </button>
              )}
            </article>
            <span className="mt-2 text-center text-[13px] font-medium text-holo-ink">
              {it.lockedAt !== undefined && it.lockedAt > level
                ? `Lv.${it.lockedAt} 달성 시 해금`
                : it.label}
            </span>
          </div>
          );
        })}
        </div>
      </div>

      <ConfirmModal
        open={pendingPurchase !== null}
        message={
          pendingPurchase ? (
            <>
              <span className="font-bold text-holo-purple-mid">{pendingPurchase.label}</span>
              {"을(를) "}
              <span className="font-bold text-holo-pink">{pendingPurchase.price}P</span>
              {"를 사용하여 구매하시겠습니까?"}
            </>
          ) : null
        }
        onConfirm={confirmPurchase}
        onCancel={() => setPendingPurchase(null)}
      />

      <ConfirmModal
        open={confirmDoneOpen}
        message={"마이룸 수정을 완료하시겠습니까?"}
        onConfirm={confirmDone}
        // 배경 탭/취소는 '모달만 닫기'. cancelDone(되돌리기+이탈)으로 라우팅하면
        // 저장하려고 연 모달에서 배경을 잘못 눌렀을 때 편집 내용이 전부 폐기된다.
        onCancel={() => setConfirmDoneOpen(false)}
      />

      <ConfirmModal
        open={confirmCancelOpen}
        message={
          <>
            마이룸 수정을 취소하시겠습니까?
            <br />
            <span className="text-[12px] font-normal text-holo-ink-3">
              (저장 안하시면 수정사항이 반영되지 않습니다)
            </span>
          </>
        }
        onConfirm={confirmCancel}
        onCancel={dismissCancel}
      />

      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[1100] -translate-x-1/2 whitespace-nowrap rounded-full bg-holo-ink/90 px-4 py-2 text-[13px] font-medium text-white">
          {toast}
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

function LockIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
