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
import { getPlacementWidth, getPlacementHeight } from "../myroom/myroom-dimensions";
import { RoomEditorView } from "../myroom/myroom-room-view";
import { setMyroomItems, grantOwnedFurniture, addPoints } from "../myroom/myroom-store";
import {
  setNickname,
  setProfileFace,
  setFriendCode,
  setEquippedBadgeId,
  setTitle as setEquippedTitle,
} from "@/shared/stores/profile-store";
import {
  recordBadgeAcquired,
  recordTitleAcquired,
} from "@/shared/stores/account-stats-store";
import { resetAllStoresForFreshSignup } from "@/shared/lib/fresh-signup-reset";
import { setCurrentAccount } from "@/shared/stores/account-choices-store";
import { exitGuestMode } from "@/shared/stores/guest-store";
import { setPhoneVerified } from "@/shared/stores/verification-store";
import {
  pushRewardNotification,
  pushWelcomeNotification,
} from "@/shared/stores/notifications-store";

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
  // 스와이프/드로어 동작은 제거 — 화면 전체가 자연스럽게 스크롤되는 긴 페이지로 동작.

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
    // 방에서만 빼고 ownedKeys 는 유지한다 — 한 번 구매한 가구는 카탈로그에서
    // 다시 클릭만 해도 즉시 재배치되도록.
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
    setShowError(false);
  };

  const handleFlip = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, flipped: !i.flipped } : i))
    );
  };

  const handleMove = (id: string, x: number, y: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        // 가구 바닥이 룸 영역 아래로 빠지지 않도록 실제 높이로 클램프.
        const h = getPlacementHeight(i.kind, i.variant);
        return { ...i, ...clampPlacement(x, y, i.width, h) };
      })
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

  /** 이미 보유한 가구를 모달 없이 즉시 방에 재배치. */
  const placeOwnedItem = (item: CatalogItem) => {
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
    setItems((prev) => [...prev, placed]);
    setSelectedId(placed.id);
    setShowError(false);
    requestAnimationFrame(() => {
      const scrollArea = document.getElementById("signup-scroll-area");
      scrollArea?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleRequestPurchase = (item: CatalogItem) => {
    const isLocked = item.lockedAt !== undefined && item.lockedAt > TUTORIAL_LEVEL;
    if (isLocked) return;

    const ownedKey = `${item.kind}:${item.variant}`;
    const alreadyOwned = ownedKeys.has(ownedKey);
    const alreadyPlaced = items.some(
      (i) => i.kind === item.kind && i.variant === item.variant,
    );

    // 이미 방에 배치되어 있으면 그 가구를 선택만 해준다 (이동/회전/삭제 컨트롤 노출).
    if (alreadyPlaced) {
      const existing = items.find(
        (i) => i.kind === item.kind && i.variant === item.variant,
      );
      if (existing) setSelectedId(existing.id);
      return;
    }

    // 보유 중인데 방에서 X 로 지운 상태 → 모달 없이 바로 재배치.
    if (alreadyOwned) {
      placeOwnedItem(item);
      return;
    }

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

    setItems((prev) => [...prev, placed]);
    setSelectedId(placed.id);
    setShowError(false);
    setPendingPurchase(null);

    // 구매 후 자동으로 마이룸 미리보기까지 스크롤 — 방금 배치한 가구가 보이도록.
    requestAnimationFrame(() => {
      const scrollArea = document.getElementById("signup-scroll-area");
      scrollArea?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleNext = () => {
  if (!canNext) {
    setShowError(true);
    return;
  }

  // 0) 둘러보기(게스트)로 진입했다가 가입을 마쳤다면 게스트 모드를 해제한다.
  exitGuestMode();

  // 1) 현재 계정을 신규 가입 phone 으로 먼저 확정한다.
  //    이전 테스트 계정으로 로그인한 상태였다면 currentAccount 가 테스트 번호로
  //    남아있어 이후 Supabase sync 가 테스트 계정 데이터를 조회해 덮어쓰는 문제를 방지.
  setCurrentAccount(data.phone);

  // 2) 모든 사용자 store 를 가입 직전 상태로 리셋 — 이전 테스트 계정 데이터 등을 정리.
  //    이 호출 이후에 가입 보상을 발급해야 reset 으로 지워지지 않는다.
  resetAllStoresForFreshSignup();

  // 2-1) 신규 가입 타임스탬프 기록 — 이후 2분간 Supabase sync 함수들이
  //      구(舊) 데이터로 덮어쓰지 않도록 각 store 에서 이 값을 확인하고 skip 한다.
  localStorage.setItem("holo:fresh-signup", Date.now().toString());

  // 3) 가입 보상 — "홀로 입주자" 뱃지 / 칭호 자동 발급 + 기본 장착
  recordBadgeAcquired("badge_24");
  setEquippedBadgeId("badge_24");
  recordTitleAcquired("#홀로_입주자");
  setEquippedTitle("#홀로_입주자");

  // 4) 회원가입 마지막 단계에서 배치/구매한 가구를 myroom store 에 저장.
  // → 홈 화면 RoomScene 과 마이룸 화면에 동일한 배치가 그대로 노출된다.
  setMyroomItems(items);
  // 소유 가구는 한 번에 묶어 저장 — purchaseItem 을 연달아 부르면 Supabase 쓰기 경합으로
  // 일부(예: 2개 중 1개)가 누락 저장되던 버그가 있었다. grantOwnedFurniture 로 1회 저장.
  grantOwnedFurniture([...ownedKeys]);

  // 4-1) 본인인증(휴대폰) 통과 사실을 전역/DB 로 승격. reset 이후 + setCurrentAccount 이후라
  //      verification-store 의 Supabase 동기화가 신규 계정 행에 올바르게 반영된다.
  //      (이전엔 signup-context.phoneVerified 만 세팅하고 전역/DB 로 잇는 코드가 없어,
  //       가입 직후 본인인증 상태가 항상 미인증으로 시작했다.)
  if (data.phoneVerified) setPhoneVerified(true);

  // 5) 닉네임·프로필 얼굴을 profile-store 에 반영해 홈/마이페이지 전반에 노출.
  if (data.nickname.trim()) setNickname(data.nickname.trim());
  if (data.profileFace) setProfileFace(data.profileFace);
  // 5-1) 신규 가입 시 고유 친구 코드를 생성·저장한다.
  //      빈 문자열을 넘기면 setFriendCode 내부에서 generateFriendCode() 를 호출해
  //      5자 랜덤 코드를 만들고 localStorage + Supabase 에 함께 저장한다.
  setFriendCode("");

  // 6) 가입 보너스 포인트 적립
  addPoints(SIGNUP_BONUS_POINTS, { title: "가입 보너스" });

  // 7) 알림 발행 — 환영 인사 + 무료 포인트 안내 (둘 다 알림창에 즉시 노출)
  const finalNickname = data.nickname.trim() || "회원";
  pushWelcomeNotification(finalNickname);
  pushRewardNotification(
    "가입 축하 포인트",
    `${SIGNUP_BONUS_POINTS}P가 도착했어요! 무료 포인트 미션으로 더 모아보세요.`,
    "/mypage/points/free",
  );

  localStorage.setItem(
    "holoUser",
    JSON.stringify({
      userId: data.userId,
      nickname: data.nickname,
      name: data.name,
      phone: data.phone,
      interests: data.interests,
      customInterest: data.customInterest,
      // 가입 시점 기록 — 계정관리 화면의 "가입년도" 노출에 사용.
      signupAt: Date.now(),
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
    <SignupLayout
      step={7}
      keepFooterVisible={canNext}
      footer={
        <div className="flex flex-col items-center gap-2">
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
      }
    >
      <h1 className="shrink-0 text-[20px] font-bold leading-snug text-holo-ink">
        거의 다 왔습니다!
        <br />
        <span className="text-holo-purple-mid">{displayName}</span> 님의 방을 꾸며보세요!
      </h1>

      <p className="mt-2 shrink-0 text-[14px] text-holo-ink-3">
        마음에 드는 가구 2개를 구매하고 방에 배치해보세요.
      </p>

      {/* 룸 미리보기 — 고정 높이. 페이지 자체는 SignupLayout 이 overflow-y-auto 라 자연 스크롤. */}
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

      {/* 카탈로그 — 자연 높이로 늘어남. 페이지 전체가 SignupLayout 의 overflow-y-auto 로 스크롤된다. */}
      <div className="-mx-4 shrink-0 px-4 pb-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          {filtered.map((it) => {
            const ownedKey = `${it.kind}:${it.variant}`;
            const alreadyOwned = ownedKeys.has(ownedKey);

            const alreadyPlaced = items.some(
              (i) => i.kind === it.kind && i.variant === it.variant,
            );
            return (
              <div key={it.id} className="flex flex-col">
                <article
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRequestPurchase(it)}
                  className={`relative flex aspect-square flex-col overflow-hidden rounded-holo-input bg-holo-surface-2 p-3 transition active:scale-[0.98] ${
                    alreadyOwned && !alreadyPlaced
                      ? "ring-2 ring-holo-purple-mid/40"
                      : ""
                  }`}
                >
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

                  {/* 첫 구매 전에만 핑크 "구매하기" 버튼 노출. 한 번 구매하면 X 로 빼더라도
                      이 버튼은 다시 안 뜨고, 카탈로그 카드를 직접 클릭해 재배치한다. */}
                  {!alreadyOwned && (
                    <span className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 rounded-full bg-[#FF6CB8] py-[6px] text-center text-[13px] tracking-tight text-white shadow-[0_3px_8px_rgba(255,108,184,0.35)]">
                      구매하기
                    </span>
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

      <ConfirmModal
        open={limitAlertOpen}
        message="이미 2개를 구매하셨습니다."
        singleAction
        onConfirm={() => setLimitAlertOpen(false)}
      />
    </SignupLayout>
  );
}
