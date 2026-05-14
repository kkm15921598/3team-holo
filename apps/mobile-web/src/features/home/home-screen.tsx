import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getBadgeByName } from "../../badge";
import { ME_PERSONA } from "./home-faces";
import { RoomScene } from "./home-illustrations";
import { MeetupCard, PlusIcon, RefreshIcon } from "./home-meetup-card";
import { pickRandomMeetups } from "./home-meetups-data";
import { useStatusMessage } from "../myroom/myroom-store";
import { ME } from "@/shared/mock/data";

// 모든 화면에서 동일한 닉네임 사용 — 데이터 단일 출처
const NICKNAME = ME.nickname;
const LEVEL = ME.level;
const TITLE = ME.title;
/** 메인 프로필에 표시할 뱃지 — 한글 이름으로 지정 */
const BADGE = getBadgeByName("HOLO 수호신");

export function HomeScreen() {
  const [meetups, setMeetups] = useState(() => pickRandomMeetups(3));
  const handleRefresh = () => setMeetups((prev) => pickRandomMeetups(3, prev));
  const status = useStatusMessage();

  // 카드 가로 드래그 스크롤 (map-screen과 동일)
  const cardsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ down: false, startX: 0, scrollLeft: 0, moved: false });

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = cardsRef.current;
    if (!el) return;
    dragRef.current = {
      down: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = cardsRef.current;
    if (!el || !dragRef.current.down) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 4) dragRef.current.moved = true;
    el.scrollLeft = dragRef.current.scrollLeft - dx;
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const el = cardsRef.current;
    if (!el) return;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    setTimeout(() => {
      dragRef.current.down = false;
      dragRef.current.moved = false;
    }, 0);
  }
  // 드래그 중 카드 안쪽 Link 클릭이 발생하면 라우팅 방지
  function onClickCapture(e: React.MouseEvent) {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  return (
    <main className="flex flex-1 flex-col pb-6">
      <section className="relative">
        <div
          className="relative mx-auto h-[420px] w-[calc(100%)] overflow-visible rounded-b-[40px] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/illustrations/home-hero.png)" }}
        >
          <div className="absolute left-0 right-0 top-[10px] flex justify-center">
            <RoomScene />
          </div>

          <div className="absolute right-[42px] top-[148px] z-[5] whitespace-nowrap rounded-[12px] rounded-bl-[4px] bg-white px-[14px] py-[8px] text-[15px] font-semibold text-holo-ink shadow-[0_2px_10px_rgba(116,72,221,0.15)]">
            {status}
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
          </div>

          <div className="absolute -bottom-[44px] left-1/2 z-[6] flex h-[88px] w-[319px] -translate-x-1/2 items-center gap-[14px] rounded-[20px] bg-holo-surface px-4 shadow-[0_4px_16px_rgba(116,72,221,0.1)]">
            <div className="relative h-[63px] w-[63px] shrink-0">
              <img
                src={ME_PERSONA.face}
                alt={ME_PERSONA.name}
                className="h-[63px] w-[63px] rounded-full object-cover"
                draggable={false}
              />
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[4px] px-[9px] py-[3px] text-[12px] font-bold text-white"
                style={{ background: "linear-gradient(to right,#542BB4,#E95AA4)" }}
              >
                Lv.{LEVEL}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-[6px] flex items-center gap-2">
                <span className="text-[20px] font-bold text-holo-ink">{NICKNAME}</span>
                {BADGE && (
                  <img src={BADGE.src} alt={BADGE.name} title={BADGE.name} className="h-[27px] w-[27px] object-contain" />
                )}
              </div>
              <div className="text-[15px] text-[#A9A9A9]">{TITLE}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-[68px] px-[14px]">
        <p className="mb-[3px] text-[15px] text-[#8E8E8E]">어떤 모임에 들어갈지 고민되시나요?</p>
        <div className="mb-[14px] flex items-center gap-[6px] text-[18px]">
          <span className="font-bold text-holo-purple-mid">{NICKNAME}</span>
          <span className="font-medium text-black">님을 위한</span>
          <span className="font-bold text-holo-purple-mid">추천 모임</span>
          <button
            type="button"
            aria-label="새로고침"
            onClick={handleRefresh}
            className="ml-[2px] flex items-center rounded-full p-[6px] text-holo-purple-mid transition-colors hover:bg-holo-lilac-card-2 active:bg-holo-lilac-card"
          >
            <RefreshIcon />
          </button>
        </div>
        <div
          ref={cardsRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          onClickCapture={onClickCapture}
          className="no-scrollbar -mx-[14px] flex cursor-grab select-none gap-3 overflow-x-auto px-[14px] pb-2 active:cursor-grabbing"
        >
          {meetups.map((m) => (
            <MeetupCard key={m.id} m={m} />
          ))}
        </div>
      </section>

      <Link
        to="/board/write"
        aria-label="모임 만들기"
        className="fixed bottom-[103px] left-1/2 z-20 flex h-[52px] w-[52px] translate-x-[110px] items-center justify-center rounded-full text-white shadow-[0_2px_6.9px_rgba(84,43,180,0.5)]"
        style={{ background: "linear-gradient(135deg,#542BB4,#E95AA4)" }}
      >
        <PlusIcon />
      </Link>
    </main>
  );
}
