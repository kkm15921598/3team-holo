import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getBadgeById } from "../../badge";
import { ME_PERSONA } from "./home-faces";
import { RoomScene } from "./home-illustrations";
import { MeetupCard, PlusIcon, RefreshIcon } from "./home-meetup-card";
import { pickMeetupsFromPosts, postToMeetup } from "./home-meetups-data";
import { OnelineTicker } from "./oneline-ticker";
import { syncOnelineFromSupabase } from "./oneline-store";
import { postsStore } from "@/features/board/posts-store";
import { useStatusMessage, useStatusPosition } from "../myroom/myroom-store";
import { ROOM_H, ROOM_W } from "../myroom/myroom-data";
import { useProfile } from "@/shared/hooks/use-profile";
import { useAccountStats } from "@/shared/stores/account-stats-store";
import { useGeolocation } from "@/shared/hooks/use-geolocation";
import { useBlockedNicknames } from "@/shared/stores/blocked-nicknames-store";
import { ConfirmModal } from "@/shared/components/confirm-modal";
import { AttendancePopup, shouldShowAttendancePopup, markAttendancePopupShown } from "@/features/event/attendance-popup";

export function HomeScreen() {
  const userPos = useGeolocation();
  const [allPosts, setAllPosts] = useState(() => postsStore.getPosts());
  const [meetups, setMeetups] = useState(() =>
    pickMeetupsFromPosts(postsStore.getPosts(), 3, undefined, null),
  );

  useEffect(() => {
    return postsStore.subscribe(() => {
      setAllPosts(postsStore.getPosts());
    });
  }, []);

  // 동네 한 줄 소식 — 마운트 시 서버에서 최근 소식을 끌어와 로컬과 병합(테이블 없으면 무시).
  useEffect(() => {
    syncOnelineFromSupabase();
  }, []);

  // 최신 userPos 를 ref 로 보관 — 카드를 새로 뽑을 때 거리 계산에만 쓰고,
  // userPos 객체 참조 변화(GPS tick 마다 새 객체)가 카드 '선택'을 초기화하지 않게 한다.
  const userPosRef = useRef(userPos);
  userPosRef.current = userPos;

  // 차단 목록 — 변경되면(프로필에서 차단 후 홈 복귀) 추천 카드를 다시 뽑아
  // 차단한 사람의 모임이 즉시 사라지게 한다. (이전엔 allPosts 만 deps 라, 글이 그대로면
  //  차단해도 useEffect 가 재실행되지 않아 차단한 모임이 카드에 남아 있었다.)
  const blocked = useBlockedNicknames();

  // (A) 글 목록/차단 목록이 바뀔 때 추천 카드를 새로 뽑는다. (userPos 는 deps 에서 제외 — ref 사용)
  // → GPS tick 이 사용자의 새로고침(handleRefresh) 선택을 매번 되돌리던 회귀 방지.
  useEffect(() => {
    setMeetups(pickMeetupsFromPosts(allPosts, 3, undefined, userPosRef.current));
  }, [allPosts, blocked]);

  // (B) 내 위치 좌표가 실제로 바뀌면 '선택된 카드'는 유지하고 각 카드의 거리만 갱신.
  //     posKey(좌표 문자열)로만 트리거 — 동일 좌표의 GPS 재콜백으로는 재실행되지 않는다.
  const posKey = userPos ? `${userPos.lat.toFixed(4)},${userPos.lng.toFixed(4)}` : "";
  useEffect(() => {
    if (!userPos) return;
    setMeetups((prev) =>
      prev.map((m) => {
        const post = postsStore.getPosts().find((p) => p.id === m.id);
        return post ? postToMeetup(post, userPos) : m;
      }),
    );
    // posKey 가 트리거이며 userPos 는 그와 동기된 값이라 closure 가 일관됨.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posKey]);
  const status = useStatusMessage();
  const statusPos = useStatusPosition();
  const profile = useProfile();
  const stats = useAccountStats();
  const equippedBadge = getBadgeById(profile.equippedBadgeId);

  // 가입 직후 sessionStorage 에 남겨둔 보너스 포인트 플래그를 읽어 환영 모달 노출.
  // 모달을 닫으면 플래그를 제거하므로 다시 들어와도 한 번만 보인다.
  const [welcomeBonus, setWelcomeBonus] = useState<number | null>(null);
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("holo:welcomeBonus");
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) setWelcomeBonus(n);
      }
    } catch {
      // ignore
    }
  }, []);
  const closeWelcome = () => {
    try {
      window.sessionStorage.removeItem("holo:welcomeBonus");
    } catch {
      // ignore
    }
    setWelcomeBonus(null);
  };

  // 매일 접속 시 출석체크 팝업 — 오늘 이미 출석했거나 '오늘 하루 보지 않기'면 안 뜬다.
  // (환영 모달이 떠 있는 동안엔 가렸다가, 닫힌 뒤 노출 — 아래 렌더에서 !welcomeBonus 로 게이트.)
  const [showAttendance, setShowAttendance] = useState(false);
  useEffect(() => {
    if (shouldShowAttendancePopup()) {
      markAttendancePopupShown(); // 이번 세션 자동 재노출 차단(닫고 재진입해도 또 안 뜸)
      setShowAttendance(true);
    }
  }, []);

  // 카드 가로 드래그 스크롤 (map-screen과 동일)
  const cardsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ down: false, startX: 0, scrollLeft: 0, moved: false });

  const handleRefresh = () => {
    setMeetups((prev) => {
      // 1) 근처(5km)에서 직전 카드 제외하고 다시 뽑기.
      const next = pickMeetupsFromPosts(allPosts, 3, prev, userPos);
      if (next.length > 0) return next;
      // 2) 근처에 더 없으면 반경을 넓혀(전체) 다른 모임을 보여준다 — 새로고침이 '안 먹는'
      //    느낌(같은 3개 반복) 방지.
      const broadened = pickMeetupsFromPosts(allPosts, 3, prev, userPos, Infinity);
      if (broadened.length > 0) return broadened;
      // 3) 그래도 없으면(후보 자체가 3개 이하) 제외 없이 전체에서 다시 뽑기.
      return pickMeetupsFromPosts(allPosts, 3, undefined, userPos, Infinity);
    });
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
                className="absolute z-[5] max-w-[180px] whitespace-normal break-all rounded-[12px] rounded-bl-[4px] bg-white px-[14px] py-[8px] text-[15px] font-semibold text-holo-ink shadow-[0_2px_10px_rgba(116,72,221,0.15)]"
                style={(() => {
                  // 룸(ROOM_W=400)은 360px 프레임에 가운데 정렬돼 좌우로 (ROOM_W-360)/2 만큼
                  // 화면 밖으로 넘친다. 말풍선을 ROOM_W 기준으로 클램프하면 그 '안 보이는 영역'
                  // 으로 들어가 화면 밖으로 나가 보인다 → '보이는 360 창' 안으로 클램프한다.
                  const FRAME = 360; // 기기 프레임 폭
                  const BW = 180; // 말풍선 최대 폭(max-w-[180px])
                  const PAD = 8;
                  const ovf = Math.max(0, (ROOM_W - FRAME) / 2); // 한쪽 넘침(=20)
                  const minX = ovf + PAD;
                  const maxX = ovf + FRAME - BW - PAD;
                  return {
                    left: Math.max(minX, Math.min(statusPos.x, maxX)),
                    top: Math.max(8, Math.min(statusPos.y, ROOM_H - 56)),
                  };
                })()}
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
                src={profile.profileFace ?? ME_PERSONA.face}
                alt={profile.nickname}
                className="h-[63px] w-[63px] rounded-full object-cover"
                draggable={false}
              />
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[4px] px-[9px] py-[3px] text-[12px] font-bold text-white"
                style={{ background: "linear-gradient(to right,#542BB4,#E95AA4)" }}
              >
                Lv.{stats.level}
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

      {/* 동네 한 줄 소식 — 추천 모임 위. 가벼운 휘발성 소식으로 재방문/참여 유도. */}
      <OnelineTicker />

      <section className="mt-[28px] px-[14px]">
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
        {meetups.length === 0 ? (
          <div className="flex h-[140px] flex-col items-center justify-center gap-[10px] rounded-[16px] bg-holo-surface">
            <span className="text-[14px] font-semibold text-holo-ink-2">아직 근처 모임이 없어요</span>
            <span className="text-[14px] text-holo-ink-3">첫 번째로 만들어보세요!</span>
          </div>
        ) : (
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
        )}
      </section>

      <Link
        to="/board/write"
        aria-label="모임 만들기"
        className="fixed bottom-[88px] right-4 z-20 flex h-[52px] w-[52px] items-center justify-center rounded-full text-white shadow-[0_2px_6.9px_rgba(84,43,180,0.5)]"
        style={{ background: "linear-gradient(135deg,#542BB4,#E95AA4)" }}
      >
        <PlusIcon />
      </Link>

      {welcomeBonus !== null && (
        <WelcomeBonusModal bonus={welcomeBonus} onClose={closeWelcome} />
      )}

      {/* 출석체크 팝업 — 환영 모달이 없을 때만(겹침 방지), 하루 1회. */}
      {showAttendance && welcomeBonus === null && (
        <AttendancePopup onClose={() => setShowAttendance(false)} />
      )}
    </main>
  );
}

/** 가입 직후 홈 진입 시 한 번 띄우는 환영 보너스 모달 */
function WelcomeBonusModal({
  bonus,
  onClose,
}: {
  bonus: number;
  onClose: () => void;
}) {
  return (
    <ConfirmModal
      open
      message={<span className="text-[18px] leading-snug">환영합니다! 🎉</span>}
      description={
        <>
          HOLO 가입을 축하드려요.
          <br />
          가입 보너스로 포인트를 드릴게요.
        </>
      }
      singleAction
      onConfirm={onClose}
    >
      <div className="flex items-center justify-center gap-2 rounded-[12px] border border-holo-lilac-deep bg-holo-lilac-card px-4 py-2">
        <span className="text-[16px]">💜</span>
        <span className="text-[18px] font-bold text-holo-purple-mid">
          +{bonus}P
        </span>
      </div>
    </ConfirmModal>
  );
}