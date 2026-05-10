import {
  furnitureSrc,
  ROOM_BG_W,
  ROOM_H,
  ROOM_W,
  type FurnitureKind,
  type PlacedFurniture,
} from "../myroom/myroom-data";
import { CATALOG } from "../myroom/myroom-catalog";
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

// 친구 방 — 항상 포함되는 핵심 가구 (DEFAULT_ROOM 과 동일 좌표/크기)
type RoomSpec = { x: number; y: number; width: number; flipped?: boolean };
const CORE_LAYOUT: { kind: FurnitureKind; spec: RoomSpec }[] = [
  { kind: "wall",      spec: { x: 70,  y: 50,  width: 100 } },
  { kind: "bookshelf", spec: { x: 60,  y: 70,  width: 65 } },
  { kind: "desk",      spec: { x: 35,  y: 150, width: 170 } },
  { kind: "chair",     spec: { x: 275, y: 195, width: 95, flipped: true } },
];
// 추가 가구 — 코어와 위치가 겹치지 않음 (랜덤으로 1~2 개 선택)
const EXTRA_LAYOUT: { kind: FurnitureKind; spec: RoomSpec }[] = [
  { kind: "lighting", spec: { x: 215, y: 95,  width: 22 } },
  { kind: "mirror",   spec: { x: 320, y: 110, width: 46 } },
  { kind: "rug",      spec: { x: 130, y: 235, width: 110 } },
];

/**
 * seed(닉네임) 기반으로 친구의 방 가구 배치를 생성.
 * 핵심 4 종(벽·책장·책상·의자) 항상 포함 + 추가 1~2 개 → 총 5~6 개.
 * 같은 seed → 항상 같은 결과 (재진입해도 동일한 방).
 */
export function randomRoomFurniture(seed: string): PlacedFurniture[] {
  const rand = makeRng(fnv1a(seed));

  const pickVariant = (kind: FurnitureKind): string => {
    const variants = CATALOG.filter((c) => c.kind === kind);
    return variants.length > 0
      ? variants[Math.floor(rand() * variants.length)].variant
      : "01";
  };

  const out: PlacedFurniture[] = CORE_LAYOUT.map(({ kind, spec }) => ({
    id: `friend-${kind}`,
    kind,
    variant: pickVariant(kind),
    flipped: spec.flipped ?? false,
    x: spec.x,
    y: spec.y,
    width: spec.width,
  }));

  // 엑스트라 셔플 후 1~2 개 선택
  const extras = [...EXTRA_LAYOUT];
  for (let i = extras.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [extras[i], extras[j]] = [extras[j], extras[i]];
  }
  const extraCount = 1 + Math.floor(rand() * 2); // 1..2
  for (const { kind, spec } of extras.slice(0, extraCount)) {
    out.push({
      id: `friend-${kind}`,
      kind,
      variant: pickVariant(kind),
      flipped: spec.flipped ?? false,
      x: spec.x,
      y: spec.y,
      width: spec.width,
    });
  }

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
