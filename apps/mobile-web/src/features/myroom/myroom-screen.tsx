import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ME } from "@/shared/mock/data";
import { ConfirmModal } from "@/shared/components/confirm-modal";
import { ME_PERSONA } from "../home/home-faces";
import { CATEGORIES, clampPlacement, DEFAULT_PLACEMENT, furnitureSrc, type CategoryKey, type PlacedFurniture } from "./myroom-data";
import type { CatalogItem } from "./myroom-data";
import { CATALOG } from "./myroom-catalog";
import { getPlacementWidth } from "./myroom-dimensions";
import { RoomEditorView } from "./myroom-room-view";
import { StatusBubble } from "./myroom-status-bubble";
import {
  getLastSeenLevel,
  isNewlyUnlocked,
  purchaseItem,
  setLastSeenLevel,
  setMyroomItems,
  spendPoints,
  useMyroomItems,
  useOwnedSet,
  usePoints,
} from "./myroom-store";

export function MyroomScreen() {
  const navigate = useNavigate();
  const items = useMyroomItems();
  const owned = useOwnedSet();
  const points = usePoints();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<CategoryKey>("all");
  /** 구매 확인 다이얼로그 대상 (null = 닫힘) */
  const [pendingPurchase, setPendingPurchase] = useState<CatalogItem | null>(null);
  /** 수정완료 확인 다이얼로그 열림 여부 */
  const [confirmDoneOpen, setConfirmDoneOpen] = useState(false);
  /** 뒤로가기(취소) 확인 다이얼로그 열림 여부 */
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  /** 화면 진입 시점의 방 상태 스냅샷 — "아니오" 시 복원용 */
  const [initialSnapshot] = useState<PlacedFurniture[]>(() => items);
  /** 카탈로그 드로어 펼침 상태 — 클릭/스크롤 시 100px 위로 올라옴 */
  const [catalogExpanded, setCatalogExpanded] = useState(false);
  const expandCatalog = () => setCatalogExpanded(true);

  /** 방 안의 가구 선택 → 드로어도 닫힘 (드로어가 가구를 가리지 않게) */
  const handleSelectInRoom = (id: string | null) => {
    setSelectedId(id);
    if (id !== null) setCatalogExpanded(false);
  };
  // 화면 진입 시점의 lastSeenLevel 을 캡쳐 → 이번 화면에서는 NEW 가 유지됨
  const [lastSeen] = useState(() => getLastSeenLevel(ME.level));

  const confirmPurchase = () => {
    if (!pendingPurchase) return;
    const ok = spendPoints(pendingPurchase.price ?? 0);
    if (ok) {
      purchaseItem(pendingPurchase.kind, pendingPurchase.variant);
    }
    setPendingPurchase(null);
  };

  const handleDone = () => {
    setConfirmDoneOpen(true);
  };

  /** "네" — 변경사항 그대로 저장 (이미 store 에 영구 저장됨) */
  const confirmDone = () => {
    setLastSeenLevel(ME.level); // NEW 뱃지 초기화
    setConfirmDoneOpen(false);
    navigate(-1);
  };

  /** "아니오" — 진입 시점 스냅샷으로 되돌림 */
  const cancelDone = () => {
    setMyroomItems(initialSnapshot);
    setConfirmDoneOpen(false);
    navigate(-1);
  };

  /** 뒤로가기 클릭 → 취소 확인 모달 */
  const handleBack = () => {
    setConfirmCancelOpen(true);
  };
  /** "네" — 수정 취소: 진입 시점 스냅샷 복원 후 뒤로 */
  const confirmCancel = () => {
    setMyroomItems(initialSnapshot);
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
      items.map((i) =>
        i.id === id ? { ...i, ...clampPlacement(x, y, i.width) } : i,
      ),
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
  return <div className="flex flex-1 items-center justify-center text-holo-ink-3">My Room</div>;
}
