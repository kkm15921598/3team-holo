import {
  clampPlacement,
  furnitureSrc,
  ROOM_BG_W,
  ROOM_H,
  ROOM_W,
  type FurnitureKind,
  type PlacedFurniture,
} from "../myroom/myroom-data";
import { CATALOG } from "../myroom/myroom-catalog";
import { getPlacementHeight, getPlacementWidth } from "../myroom/myroom-dimensions";
import { useMyroomItems } from "../myroom/myroom-store";

/** items 를 prop 으로 받아 그리는 순수 표시 컴포넌트 */
export function RoomSceneView({ items }: { items: PlacedFurniture[] }) {
  return (
    <div className="relative mx-auto shrink-0" style={{ width: ROOM_W, height: ROOM_H }}>
      <img
        src="/illustrations/room_basic.png"
        alt=""
        className="absolute left-1/2 top-0 -translate-x-1/2 select-none max-w-none"
        style={{ width: ROOM_BG_W }}
        draggable={false}
        aria-hidden
      />
      {items.map((it) => (
        <img
          key={it.id}
          src={furnitureSrc(it)}
          alt=""
          className="absolute select-none max-w-none"
          style={{ left: it.x, top: it.y, width: it.width }}
          draggable={false}
          aria-hidden
        />
      ))}
    </div>
  );
}

/** 내 방 — store 의 items 를 사용 */
export function RoomScene() {
  const items = useMyroomItems();
  return <RoomSceneView items={items} />;
}

// ─── 닉네임 기반 결정적 random furniture (친구 프로필용) ──────────────
function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

function makeRng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * room_basic.png(650×686 자연 크기 → 320×337 렌더) 의 마름모꼴 바닥 영역 정점.
 * 픽셀 측정으로 확인된 캔버스(400×340) 기준 좌표:
 *   top    (200, 177)   right (350, 244)
 *   bottom (200, 317)   left  ( 50, 244)
 * 주어진 x 에서 "바닥 뒤쪽 가장자리(floor top edge)" y 를 반환한다.
 * 모든 비-벽 가구는 자신의 아래 가장자리가 (floorTopY + depthOffset) 에 닿도록
 * y 를 역산해서 배치한다.
 */
function floorTopY(x: number): number {
  const xc = Math.max(50, Math.min(350, x));
  if (xc <= 200) {
    // left → top : (50,244) → (200,177)
    return 244 - (67 * (xc - 50)) / 150;
  }
  // top → right : (200,177) → (350,244)
  return 177 + (67 * (xc - 200)) / 150;
}

type Slot = {
  kind: FurnitureKind;
  /** 가구 중심의 x 좌표. width 에 따라 실제 left(x) 가 계산된다. */
  centerX: number;
  /** floorTopY(centerX) 에서 앞쪽으로 얼마나 더 내려갈지 (px). 0 = 바닥 뒤쪽 가장자리에 정확히 닿음. */
  depthOffset?: number;
  /** wall 처럼 바닥과 무관한 경우 직접 y 지정. */
  wallY?: number;
  flipped?: boolean;
};

/**
 * 친구 방 슬롯 그룹.
 * - 같은 그룹 안의 슬롯은 위치가 겹치므로 그룹당 1개만 선택.
 * - 그룹 간 좌표는 사용자가 표시한 마름모 바닥 영역 안에서 서로 충돌하지 않도록 설계됨.
 */
/**
 * 각 슬롯의 depthOffset 은 "그 가구의 바닥 모서리(아래쪽 가장자리) y" 가
 * 바닥 마름모의 시각적 중앙선(약 y≈250) 근처가 되도록 산출되어 있다.
 *   bottom_y = floorTopY(centerX) + depthOffset ≈ 250
 * 마름모는 중심으로 갈수록 좌우 방향의 폭이 넓고 깊이가 깊으므로
 * centerX 가 중앙(200)에 가까운 가구일수록 depthOffset 이 더 커야 같은 라인에 정렬된다.
 */
const SLOT_GROUPS: Slot[][] = [
  // 1) 좌측 뒷벽 — 벽 장식 또는 책장 (한 점만)
  //    좌표가 비슷한 영역에 놓이므로 두 가구는 상호배타적이다.
  [
    { kind: "wall",      centerX: 107, wallY: 50 },
    { kind: "bookshelf", centerX:  80, depthOffset: 20 },
  ],
  // 2) 중앙 — 책상 또는 침대 (한 점만)
  [
    { kind: "desk", centerX: 170, depthOffset: 60 },
    { kind: "bed",  centerX: 200, depthOffset: 73 },
  ],
  // 3) 우측 — 의자 또는 거울 (한 점만; 거울이 공중에 뜨던 슬롯 통합)
  [
    { kind: "chair",  centerX: 302, depthOffset: 30, flipped: true },
    { kind: "mirror", centerX: 305, depthOffset: 27 },
  ],
  // 4) 앞 — 러그 (바닥 앞쪽 가장자리 근처)
  [
    { kind: "rug", centerX: 200, depthOffset: 130 },
  ],
];

/** 레벨 구간별 가구 개수 (1~10 → 1~2, 11~20 → 1~3, 21~30 → 1~4). */
function pickFurnitureCount(level: number, rand: () => number): number {
  if (level <= 10) return 1 + Math.floor(rand() * 2); // 1..2
  if (level <= 20) return 1 + Math.floor(rand() * 3); // 1..3
  return 1 + Math.floor(rand() * 4);                  // 1..4
}

/**
 * seed(닉네임) + level 로 친구 방 가구 배치를 생성.
 * - 같은 seed/level → 항상 같은 결과 (재진입해도 동일한 방).
 * - 레벨에 따라 1~4 개의 가구가 비충돌 슬롯에 무작위 배치된다.
 * - 비-벽 가구는 bottom edge 가 바닥 마름모(floorTopY + depthOffset) 에 닿도록 y 가 역산된다.
 * - 가구 너비는 변형별 PNG 자연 크기 × 동일 스케일로 계산된 최신 값을 사용한다.
 * - clampPlacement 로 디바이스 프레임을 벗어나지 않도록 보정한다.
 */
export function randomRoomFurniture(seed: string, level = 1): PlacedFurniture[] {
  const rand = makeRng(fnv1a(seed));

  const pickVariant = (kind: FurnitureKind): string => {
    // 해당 레벨에서 실제로 해금되는 변형만 후보로 둔다. (이전엔 전체 카탈로그에서
    //  무작위로 뽑아, 레벨 3 친구 방에 Lv.27 잠금 가구가 뜨는 "레벨에 안 맞는 가구" 문제)
    const unlocked = CATALOG.filter(
      (c) => c.kind === kind && (c.lockedAt ?? 1) <= level,
    );
    // 해금분이 없으면(아주 낮은 레벨) 항상 무료인 첫 변형으로 폴백.
    const variants =
      unlocked.length > 0 ? unlocked : CATALOG.filter((c) => c.kind === kind);
    return variants.length > 0
      ? variants[Math.floor(rand() * variants.length)].variant
      : "01";
  };

  const count = pickFurnitureCount(level, rand);

  // 슬롯 그룹을 셔플한 뒤 count 개를 선택, 각 그룹에서 한 슬롯을 뽑는다.
  const shuffledGroups = [...SLOT_GROUPS];
  for (let i = shuffledGroups.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffledGroups[i], shuffledGroups[j]] = [shuffledGroups[j], shuffledGroups[i]];
  }
  const chosen = shuffledGroups.slice(0, Math.min(count, shuffledGroups.length));

  const out: PlacedFurniture[] = chosen.map((group) => {
    const slot = group[Math.floor(rand() * group.length)];
    const variant = pickVariant(slot.kind);
    const width = getPlacementWidth(slot.kind, variant);
    // 변형별 실제 PNG 크기 기반으로 렌더 높이를 계산 — variant 마다 종횡비가 다르므로
    // 단일 비율 추정 대신 변형별 자연 높이를 사용해야 바닥에 정확히 안착한다.
    const height = getPlacementHeight(slot.kind, variant);

    // x 는 centerX 를 기준으로 width 의 절반만큼 좌측으로 보정.
    const rawX = Math.round(slot.centerX - width / 2);
    // y 는 벽(wallY) 이거나, 바닥 가장자리 - 높이.
    const rawY =
      slot.wallY !== undefined
        ? slot.wallY
        : Math.round(floorTopY(slot.centerX) + (slot.depthOffset ?? 0) - height);

    const clamped = clampPlacement(rawX, rawY, width);
    return {
      id: `friend-${slot.kind}-${variant}`,
      kind: slot.kind,
      variant,
      flipped: slot.flipped ?? false,
      x: clamped.x,
      y: clamped.y,
      width,
    };
  });

  // y 오름차순 정렬 → 뒤쪽(작은 y) 가구가 먼저 그려져 isometric 깊이 순서가 자연스러움.
  out.sort((a, b) => a.y - b.y);

  return out;
}

export function ProfileAvatar() {
  return (
    <svg viewBox="0 0 63 63" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="63" height="63" fill="#F5E8A0" />
      <ellipse cx="31.5" cy="26" rx="14" ry="14" fill="#FDDBA0" />
      <ellipse cx="31.5" cy="15" rx="14" ry="9" fill="#1A0A00" />
      <circle cx="38" cy="14" r="7" fill="#1A0A00" />
      <ellipse cx="20" cy="24" rx="6" ry="10" fill="#1A0A00" />
      <ellipse cx="43" cy="24" rx="6" ry="10" fill="#1A0A00" />
      <ellipse cx="31.5" cy="18" rx="13" ry="8" fill="#1A0A00" />
      <circle cx="27" cy="27" r="2.5" fill="#2A1A0A" />
      <circle cx="36" cy="27" r="2.5" fill="#2A1A0A" />
      <circle cx="28" cy="26" r="1" fill="white" />
      <circle cx="37" cy="26" r="1" fill="white" />
      <ellipse cx="23" cy="32" rx="5" ry="3" fill="#FFBCB0" opacity="0.7" />
      <ellipse cx="40" cy="32" rx="5" ry="3" fill="#FFBCB0" opacity="0.7" />
      <path d="M27 36 Q31.5 40 36 36" stroke="#C07040" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <ellipse cx="31.5" cy="55" rx="22" ry="14" fill="#FF9999" />
    </svg>
  );
}
