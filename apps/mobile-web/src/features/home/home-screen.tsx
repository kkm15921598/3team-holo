import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getBadgeById } from "../../badge";
import { ME_PERSONA } from "./home-faces";
import { RoomScene } from "./home-illustrations";
import { MeetupCard, PlusIcon, RefreshIcon } from "./home-meetup-card";
import { pickRandomMeetups } from "./home-meetups-data";
import { useStatusMessage, useStatusPosition } from "../myroom/myroom-store";
import { ROOM_H, ROOM_W } from "../myroom/myroom-data";
import { ME } from "@/shared/mock/data";
import { useProfile } from "@/shared/hooks/use-profile";

const LEVEL = ME.level;

export function HomeScreen() {
  const [meetups, setMeetups] = useState(() => pickRandomMeetups(3));
  const status = useStatusMessage();
  const statusPos = useStatusPosition();
  const profile = useProfile();
  const equippedBadge = getBadgeById(profile.equippedBadgeId);

  // 카드 가로 드래그 스크롤 (map-screen과 동일)
  const cardsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ down: false, startX: 0, scrollLeft: 0, moved: false });

  const handleRefresh = () => {
    setMeetups((prev) => pickRandomMeetups(3, prev));
    // 새로고침 시 카드 캐러셀을 첫 번째 카드 위치로 되돌린다.
    const el = cardsRef.current;
    if (el) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = cardsRef.current;
    if (!el) return;
    dragRef.current = {
      down: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
    // 포인터 캡처는 실제 드래그가 시작된 뒤(onPointerMove) 잡는다.
    // 즉시 캡처하면 자식 <Link>의 click 이벤트가 부모로 리디렉션되어
    // 화살표 클릭 시 라우팅이 동작하지 않는다.
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = cardsRef.current;
    if (!el || !dragRef.current.down) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 4) {
      if (!dragRef.current.moved) {
        dragRef.current.moved = true;
        // 임계치를 처음 넘는 순간에만 캡처 시작
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // ignore — 일부 환경에서 캡처가 거부될 수 있음
        }
      }
    }
    if (dragRef.current.moved) {
      el.scrollLeft = dragRef.current.scrollLeft - dx;
    }
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const el = cardsRef.current;
    if (!el) return;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    dragRef.current.down = false;
    // onClickCapture가 직후에 실행되어 moved 값을 확인할 수 있도록 약간 지연 후 초기화
    setTimeout(() => {
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
            {/* 룸 좌표계(ROOM_W × ROOM_H)와 동일한 래퍼 안에서 RoomScene 과
                상태 메시지를 함께 렌더링하여, 마이룸 편집 화면에서 드래그한
                상태 메시지 위치가 홈에도 동일한 좌표로 노출되도록 한다. */}
            <div className="relative" style={{ width: ROOM_W, height: ROOM_H }}>
              <RoomScene />
              <div
                className="absolute z-[5] whitespace-nowrap rounded-[12px] rounded-bl-[4px] bg-white px-[14px] py-[8px] text-[15px] font-semibold text-holo-ink shadow-[0_2px_10px_rgba(116,72,221,0.15)]"
                style={{ left: statusPos.x, top: statusPos.y }}
              >
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
            </div>
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
                <span className="text-[20px] font-bold text-holo-ink">{profile.nickname}</span>
                {equippedBadge && (
                  <img src={equippedBadge.src} alt={equippedBadge.name} title={equippedBadge.name} className="h-[27px] w-[27px] object-contain" />
                )}
              </div>
              <div className="text-[15px] text-[#A9A9A9]">{profile.title}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-[68px] px-[14px]">
        <p className="mb-[3px] text-[15px] text-[#8E8E8E]">어떤 모임에 들어갈지 고민되시나요?</p>
        <div className="mb-[14px] flex items-center gap-[6px] text-[18px]">
          <span className="font-bold text-holo-purple-mid">{profile.nickname}</span>
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
        className="fixed bottom-[88px] right-4 z-20 flex h-[52px] w-[52px] items-center justify-center rounded-full text-white shadow-[0_2px_6.9px_rgba(84,43,180,0.5)]"
        style={{ background: "linear-gradient(135deg,#542BB4,#E95AA4)" }}
      >
        <PlusIcon />
      </Link>
    </main>
  );
}
