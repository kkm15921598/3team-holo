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
/** Width to render the room_basic.png at (overflows the canvas, intentional) */
export const ROOM_BG_W = 400;

/** Default room contents — same as the home page hero room */
export const DEFAULT_ROOM: PlacedFurniture[] = [
  { id: "wall-1", kind: "wall", variant: "03", flipped: false, x: 70, y: 50, width: 100 },
  { id: "bookshelf-1", kind: "bookshelf", variant: "01", flipped: false, x: 60, y: 70, width: 65 },
  { id: "desk-1", kind: "desk", variant: "01", flipped: false, x: 35, y: 150, width: 170 },
  { id: "chair-1", kind: "chair", variant: "01", flipped: true, x: 275, y: 195, width: 95 },
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
