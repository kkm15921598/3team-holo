import { useRef } from "react";
import { furnitureSrc, ROOM_BG_W, ROOM_H, ROOM_W, type PlacedFurniture } from "./myroom-data";

type Props = {
  items: PlacedFurniture[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onFlip: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
};

export function RoomEditorView({ items, selectedId, onSelect, onRemove, onFlip, onMove }: Props) {
  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: ROOM_W, height: ROOM_H }}
      onPointerDown={(e) => {
        // Click empty area to deselect
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
      {items.map((item) => (
        <FurniturePiece
          key={item.id}
          item={item}
          selected={item.id === selectedId}
          onSelect={onSelect}
          onRemove={onRemove}
          onFlip={onFlip}
          onMove={onMove}
        />
      ))}
    </div>
  );
}

function FurniturePiece({
  item,
  selected,
  onSelect,
  onRemove,
  onFlip,
  onMove,
}: {
  item: PlacedFurniture;
  selected: boolean;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onFlip: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}) {
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

      {selected && (
        <>
          {/* X — Remove (top-left) */}
          <ControlButton
            label="보관함으로"
            position="-top-3 -left-3"
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

          {/* ✓ — Confirm (top-right) */}
          <ControlButton
            label="배치 완료"
            position="-top-3 -right-3"
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

          {/* ⟳ — Flip (bottom-left) */}
          <ControlButton
            label="좌우 반전"
            position="-bottom-3 -left-3"
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

          {/* ✥ — Drag (bottom-right) */}
          <button
            type="button"
            aria-label="위치 이동"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            className="absolute -bottom-3 -right-3 z-10 flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-full bg-white text-holo-purple-mid shadow-md active:cursor-grabbing"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 1v12M1 7h12" />
              <path d="M4 4L1 7l3 3" />
              <path d="M10 4l3 3-3 3" />
              <path d="M4 10l3 3 3-3" />
              <path d="M4 4l3-3 3 3" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

function ControlButton({
  label,
  position,
  color,
  onClick,
  children,
}: {
  label: string;
  position: string;
  color: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute ${position} z-10 flex h-7 w-7 items-center justify-center rounded-full ${color} shadow-md`}
    >
      {children}
    </button>
  );
}
