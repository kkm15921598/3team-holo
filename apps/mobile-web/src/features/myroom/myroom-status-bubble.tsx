import { useLayoutEffect, useRef, useState } from "react";
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
  // 화면 표시용 위치(영역 밖이면 클램프). 저장값(pos)은 사용자가 드래그할 때만 갱신한다 —
  // 마운트 시 컨테이너 크기에 맞춰 자동 클램프한 값을 저장에 써버리면, 컨테이너 측정값이
  // 접속/뷰포트마다 달라질 때 저장 위치가 매번 드리프트한다(=접속마다 말풍선 위치가 바뀜).
  const [clampedPos, setClampedPos] = useState(pos);
  const [mode, setMode] = useState<Mode>("idle");
  const [draft, setDraft] = useState(status);

  /**
   * 말풍선 컨테이너 ref — 드래그 클램프 시 실제 폭/높이를 측정해 영역 밖으로 새지 않게 한다.
   * 종전엔 x: [10, 360] 고정 클램프라 말풍선 너비를 고려하지 않아 우측이 잘리는 문제가 있었다.
   */
  const bubbleRef = useRef<HTMLDivElement>(null);

  const dragStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  // 상태메시지 텍스트가 길어지면 말풍선 폭이 커져 룸 영역 밖으로 새어나갈 수 있다.
  // (드래그 클램프는 위치만 다루고, 텍스트 증가로 인한 폭 변화는 보정하지 못함)
  // 메시지/위치가 바뀔 때마다 실제 크기를 측정해 부모 영역 안으로 위치를 재클램프한다.
  useLayoutEffect(() => {
    const el = bubbleRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) {
      setClampedPos(pos);
      return;
    }
    const PADDING = 4;
    const maxX = Math.max(PADDING, parent.clientWidth - el.offsetWidth - PADDING);
    const maxY = Math.max(PADDING, parent.clientHeight - el.offsetHeight - PADDING);
    const clampedX = Math.max(PADDING, Math.min(maxX, pos.x));
    const clampedY = Math.max(PADDING, Math.min(maxY, pos.y));
    // 저장(setStatusPosition) 하지 않고 표시용 state 만 갱신 — 저장값 드리프트 방지.
    setClampedPos((prev) =>
      prev.x === clampedX && prev.y === clampedY ? prev : { x: clampedX, y: clampedY },
    );
  }, [status, pos.x, pos.y]);

  const handleDragStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    dragStart.current = { px: e.clientX, py: e.clientY, ox: clampedPos.x, oy: clampedPos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleDragMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.px;
    const dy = e.clientY - dragStart.current.py;
    // 부모(룸 컨테이너) 의 실제 크기를 기준으로 좌상단 (x, y) 클램프.
    // 폭/높이가 없으면 안전 기본값(360/300) 으로 폴백.
    const el = bubbleRef.current;
    const parent = el?.parentElement;
    const PADDING = 4; // 가장자리에서 떼어둘 최소 여유
    const bw = el?.offsetWidth ?? 0;
    const bh = el?.offsetHeight ?? 0;
    const pw = parent?.clientWidth ?? 360;
    const ph = parent?.clientHeight ?? 300;
    const maxX = Math.max(PADDING, pw - bw - PADDING);
    const maxY = Math.max(PADDING, ph - bh - PADDING);
    setStatusPosition({
      x: Math.max(PADDING, Math.min(maxX, dragStart.current.ox + dx)),
      y: Math.max(PADDING, Math.min(maxY, dragStart.current.oy + dy)),
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
  // 이모지(서로게이트 페어)를 1글자로 세도록 코드포인트 길이 사용 — String.length 는 2로 셈.
  const draftLen = [...draft].length;
  const saveEdit = () => {
    if (draftLen > MAX_LEN) return;
    setStatusMessage(draft);
    setMode("idle");
  };
  const cancelEdit = () => {
    setDraft(status);
    setMode("idle");
  };

  const tooLong = draftLen > MAX_LEN;
  const isSelected = mode === "selected";
  const isEditing = mode === "editing";

  // 편집 모드는 form 이 252px 로 넓어지므로 우측 잘림 방지를 위해 left 클램프
  const EDIT_W = 252;
  const VISIBLE_RIGHT = 352; // 디바이스 폭(360) - 우측 여유 8px
  const VISIBLE_LEFT = 4;
  const containerLeft = isEditing
    ? Math.max(VISIBLE_LEFT, Math.min(clampedPos.x, VISIBLE_RIGHT - EDIT_W))
    : clampedPos.x;

  return (
    <div
      ref={bubbleRef}
      className="absolute z-[60] transition-[left] duration-150"
      style={{ left: containerLeft, top: clampedPos.y }}
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
              onChange={(e) => setDraft([...e.target.value].slice(0, MAX_LEN).join(""))}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancelEdit();
              }}
              placeholder="상태 메시지"
              className={`w-[140px] bg-transparent text-[14px] font-semibold outline-none placeholder:text-holo-ink-3 ${
                tooLong ? "text-holo-error" : "text-holo-ink"
              }`}
            />
            <span className={`mr-1 select-none text-[11px] tabular-nums ${tooLong ? "font-bold text-holo-error" : "text-holo-ink-3"}`}>
              {draftLen}/{MAX_LEN}
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
            className={`group relative flex max-w-[200px] items-center gap-[6px] rounded-[12px] rounded-bl-[4px] bg-white px-[14px] py-[8px] text-[14px] font-semibold text-holo-ink shadow-[0_2px_10px_rgba(116,72,221,0.15)] transition-shadow hover:shadow-[0_4px_14px_rgba(116,72,221,0.25)] ${
              isSelected ? "outline outline-2 outline-dashed outline-holo-purple-mid" : ""
            }`}
          >
            <span className="min-w-0 break-all">{status}</span>
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
