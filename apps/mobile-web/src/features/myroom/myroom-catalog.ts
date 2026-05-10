import type { CatalogItem, FurnitureKind } from "./myroom-data";

/**
 * 변형(variant)별 한글 이름 — 실제 PNG 색상/형태에 맞춰 작성.
 * index 0 = variant 01, index 1 = variant 02, ...
 */
const NAMES: Record<FurnitureKind, string[]> = {
  bed: [
    "라일락 싱글 침대",
    "라일락 침대",
    "노란 원목 침대",
    "민트 원목 침대",
    "초록 원목 침대",
    "초록 더블 침대",
    "초록 벨벳 침대",
  ],
  bookshelf: [
    "원목 책장",
    "원목 유리 책장",
    "네이비 큐브 책장",
    "분홍 큐브 책장",
    "초록 원목 책장",
    "네이비 와이드 책장",
  ],
  chair: [
    "라일락 빈백",
    "노란 1인 소파",
    "노란 빈티지 의자",
    "노란 윙체어",
    "노란 클래식 윙체어",
    "초록 학생 의자",
    "초록 1인 소파",
    "올리브 리클라이너",
    "코랄 라운지 체어",
    "라일락 2인 소파",
    "노란 코너 소파",
    "코랄 3인 소파",
    "네이비 벨벳 소파",
    "민트 2인 소파",
    "올리브 가죽 소파",
  ],
  closet: ["초록 원목 옷장", "라일락 수납 옷장", "민트 수납 옷장"],
  console: [
    "노란 TV 콘솔",
    "원목 TV 협탁",
    "원목 콘솔 박스",
    "원목 콘솔",
    "원목 와이드 콘솔",
    "원목 슬림 콘솔",
    "원목 2단 서랍장",
    "원목 콘솔",
    "원목 미니 서랍장",
    "원목 와이드 서랍장",
    "초록 3단 서랍장",
    "원목 콤팩트 서랍장",
    "원목 협탁",
    "원목 베드사이드",
    "원목 콤팩트 콘솔",
  ],
  desk: [
    "라일락 책상 세트",
    "라일락 L자 책상",
    "라일락 책상·책장 세트",
    "원목 미니 책상",
    "클래식 사장님 책상",
    "민트 L자 책상",
    "초록 L자 책상",
    "네이비 모던 L자 책상",
    "초록 원목 책상",
  ],
  lighting: [
    "원목 스탠드 조명",
    "베이지 모던 조명",
    "원목 미니 스탠드",
    "빈티지 플로어 램프",
    "빈티지 톨 램프",
    "빈티지 패턴 램프",
  ],
  mirror: ["네이비 화장대 거울", "라일락 화장대 거울", "분홍 화장대 거울", "원목 전신 거울"],
  rug: ["라일락 원형 러그", "베이지 원형 러그", "네이비 원형 러그"],
  shelf: [
    "분홍 식물 선반",
    "네이비 식물 선반",
    "초록 식물 선반",
    "라일락 식물 선반",
    "노란 식물 선반",
    "원목 미니 선반",
    "원목 라더 선반",
    "라일락 사다리 선반",
    "초록 카트 선반",
  ],
  wall: [
    "라일락 벌집 선반",
    "분홍 벌집 선반",
    "포스터 액자 세트",
    "초록 벌집 선반",
    "네이비 벌집 선반",
    "민트 벌집 선반",
    "민트 라일락 벌집 선반",
  ],
};

/** Decide which variant of a kind is locked at what level */
function lockLevel(index: number): number | undefined {
  // index is 0-based variant
  if (index < 2) return undefined;          // first 2 always free
  if (index === 2) return 5;                // 3rd → Lv.5
  if (index === 3) return 7;                // 4th → Lv.7
  return 5 + (index - 2) * 2;               // beyond → 9, 11, ...
}

/**
 * 가격 책정 — 레벨 1 = 50P 시작, 2 레벨마다 +50P
 *  · 잠금 없음(=Lv.1) → 50P
 *  · Lv.5  → 150P  ·  Lv.7  → 200P
 *  · Lv.9  → 250P  ·  Lv.11 → 300P
 *  · ... Lv.27 → 700P
 */
function priceFor(lockedAt: number | undefined): number {
  const lvl = lockedAt ?? 1;
  return 50 + Math.floor((lvl - 1) / 2) * 50;
}

function build(): CatalogItem[] {
  const items: CatalogItem[] = [];
  (Object.keys(NAMES) as FurnitureKind[]).forEach((kind) => {
    NAMES[kind].forEach((label, i) => {
      const variant = String(i + 1).padStart(2, "0");
      const lockedAt = lockLevel(i);
      items.push({
        id: `${kind}-${i + 1}`,
        kind,
        variant,
        label,
        price: priceFor(lockedAt),
        ...(lockedAt !== undefined ? { lockedAt } : {}),
      });
    });
  });
  return items;
}

export const CATALOG: CatalogItem[] = build();
