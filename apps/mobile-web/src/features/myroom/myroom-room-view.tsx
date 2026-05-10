import { useRef } from "react";
import { furnitureSrc, ROOM_BG_W, ROOM_H, ROOM_W, type PlacedFurniture } from "./myroom-data";

type Props = {
  items: PlacedFurniture[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onFlip: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
};

export function RoomEditorView({
  items,
  selectedId,
  onSelect,
  onRemove,
  onFlip,
  onMove,
  onBringForward,
  onSendBackward,
}: Props) {
  const selectedItem = items.find((i) => i.id === selectedId);
  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: ROOM_W, height: ROOM_H }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
    >
      <img
        src="/illustrations/room_basic.png"
        alt=""
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 select-none max-w-none"
        style={{ width: ROOM_BG_W }}
        draggable={false}
        aria-hidden
      />

      {/* 1) 가구 이미지 — 배열 순서대로 z-index 자연 계산 */}
      {items.map((item) => (
        <FurnitureImage
          key={item.id}
          item={item}
          selected={item.id === selectedId}
          onSelect={onSelect}
        />
      ))}

      {/* 2) 컨트롤 오버레이 — 선택된 가구 위에 항상 최상위로 렌더 */}
      {selectedItem && (
        <ControlOverlay
          item={selectedItem}
          onRemove={onRemove}
          onFlip={onFlip}
          onMove={onMove}
          onSelect={onSelect}
          onBringForward={onBringForward}
          onSendBackward={onSendBackward}
        />
      )}
    </div>
  );
}

function FurnitureImage({
  item,
  selected,
  onSelect,
}: {
  item: PlacedFurniture;
  selected: boolean;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div
      className="absolute"
      style={{ left: item.x, top: item.y, width: item.width }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(item.id);
        }}
        className={`block w-full ${selected ? "outline outline-2 outline-dashed outline-holo-purple-mid" : ""}`}
        aria-label={`${item.kind} 선택`}
      >
        <img
          src={furnitureSrc(item)}
          alt=""
          className="pointer-events-none block w-full max-w-none"
          draggable={false}
          aria-hidden
        />
      </button>
    </div>
  );
}

type OverlayProps = {
  item: PlacedFurniture;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onFlip: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
};

function ControlOverlay({
  item,
  onSelect,
  onRemove,
  onFlip,
  onMove,
  onBringForward,
  onSendBackward,
}: OverlayProps) {
  const startRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const handleDragStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    startRef.current = { px: e.clientX, py: e.clientY, ox: item.x, oy: item.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleDragMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.px;
    const dy = e.clientY - startRef.current.py;
    onMove(item.id, startRef.current.ox + dx, startRef.current.oy + dy);
  };
  const handleDragEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    startRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer may already be released
    }
  };

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{ left: item.x, top: item.y, width: item.width }}
    >
      {/* 보이지 않는 placeholder — 컨테이너가 가구와 같은 높이를 갖도록 (bottom 툴바 위치 기준) */}
      <img
        src={furnitureSrc(item)}
        alt=""
        className="invisible block w-full max-w-none"
        draggable={false}
        aria-hidden
      />

      {/* 상단 툴바 */}
      <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex gap-1.5">
        <ControlButton
          label="보관함으로"
          color="bg-white text-holo-error"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </ControlButton>
        <ControlButton
          label="앞으로 가져오기"
          color="bg-white text-holo-purple-mid"
          onClick={(e) => {
            e.stopPropagation();
            onBringForward(item.id);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 12V3" />
            <path d="M3 6l4-4 4 4" />
          </svg>
        </ControlButton>
        <ControlButton
          label="배치 완료"
          color="bg-white text-holo-success"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(null);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#3FAE5A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 7.5l2.8 2.8L11.5 4" />
          </svg>
        </ControlButton>
      </div>

      {/* 하단 툴바 */}
      <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex gap-1.5">
        <ControlButton
          label="좌우 반전"
          color="bg-white text-holo-purple-mid"
          onClick={(e) => {
            e.stopPropagation();
            onFlip(item.id);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 2v10" />
            <path d="M3 5L1 7l2 2" />
            <path d="M11 5l2 2-2 2" />
          </svg>
        </ControlButton>
        <ControlButton
          label="뒤로 보내기"
          color="bg-white text-holo-purple-mid"
          onClick={(e) => {
            e.stopPropagation();
            onSendBackward(item.id);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 2v9" />
            <path d="M3 7l4 4 4-4" />
          </svg>
        </ControlButton>
        <button
          type="button"
          aria-label="위치 이동"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          className="pointer-events-auto flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-full bg-white text-holo-purple-mid shadow-md active:cursor-grabbing"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1v12M1 7h12" />
            <path d="M4 4L1 7l3 3" />
            <path d="M10 4l3 3-3 3" />
            <path d="M4 10l3 3 3-3" />
            <path d="M4 4l3-3 3 3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  color,
  onClick,
  children,
}: {
  label: string;
  color: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full ${color} shadow-md`}
    >
      {children}
    </button>
  );
}
