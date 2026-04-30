import { useState } from "react";

type Furniture = {
  id: string;
  name: string;
  category: "가구" | "장식" | "조명";
  cost: number;
  emoji: string;
};

const CATALOG: Furniture[] = [
  { id: "f1", name: "원목 책상", category: "가구", cost: 0, emoji: "🪑" },
  { id: "f2", name: "단순 침대", category: "가구", cost: 0, emoji: "🛏️" },
  { id: "f3", name: "관엽 식물", category: "장식", cost: 50, emoji: "🪴" },
  { id: "f4", name: "벽 그림", category: "장식", cost: 100, emoji: "🖼️" },
  { id: "f5", name: "스탠드 조명", category: "조명", cost: 80, emoji: "💡" },
  { id: "f6", name: "러그", category: "장식", cost: 120, emoji: "🪟" },
];

export function MyRoomPlaceholder() {
  const [placed, setPlaced] = useState<string[]>(["f1"]);

  const toggle = (id: string) => {
    setPlaced((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <RoomCanvas placedItems={CATALOG.filter((c) => placed.includes(c.id))} />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">가구 카탈로그</h2>
        <span className="text-xs text-gray-500">배치 {placed.length}개</span>
      </div>

      <ul className="grid grid-cols-3 gap-2">
        {CATALOG.map((item) => {
          const isPlaced = placed.includes(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className={`flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-2xl text-xs transition ${
                  isPlaced
                    ? "bg-holo-purple-light ring-2 ring-holo-purple"
                    : "bg-gray-50"
                }`}
              >
                <span className="text-2xl" aria-hidden>{item.emoji}</span>
                <span className="font-medium text-gray-800">{item.name}</span>
                <span className="text-[10px] text-gray-500">
                  {item.cost === 0 ? "기본" : `${item.cost}P`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-center text-[11px] text-gray-400">
        실제 아이소메트릭 렌더(react-three-fiber)는 P3에서 적용됩니다.
      </p>
    </div>
  );
}

function RoomCanvas({ placedItems }: { placedItems: Furniture[] }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-3xl bg-holo-purple-light">
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
        <polygon points="100,40 180,80 100,120 20,80" fill="#F3E8FF" />
        <polygon points="20,80 100,120 100,180 20,140" fill="#E9D5FF" />
        <polygon points="100,120 180,80 180,140 100,180" fill="#D8B4FE" />
        <line x1="60" y1="100" x2="60" y2="160" stroke="#C084FC" strokeWidth="0.5" />
        <line x1="140" y1="100" x2="140" y2="160" stroke="#A855F7" strokeWidth="0.5" />
      </svg>

      <div className="absolute inset-x-0 bottom-3 flex flex-wrap justify-center gap-2 px-4">
        {placedItems.map((item) => (
          <span
            key={item.id}
            className="flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-gray-700 shadow-sm backdrop-blur"
          >
            <span aria-hidden>{item.emoji}</span>
            {item.name}
          </span>
        ))}
        {placedItems.length === 0 && (
          <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] text-gray-500">
            가구를 선택해서 배치해보세요
          </span>
        )}
      </div>
    </div>
  );
}
