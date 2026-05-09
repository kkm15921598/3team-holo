import { useRef, useState } from "react";
import {
  setStatusMessage,
  setStatusPosition,
  useStatusMessage,
  useStatusPosition,
} from "./myroom-store";

const MAX_LEN = 20;

type Mode = "idle" | "selected" | "editing";

/**
 * 상태 메시지 말풍선 — 마이룸 편집 화면에 표시.
 *  - 클릭 → 선택 (드래그 + 확인 버튼 노출)
 *  - 더블클릭 → 텍스트 편집 (입력 + 저장/취소 버튼)
 *  - 항상 가구 위에 떠 있음 (z-[60])
 */
export function StatusBubble() {
  const status = useStatusMessage();
  const pos = useStatusPosition();
  const [mode, setMode] = useState<Mode>("idle");
  const [draft, setDraft] = useState(status);

  const dragStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const handleDragStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    dragStart.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleDragMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.px;
    const dy = e.clientY - dragStart.current.py;
    setStatusPosition({
      x: Math.max(10, Math.min(360, dragStart.current.ox + dx)),
      y: Math.max(10, Math.min(290, dragStart.current.oy + dy)),
    });
  };
  const handleDragEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragStart.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const startEdit = () => {
    setDraft(status);
    setMode("editing");
  };
  const saveEdit = () => {
    if (draft.length > MAX_LEN) return;
    setStatusMessage(draft);
    setMode("idle");
  };
  const cancelEdit = () => {
    setDraft(status);
    setMode("idle");
  };

  const tooLong = draft.length > MAX_LEN;
  const isSelected = mode === "selected";
  const isEditing = mode === "editing";

  // 편집 모드는 form 이 252px 로 넓어지므로 우측 잘림 방지를 위해 left 클램프
  const EDIT_W = 252;
  const VISIBLE_RIGHT = 352; // 디바이스 폭(360) - 우측 여유 8px
  const VISIBLE_LEFT = 4;
  const containerLeft = isEditing
    ? Math.max(VISIBLE_LEFT, Math.min(pos.x, VISIBLE_RIGHT - EDIT_W))
    : pos.x;

  return (
    <div
      className="absolute z-[60] transition-[left] duration-150"
      style={{ left: containerLeft, top: pos.y }}
    >
      {isEditing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveEdit();
          }}
          className="relative drop-shadow-[0_4px_14px_rgba(116,72,221,0.25)]"
          style={{ width: 252 }}
        >
          <BubbleShape color={tooLong ? "#FF4343" : "#7448DD"} />
          <div className="relative z-10 flex items-center gap-1 py-[6px] pl-[12px] pr-[6px]">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancelEdit();
              }}
              placeholder="상태 메시지"
              className={`w-[140px] bg-transparent text-[14px] font-semibold outline-none placeholder:text-holo-ink-3 ${
                tooLong ? "text-holo-error" : "text-holo-ink"
              }`}
            />
            <span className={`mr-1 select-none text-[11px] tabular-nums ${tooLong ? "font-bold text-holo-error" : "text-holo-ink-3"}`}>
              {draft.length}/{MAX_LEN}
            </span>
            <button
              type="submit"
              aria-label="저장"
              disabled={tooLong}
              className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-white transition-transform ${
                tooLong ? "cursor-not-allowed bg-holo-line" : "bg-holo-purple-mid hover:scale-105"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2.5 7.5l2.8 2.8L11.5 4" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="취소"
              onClick={cancelEdit}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-holo-surface-2 text-holo-ink-3 transition-colors hover:bg-holo-line-3"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M3 3l8 8M11 3l-8 8" />
              </svg>
            </button>
          </div>
        </form>
      ) : (
        <div className="relative">
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setMode("selected");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setMode("selected");
              }
            }}
            aria-label="상태 메시지 — 클릭하면 위치 이동"
            className={`group relative flex items-center gap-[6px] whitespace-nowrap rounded-[12px] rounded-bl-[4px] bg-white px-[14px] py-[8px] text-[14px] font-semibold text-holo-ink shadow-[0_2px_10px_rgba(116,72,221,0.15)] transition-shadow hover:shadow-[0_4px_14px_rgba(116,72,221,0.25)] ${
              isSelected ? "outline outline-2 outline-dashed outline-holo-purple-mid" : ""
            }`}
          >
            <span>{status}</span>
            <button
              type="button"
              aria-label="텍스트 수정"
              onClick={(e) => {
                e.stopPropagation();
                startEdit();
              }}
              className="-mr-1 flex h-5 w-5 items-center justify-center rounded-full text-holo-purple-mid opacity-60 transition-all hover:bg-holo-lilac-card-2 hover:opacity-100"
            >
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 2l3 3-7 7H2v-3z" />
              </svg>
            </button>
            {tail()}
          </div>

          {isSelected && (
            <>
              {/* 드래그 핸들 (좌상단) */}
              <button
                type="button"
                aria-label="위치 이동"
                onPointerDown={handleDragStart}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
                className="absolute -left-3 -top-3 z-10 flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-full bg-white text-holo-purple-mid shadow-md active:cursor-grabbing"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M7 1v12M1 7h12" />
                  <path d="M4 4L1 7l3 3" />
                  <path d="M10 4l3 3-3 3" />
                  <path d="M4 10l3 3 3-3" />
                  <path d="M4 4l3-3 3 3" />
                </svg>
              </button>

              {/* 확인 (우상단) */}
              <button
                type="button"
                aria-label="배치 완료"
                onClick={(e) => {
                  e.stopPropagation();
                  setMode("idle");
                }}
                className="absolute -right-3 -top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-holo-success shadow-md"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#3FAE5A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2.5 7.5l2.8 2.8L11.5 4" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 말풍선 + 꼬리를 하나의 연속된 외곽선으로 그리는 SVG.
 * 편집 모드에서 form 의 배경으로 사용.
 */
function BubbleShape({ color }: { color: string }) {
  const W = 252;
  const H = 38;
  const TAIL_X = 12;
  const TAIL_W = 10;
  const TAIL_H = 9;
  const RX = 12;
  const BLR = 4;
  // 시계방향: 좌상단 → 우상단 → 우하단 → 꼬리 좌우 슬랜트 → 좌하단 → 닫기
  const d = [
    `M ${RX},0`,
    `L ${W - RX},0`,
    `Q ${W},0 ${W},${RX}`,
    `L ${W},${H - RX}`,
    `Q ${W},${H} ${W - RX},${H}`,
    `L ${TAIL_X + TAIL_W},${H}`,
    `L ${TAIL_X + TAIL_W / 2},${H + TAIL_H}`,
    `L ${TAIL_X},${H}`,
    `L ${BLR},${H}`,
    `Q 0,${H} 0,${H - BLR}`,
    `L 0,${RX}`,
    `Q 0,0 ${RX},0 Z`,
  ].join(" ");
  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={W}
      height={H + TAIL_H}
      viewBox={`0 0 ${W} ${H + TAIL_H}`}
      style={{ overflow: "visible" }}
      aria-hidden
    >
      <path d={d} fill="white" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/** 말풍선 꼬리 (idle 모드용 — 흰색 단색) */
function tail() {
  return (
    <span
      className="absolute h-0 w-0"
      style={{
        bottom: "-8px",
        left: "12px",
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderTop: "8px solid #fff",
      }}
    />
  );
}
