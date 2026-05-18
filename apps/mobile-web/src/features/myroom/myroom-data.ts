export type FurnitureKind =
  | "desk"
  | "closet"
  | "bookshelf"
  | "console"
  | "shelf"
  | "chair"
  | "bed"
  | "wall"
  | "rug"
  | "lighting"
  | "mirror";

export type CategoryKey = "all" | FurnitureKind;

export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "desk", label: "책상" },
  { key: "closet", label: "옷장" },
  { key: "bookshelf", label: "책장" },
  { key: "console", label: "서랍장" },
  { key: "shelf", label: "선반" },
  { key: "chair", label: "의자" },
  { key: "bed", label: "침대" },
  { key: "wall", label: "벽" },
  { key: "rug", label: "바닥" },
  { key: "lighting", label: "조명" },
  { key: "mirror", label: "거울" },
];

/** Slug used as folder name + filename prefix */
export const KIND_SLUG: Record<FurnitureKind, string> = {
  desk: "desk",
  closet: "closet",
  bookshelf: "bookshelf",
  console: "Console", // console folder uses capitalized filenames
  shelf: "shelf",
  chair: "chair",
  bed: "bed",
  wall: "wall",
  rug: "rug",
  lighting: "lighting",
  mirror: "mirror",
};

export type PlacedFurniture = {
  id: string;
  kind: FurnitureKind;
  variant: string; // e.g. "01"
  flipped: boolean; // false = left, true = right
  x: number; // px from container left
  y: number; // px from container top
  width: number;
};

/** Canonical room canvas size — both the home view and the edit view use these */
export const ROOM_W = 400;
export const ROOM_H = 340;
/** 디바이스 프레임 폭 — 캔버스(400) 가 이 영역(360) 중심에 놓이고 좌우 20px 씩 잘림 */
export const DEVICE_W = 360;
/** 4-버튼 컨트롤이 가구 바깥으로 12px 씩 튀어나오므로, 안전 여백은 14 정도 */
export const SAFE_MARGIN = 14;

/**
 * 가구가 화면 안쪽에 들어오도록 좌표 보정.
 *
 * height 가 주어지면 그 값을 기준으로 maxY 를 정해 가구의 하단이 룸 바닥선을 절대 넘어가지 않게 한다.
 * 종전에는 height 인자가 없어 "대략 40px" 로 추정했는데, 침대처럼 키가 큰 가구는 그 추정값을
 * 훨씬 초과해 룸 영역 아래로 빠지는 문제가 있었다. height 를 명시 전달하면 그 가구의 실제 폭/높이로
 * 정확히 클램프된다.
 *
 * height 를 모르는 호출(이전 경로 호환) 은 보수적인 기본 80 을 사용해 큰 가구가 빠지는 것은 막고,
 * 짧은 가구에서 약간 위쪽으로 클램프되는 정도만 손해본다.
 */
export function clampPlacement(
  x: number,
  y: number,
  width: number,
  height?: number,
): { x: number; y: number } {
  const minX = (ROOM_W - DEVICE_W) / 2 + SAFE_MARGIN;            // 34
  const maxX = (ROOM_W + DEVICE_W) / 2 - SAFE_MARGIN - width;    // 366 - width
  const minY = SAFE_MARGIN;                                       // 14
  // height 가 있으면 정확한 룸 바닥 기준 클램프. 없으면 보수적인 80 으로 폴백.
  const safeHeight = height ?? 80;
  const maxY = ROOM_H - SAFE_MARGIN - safeHeight;
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  };
}
/** Width to render the room_basic.png at — 새 이미지가 거의 정사각형이라 320 으로 축소 */
export const ROOM_BG_W = 320;

/**
 * 카탈로그에서 새로 배치할 때 적용할 기본 좌표/크기 (kind 별).
 * 너비는 베이직 책장(154×280 원본 → 70 렌더) 기준으로 모든 가구를
 * 같은 isometric 스케일(약 0.455)로 비례 산정.
 */
export const DEFAULT_PLACEMENT: Record<
  FurnitureKind,
  { x: number; y: number; width: number; flipped?: boolean }
> = {
  // 원본 154×280 → 70 (기준)
  bookshelf: { x: 30,  y: 80,  width: 70 },
  // 원본 256×236 → 115
  bed:       { x: 150, y: 140, width: 115 },
  // 원본 120×116 → 55
  chair:     { x: 295, y: 215, width: 55, flipped: true },
  // 원본 172×320 → 78
  closet:    { x: 290, y: 70,  width: 78 },
  // 원본 224×176 → 102
  console:   { x: 150, y: 175, width: 102 },
  // 원본 236×252 → 107
  desk:      { x: 60,  y: 150, width: 107 },
  // 원본 48×90 → 22
  lighting:  { x: 200, y: 110, width: 22 },
  // 원본 102×186 → 46
  mirror:    { x: 320, y: 100, width: 46 },
  // 원본 220×116 → 100
  rug:       { x: 150, y: 240, width: 100 },
  // 원본 176×304 → 80
  shelf:     { x: 290, y: 70,  width: 80 },
  // 원본 166×152 → 75
  wall:      { x: 80,  y: 40,  width: 75 },
};

/**
 * Default room contents — same as the home page hero room.
 * 가구는 책상 + 의자 2개만 — 좌표는 home-illustrations.tsx 의 floorTopY 기준으로
 * 마름모 바닥 안에 안착하도록 산정되어 있다.
 */

export const DEFAULT_ROOM: PlacedFurniture[] = [
  { id: "desk-1", kind: "desk", variant: "01", flipped: false, x: 117, y: 135, width: 107 },
  { id: "chair-1", kind: "chair", variant: "01", flipped: true, x: 248, y: 188, width: 55 },
];

export function furnitureSrc(item: PlacedFurniture | { kind: FurnitureKind; variant: string; flipped: boolean }): string {
  const slug = KIND_SLUG[item.kind];
  const side = item.flipped ? "right" : "left";
  // closet has a typo in filename for variant 01_left
  if (item.kind === "closet" && item.variant === "01" && !item.flipped) {
    return `/illustrations/furniture/${item.kind}/closet_01_,left.png`;
  }
  return `/illustrations/furniture/${item.kind}/${slug}_${item.variant}_${side}.png`;
}

export type CatalogItem = {
  id: string;
  kind: FurnitureKind;
  variant: string;
  label: string;
  price?: number;
  isNew?: boolean;
  lockedAt?: number;
};
