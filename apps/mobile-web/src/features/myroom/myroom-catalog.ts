import type { CatalogItem, FurnitureKind } from "./myroom-data";

/** Korean display names for each variant of each kind (index = variant - 1) */
const NAMES: Record<FurnitureKind, string[]> = {
  desk: [
    "라일락 책상 세트",
    "노트북 책상",
    "와이드 책상",
    "L자 책상",
    "미니 책상",
    "학생 책상",
    "게이밍 책상",
    "원목 책상",
    "모던 책상",
  ],
  closet: ["베이직 옷장", "슬라이딩 옷장", "빈티지 옷장"],
  bookshelf: [
    "베이직 책장",
    "와이드 책장",
    "큐브 책장",
    "코너 책장",
    "파스텔 책장",
    "인더스트리얼 책장",
  ],
  console: [
    "베이직 서랍장",
    "와이드 서랍장",
    "TV 콘솔",
    "원목 서랍장",
    "모던 서랍장",
    "화이트 콘솔",
    "빈티지 화장대",
    "침실 협탁",
    "슬림 콘솔",
    "라운지 콘솔",
    "빌트인 콘솔",
    "모자이크 콘솔",
    "거실 콘솔",
    "베드사이드 테이블",
    "콤팩트 콘솔",
  ],
  shelf: [
    "벽선반",
    "큐브 선반",
    "코너 선반",
    "원목 선반",
    "화이트 선반",
    "행잉 선반",
    "라더 선반",
    "미니 선반",
    "빈티지 선반",
  ],
  chair: [
    "라일락 빈백",
    "원목 의자",
    "그레이 빈백",
    "패브릭 1인 소파",
    "베이지 빈백",
    "어린이 의자",
    "핑크 라운지 체어",
    "오피스 체어",
    "라탄 체어",
    "이튼 체어",
    "모던 라운지",
    "빈티지 의자",
    "폼 빈백",
    "클래식 다이닝",
    "라운지 소파",
  ],
  bed: [
    "보라 원목 침대",
    "노란 원목 침대",
    "화이트 큐브 침대",
    "그레이 패브릭 침대",
    "핑크 베이비 침대",
    "원목 클래식 침대",
    "캐노피 공주 침대",
  ],
  wall: [
    "베이직 벽지",
    "원목 벽",
    "포스터 벽지",
    "페인팅 벽지",
    "패턴 벽지",
    "라이트 벽지",
    "다크 벽지",
  ],
  rug: ["원목 마루", "카펫 러그", "패턴 러그"],
  lighting: [
    "라일락 스탠드",
    "플로어 램프",
    "펜던트 조명",
    "미니 무드등",
    "책상 램프",
    "천장 조명",
  ],
  mirror: ["원형 거울", "원목 프레임 거울", "전신 거울", "빈티지 거울"],
};

/** Per-kind base price for the "NEW · 구매" item (variant 02) */
const PRICES: Partial<Record<FurnitureKind, number>> = {
  bed: 500,
  desk: 400,
  chair: 350,
  closet: 600,
  bookshelf: 450,
  console: 400,
  shelf: 200,
  wall: 300,
  rug: 250,
  lighting: 280,
  mirror: 320,
};

/** Decide which variant of a kind is locked at what level */
function lockLevel(index: number): number | undefined {
  // index is 0-based variant
  if (index < 2) return undefined;          // first 2 always free
  if (index === 2) return 5;                // 3rd → Lv.5
  if (index === 3) return 7;                // 4th → Lv.7
  return 5 + (index - 2) * 2;               // beyond → 9, 11, ...
}

function build(): CatalogItem[] {
  const items: CatalogItem[] = [];
  (Object.keys(NAMES) as FurnitureKind[]).forEach((kind) => {
    NAMES[kind].forEach((label, i) => {
      const variant = String(i + 1).padStart(2, "0");
      const lockedAt = lockLevel(i);
      const isNew = i === 1; // 2nd item per kind is the "NEW" purchasable
      const price = isNew ? PRICES[kind] : undefined;
      items.push({
        id: `${kind}-${i + 1}`,
        kind,
        variant,
        label,
        ...(isNew ? { isNew: true } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(lockedAt !== undefined ? { lockedAt } : {}),
      });
    });
  });
  return items;
}

export const CATALOG: CatalogItem[] = build();
