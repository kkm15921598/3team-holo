import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignupLayout } from "./signup-layout";
import { ConfirmModal } from "@/shared/components/confirm-modal";
import { useSignup } from "@/shared/contexts/signup-context";
import {
  CATEGORIES,
  clampPlacement,
  DEFAULT_PLACEMENT,
  furnitureSrc,
  type CategoryKey,
  type PlacedFurniture,
} from "../myroom/myroom-data";
import type { CatalogItem } from "../myroom/myroom-data";
import { CATALOG } from "../myroom/myroom-catalog";
import { getPlacementWidth } from "../myroom/myroom-dimensions";
import { RoomEditorView } from "../myroom/myroom-room-view";
import { setMyroomItems, purchaseItem, addPoints } from "../myroom/myroom-store";
import {
  setNickname,
  setProfileFace,
} from "@/shared/stores/profile-store";

const SIGNUP_BONUS_POINTS = 500;

const MAX_BUY_COUNT = 2;
const TUTORIAL_LEVEL = 1;

export function RoomScreen() {
  const navigate = useNavigate();
  const { data } = useSignup();

  const displayName = data.nickname || data.userId || "회원";

  const [activeCat, setActiveCat] = useState<CategoryKey>("all");
  const [items, setItems] = useState<PlacedFurniture[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ownedKeys, setOwnedKeys] = useState<Set<string>>(new Set());
  const [pendingPurchase, setPendingPurchase] = useState<CatalogItem | null>(null);
  const [limitAlertOpen, setLimitAlertOpen] = useState(false);
  const [showError, setShowError] = useState(false);

  const filtered = useMemo(() => {
    const levelOneItems = CATALOG.filter(
      (item) => item.lockedAt === undefined || item.lockedAt <= TUTORIAL_LEVEL
    );

    if (activeCat === "all") return levelOneItems;

    return levelOneItems.filter((item) => item.kind === activeCat);
  }, [activeCat]);

  const canNext = items.length >= MAX_BUY_COUNT;

  const handleSelectInRoom = (id: string | null) => {
    setSelectedId(id);
  };

  const handleRemove = (id: string) => {
    const removed = items.find((i) => i.id === id);

    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);

    if (removed) {
      const ownedKey = `${removed.kind}:${removed.variant}`;
      setOwnedKeys((prev) => {
        const next = new Set(prev);
        next.delete(ownedKey);
        return next;
      });
    }

    setShowError(false);
  };

  const handleFlip = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, flipped: !i.flipped } : i))
    );
  };

  const handleMove = (id: string, x: number, y: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, ...clampPlacement(x, y, i.width) } : i
      )
    );
  };

  const handleBringForward = (id: string) => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1 || idx === items.length - 1) return;

    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setItems(next);
  };

  const handleSendBackward = (id: string) => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx <= 0) return;

    const next = [...items];
    [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
    setItems(next);
  };

  const handleRequestPurchase = (item: CatalogItem) => {
    const isLocked = item.lockedAt !== undefined && item.lockedAt > TUTORIAL_LEVEL;
    if (isLocked) return;

    const ownedKey = `${item.kind}:${item.variant}`;
    const alreadyOwned = ownedKeys.has(ownedKey);

    if (alreadyOwned) return;

    if (ownedKeys.size >= MAX_BUY_COUNT) {
      setLimitAlertOpen(true);
      return;
    }

    setPendingPurchase(item);
  };

  const confirmTutorialPurchase = () => {
    if (!pendingPurchase) return;

    const item = pendingPurchase;
    const ownedKey = `${item.kind}:${item.variant}`;
    const alreadyOwned = ownedKeys.has(ownedKey);

    if (!alreadyOwned && ownedKeys.size >= MAX_BUY_COUNT) {
      setLimitAlertOpen(true);
      setPendingPurchase(null);
      return;
    }

    if (!alreadyOwned) {
      setOwnedKeys((prev) => {
        const next = new Set(prev);
        next.add(ownedKey);
        return next;
      });
    }

    const existing = items.find(
      (i) => i.kind === item.kind && i.variant === item.variant
    );

    if (existing) {
      setSelectedId(existing.id);
      setPendingPurchase(null);
      return;
    }

    const d = DEFAULT_PLACEMENT[item.kind];
    const width = getPlacementWidth(item.kind, item.variant);
    const safe = clampPlacement(d.x, d.y, width);

    const placed: PlacedFurniture = {
      id: `${item.kind}-${item.variant}-${Date.now()}`,
      kind: item.kind,
      variant: item.variant,
      flipped: d.flipped ?? false,
      x: safe.x,
      y: safe.y,
      width,
    };

    setItems((prev) => [...prev, placed]);
    setSelectedId(placed.id);
    setShowError(false);
    setPendingPurchase(null);
  };

  const handleNext = () => {
  if (!canNext) {
    setShowError(true);
    return;
  }

  // 회원가입 마지막 단계에서 배치/구매한 가구를 myroom store 에 저장.
  // → 홈 화면 RoomScene 과 마이룸 화면에 동일한 배치가 그대로 노출된다.
  setMyroomItems(items);
  ownedKeys.forEach((key) => {
    const [kind, variant] = key.split(":");
    if (kind && variant) purchaseItem(kind, variant);
  });

  // 닉네임·프로필 얼굴을 profile-store 에 반영해 홈/마이페이지 전반에 노출.
  if (data.nickname.trim()) setNickname(data.nickname.trim());
  if (data.profileFace) setProfileFace(data.profileFace);

  // 가입 보너스 포인트 적립
  addPoints(SIGNUP_BONUS_POINTS);

  localStorage.setItem(
    "holoUser",
    JSON.stringify({
      userId: data.userId,
      nickname: data.nickname,
      name: data.name,
      phone: data.phone,
      interests: data.interests,
      customInterest: data.customInterest,
    })
  );

  // 환영 모달은 홈 화면에 진입한 뒤에 보이도록 sessionStorage 에 플래그를 남기고
  // 즉시 홈으로 이동한다.
  try {
    window.sessionStorage.setItem("holo:welcomeBonus", String(SIGNUP_BONUS_POINTS));
  } catch {
    // ignore
  }
  navigate("/home", { replace: true });
};

  return (
    <SignupLayout step={7}>
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
        거의 다 왔습니다!
        <br />
        <span className="text-holo-purple-mid">{displayName}</span> 님의 방을 꾸며보세요!
      </h1>

      <p className="mt-2 text-[14px] text-holo-ink-3">
        마음에 드는 가구 2개를 구매하고 방에 배치해보세요.
      </p>

      <div className="relative -mx-4 mt-4 flex h-[340px] shrink-0 justify-center overflow-hidden">
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
      </div>

      <div className="no-scrollbar -mx-4 mt-2 shrink-0 overflow-x-auto px-4 py-2">
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

      <div className="no-scrollbar -mx-4 flex flex-1 min-h-0 flex-col overflow-y-auto px-4 pb-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          {filtered.map((it) => {
            const ownedKey = `${it.kind}:${it.variant}`;
            const alreadyOwned = ownedKeys.has(ownedKey);

            return (
              <div key={it.id} className="flex flex-col">
                <article className="relative flex aspect-square flex-col overflow-hidden rounded-holo-input bg-holo-surface-2 p-3">
                  <div className="flex flex-1 items-center justify-center overflow-hidden">
                    <img
                      src={furnitureSrc({
                        kind: it.kind,
                        variant: it.variant,
                        flipped: false,
                      })}
                      alt={it.label}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {!alreadyOwned && (
                    <button
                      type="button"
                      onClick={() => handleRequestPurchase(it)}
                      className="absolute bottom-3 left-3 right-3 z-10 rounded-full bg-[#FF6CB8] py-[6px] text-center text-[13px] tracking-tight text-white shadow-[0_3px_8px_rgba(255,108,184,0.35)]"
                    >
                      구매하기
                    </button>
                  )}
                </article>

                <span className="mt-2 text-center text-[13px] font-medium text-holo-ink">
                  {it.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-auto flex flex-col items-center gap-2 pt-4">
        {showError && (
          <p className="text-[13px] text-holo-error">
            가구 2개를 구매하고 배치해주세요!
          </p>
        )}

        <button
          type="button"
          onClick={handleNext}
          className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
            canNext ? "bg-holo-ink" : "bg-holo-ink-4"
          }`}
        >
          다음
        </button>
      </div>

      <ConfirmModal
        open={pendingPurchase !== null}
        message={
          pendingPurchase ? (
            <>
              <span className="font-bold text-holo-purple-mid">
                {pendingPurchase.label}
              </span>
              {"을(를) 구매하고 방에 배치해볼까요?"}
            </>
          ) : null
        }
        onConfirm={confirmTutorialPurchase}
        onCancel={() => setPendingPurchase(null)}
      />

      <TutorialAlertModal
        open={limitAlertOpen}
        message="이미 2개를 구매하셨습니다."
        onClose={() => setLimitAlertOpen(false)}
      />
    </SignupLayout>
  );
}

function TutorialAlertModal({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-[320px] rounded-[24px] bg-white px-5 py-6 shadow-lg">
        <p className="text-center text-[15px] font-medium leading-relaxed text-holo-ink">
          {message}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-[44px] w-full rounded-full bg-holo-purple-mid text-[14px] font-semibold text-white"
        >
          확인
        </button>
      </div>
    </div>
  );
}