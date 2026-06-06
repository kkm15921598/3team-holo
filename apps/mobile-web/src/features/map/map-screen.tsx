import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { type Post } from "@/shared/mock/data";
import { postsStore } from "@/features/board/posts-store";
import { MapView } from "./post-map";
import { getAvatarUrl } from "@/features/chat/avatars";
import { calcJoined, deriveMeetupMembers, isMeetupEnded } from "@/features/board/meetup-utils";
import { useProfile } from "@/shared/hooks/use-profile";
import { isMyNickname } from "@/shared/stores/profile-store";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";
import { ME_PERSONA } from "@/features/home/home-faces";
import { isMyPost } from "@/features/board/author-identity";
import { useBlockedNicknames } from "@/shared/stores/blocked-nicknames-store";
import {
  useGeolocation,
  distanceMeters,
  type GeoPosition,
} from "@/shared/hooks/use-geolocation";
import { useReverseGeocodedRegion } from "@/shared/hooks/use-reverse-geocode";
import { useVerification } from "@/shared/stores/verification-store";

/** 미리보기에서 보이는 최대 반경 — 안내 문구와 일치 */
const PREVIEW_RADIUS_M = 5000;
/** 확장 모달(모임 지도)에서 토글 가능한 반경 옵션. 기본값은 5km. */
const MODAL_RADIUS_OPTIONS = [5000, 10000] as const;
type ModalRadius = (typeof MODAL_RADIUS_OPTIONS)[number];
const RADIUS_LABEL: Record<ModalRadius, string> = {
  5000: "5km",
  10000: "10km",
};

const FILTERS = ["전체", "지금바로", "계속 함께"] as const;
type Filter = (typeof FILTERS)[number];

/** 미터 → "350m" / "1.2km" 표시 문자열 */
function fmtDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// ─── 모달 상태 영속화 ───────────────────────────────────────
// 게시글 상세로 이동했다 뒤로가기로 돌아왔을 때 모달 / 반경 / 지도 view 가
// 그대로 복원되도록 sessionStorage 에 저장. 탭 닫으면 사라짐 → 새 세션엔 초기화.
type ModalMapState = {
  expanded: boolean;
  radius: ModalRadius;
  view?: { lat: number; lng: number; zoom: number };
};

const MODAL_STORAGE_KEY = "holo:map:modal";

function loadModalState(): ModalMapState {
  if (typeof window === "undefined") {
    return { expanded: false, radius: 5000 };
  }
  try {
    const raw = window.sessionStorage.getItem(MODAL_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === "object" && MODAL_RADIUS_OPTIONS.includes(p.radius)) {
        return {
          expanded: !!p.expanded,
          radius: p.radius as ModalRadius,
          view:
            p.view &&
            typeof p.view.lat === "number" &&
            typeof p.view.lng === "number" &&
            typeof p.view.zoom === "number"
              ? p.view
              : undefined,
        };
      }
    }
  } catch {
    // ignore
  }
  return { expanded: false, radius: 5000 };
}

function persistModalState(s: ModalMapState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MODAL_STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore (quota / private mode)
  }
}

function filterPosts(
  allPosts: Post[],
  filter: Filter,
  userPos: GeoPosition | null,
  radiusM: number,
  blocked: Set<string>,
): Post[] {
  let list = allPosts.filter((p) => !!p.location);
  // 일정이 지난(종료된) 모임은 지도 핀/카드에서 제외 — 지도는 '지금 참여 가능한 모임'을
  // 찾는 발견 화면이라, 종료된 모임이 활성 핀처럼 떠 있으면 안 된다(카드엔 상태 표시도 없음).
  list = list.filter((p) => !isMeetupEnded(p));
  // 차단한 작성자의 모임은 핀/카드에서 제외 — 게시판 목록과 동일 기준.
  if (blocked.size > 0) list = list.filter((p) => !blocked.has(p.authorNickname));
  // GPS 있을 때만 거리 필터링 — 아직 fix 가 없으면 전체 표시
  if (userPos) {
    list = list.filter((p) => {
      // 내 글은 거리와 무관하게 항상 노출(다른 동네에서 만든 내 모임이 지도에서 사라지던 문제).
      if (isMyPost(p)) return true;
      if (!p.location) return false;
      return distanceMeters(userPos, p.location) <= radiusM;
    });
  }
  // 모임 유형 필터: 지금바로=단기성, 계속 함께=장기성
  if (filter === "지금바로") {
    return list.filter((p) => p.meetupType === "단기성 모임");
  }
  if (filter === "계속 함께") {
    return list.filter((p) => p.meetupType === "장기성 모임");
  }
  return list;
}

export function MapScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // postsStore 구독 — 새 글 작성/삭제 시 지도 핀 자동 갱신
  const [allPosts, setAllPosts] = useState<Post[]>(() => postsStore.getPosts());
  useEffect(() => postsStore.subscribe(() => setAllPosts(postsStore.getPosts())), []);
  // 채팅방 "장소" 핀 클릭으로 진입한 경우: ?focusPostId=<id>
  // URL 파라미터는 mount 직후 정리해버리지만, 그 id 는 별도 state 로 붙들어둬서
  //  - 강조 핀/말풍선이 계속 표시되도록
  //  - 모달 닫기 버튼이 원래 채팅방으로 돌아가도록 (히스토리 복귀)
  // 처리한다.
  const [chatReturnPostId, setChatReturnPostId] = useState<string | null>(
    () => {
      if (typeof window === "undefined") return null;
      return new URLSearchParams(window.location.search).get("focusPostId");
    },
  );
  const focusPost = useMemo<Post | null>(() => {
    if (!chatReturnPostId) return null;
    return allPosts.find((p) => p.id === chatReturnPostId && !!p.location) ?? null;
  }, [chatReturnPostId, allPosts]);
  // 강조 핀 + 말풍선 (post.place 우선, 없으면 location.placeName, 둘 다 없으면 "모임 장소")
  const focusMarker = useMemo(() => {
    if (!focusPost?.location) return null;
    return {
      location: { lat: focusPost.location.lat, lng: focusPost.location.lng },
      label:
        focusPost.place ?? focusPost.location.placeName ?? "모임 장소",
    };
  }, [focusPost]);
  const [filter, setFilter] = useState<Filter>("전체");
  // 모달 상태는 sessionStorage 에서 한 번 로드. 같은 mount 동안에는
  // 이 초기값을 기준으로 view 가 변해도 MapView 가 리마운트되지 않게 한다.
  // focusPostId 가 있으면 그쪽이 우선 — 무조건 모달을 열고 그 위치로 센터링.
  const initialModalState = useMemo(() => {
    const saved = loadModalState();
    if (focusPost?.location) {
      return {
        expanded: true,
        radius: saved.radius,
        view: {
          lat: focusPost.location.lat,
          lng: focusPost.location.lng,
          // 기존 줌 유지하되 없으면 좀 더 가까이 (16 — 동/거리 단위)
          zoom: saved.view?.zoom ?? 16,
        },
      } as ModalMapState;
    }
    return saved;
  }, [focusPost]);
  const [expanded, setExpanded] = useState(initialModalState.expanded);
  const [modalRadius, setModalRadius] = useState<ModalRadius>(
    initialModalState.radius,
  );
  // view 는 ref 로만 관리 — pan/zoom 마다 storage 동기화하되 re-render 없음.
  // (MapView 의 initialCenter / initialZoom 은 mount 시점의 ref 값을 읽으므로
  //  반경 토글 등으로 부모가 re-render 되어도 지도 view 는 안 흔들림.)
  const viewRef = useRef(initialModalState.view);
  const handleModalViewChange = (view: {
    lat: number;
    lng: number;
    zoom: number;
  }) => {
    viewRef.current = view;
    persistModalState({ expanded, radius: modalRadius, view });
  };
  // expanded / radius 가 바뀔 때마다 storage 갱신 (view 도 함께 기록)
  useEffect(() => {
    persistModalState({
      expanded,
      radius: modalRadius,
      view: viewRef.current,
    });
  }, [expanded, modalRadius]);

  const userPos = useGeolocation();

  // 카드 아바타: 내 글/멤버는 내가 올린 실제 프로필 사진을 보여준다(닉네임 기반 생성 아바타 X).
  // 내 판별은 전화번호 우선(닉네임 변경 대비) + 과거 닉네임 포함(isMyNickname). 타인은 생성 아바타.
  const myProfile = useProfile();
  const myPhone = getCurrentAccount();
  const myFace = myProfile.profileFace ?? ME_PERSONA.face;
  // 차단한 작성자 모임을 지도에서 제외하기 위한 구독.
  const blockedSet = useBlockedNicknames();
  const avatarForSeed = (
    seed: string,
    isAuthor: boolean,
    authorPhone?: string | null,
  ): string => {
    if (isMyNickname(seed)) return myFace;
    if (isAuthor && myPhone && authorPhone && authorPhone === myPhone) return myFace;
    return getAvatarUrl(seed);
  };

  // 미리보기/카드 영역은 1km 고정, 확장 모달은 사용자가 선택한 반경(5km/10km).
  const previewPosts = useMemo(
    () => filterPosts(allPosts, filter, userPos, PREVIEW_RADIUS_M, blockedSet),
    [allPosts, filter, userPos, blockedSet],
  );
  const modalPosts = useMemo(() => {
    const base = filterPosts(allPosts, filter, userPos, modalRadius, blockedSet);
    // focusPost 가 반경/필터 밖이라도 항상 표시 — 채팅방에서 핀 클릭으로 들어왔을 때
    // 그 모임 마커가 보이지 않으면 동선이 끊긴다.
    if (focusPost && !base.some((p) => p.id === focusPost.id)) {
      return [...base, focusPost];
    }
    return base;
  }, [allPosts, filter, userPos, modalRadius, focusPost, blockedSet]);

  // URL 파라미터(focusPostId)는 mount 직후 한 번만 제거 — 뒤로가기/재진입 시
  // 또 강제로 재오픈되지 않도록. chatReturnPostId state 는 그대로 유지되어
  // 강조 핀 / 닫기-복귀 동작이 계속 작동한다.
  useEffect(() => {
    if (!searchParams.get("focusPostId")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("focusPostId");
    setSearchParams(next, { replace: true });
    // mount 직후 1회만 — searchParams 객체 자체 변경에 반응하지 않게 deps 비움
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 확장 모달 닫기.
   * 채팅방에서 진입한 경우(chatReturnPostId) → 그 채팅방으로 복귀.
   * 그 외에는 모달만 닫는다 (지도 미리보기 화면으로 돌아옴).
   */
  const handleModalClose = () => {
    if (chatReturnPostId) {
      // setChatReturnPostId(null) 후 같은 변수를 쓰면 향후 리팩터링/엣지에서 meetup-null
      // 로 이동할 위험이 있어, 비우기 전에 값을 먼저 캡처해 네비게이션에 사용한다.
      const postId = chatReturnPostId;
      // 강조 상태도 정리해서 다음에 모달을 직접 열 때 흔적이 남지 않게 한다.
      setChatReturnPostId(null);
      navigate(`/chat/meetup-${postId}`);
      return;
    }
    setExpanded(false);
  };
  // 이후 코드에서 visiblePosts 라는 이름은 카드/필터 안내 등에서 그대로 사용됨.
  const visiblePosts = previewPosts;

  // ESC로 모달 닫기 — 닫기 버튼과 동일하게 chat 복귀까지 처리
  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleModalClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // handleModalClose 는 매 렌더마다 새 함수지만 닫는 순간만 호출되므로
    // 이전 클로저로 동작해도 chatReturnPostId 의 정확성에는 영향 없음.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // 카드 가로 드래그 스크롤
  const cardsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ down: false, startX: 0, scrollLeft: 0, moved: false });

  function goToPost(id: string) {
    navigate("/board/" + id);
  }

  function handleMarkerClick(id: string) {
    // 모달은 닫지 않음 — sessionStorage 에 expanded:true 가 남아 있어야
    // 뒤로가기로 돌아왔을 때 동일 위치에서 모달이 자동 복원된다.
    goToPost(id);
  }

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
          // 일부 환경에서 캡처가 거부될 수 있음 — 무시
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
    // onClickCapture 가 직후에 실행되어 moved 값을 확인할 수 있도록 약간 지연 후 초기화
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
    <main className="relative flex flex-1 flex-col overflow-x-clip">
      {/* 현재 위치 라벨 — 인증된 동네 우선, 미인증 시 geolocation 기반 역지오코딩 */}
      <LocationLabel userPos={userPos} />

      {/* 지도 미리보기 — 드래그/줌 가능. 확장은 우상단 아이콘 버튼으로만.
          반경 5km 범위가 한눈에 들어오도록 zoom=13 기본값. */}
      <div className="relative mx-4 mt-2 h-[290px] overflow-hidden rounded-holo-tile shadow-[0_4px_20px_rgba(84,43,180,0.10)]">
        <MapView
          preview
          visiblePosts={visiblePosts}
          onMarkerClick={goToPost}
          initialCenter={userPos ?? undefined}
          initialZoom={13}
        />
        <button
          type="button"
          aria-label="지도 크게 보기"
          onClick={() => setExpanded(true)}
          className="absolute right-2 top-2 z-[400] flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow transition active:scale-95"
        >
          <ExpandIcon />
        </button>
      </div>

      <p className="mt-2 px-4 text-center text-[12px] font-medium text-holo-ink-4">
        ※ 내 주변 5km 안의 모임만 보여드려요
      </p>

      {/* 필터 */}
      <section className="mt-3 px-4">
        <div className="flex h-[50px] w-full items-center rounded-holo-pill bg-[#F1ECF9] p-[5px]">
          {FILTERS.map((f) => {
            const on = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={
                  "flex h-full flex-1 items-center justify-center rounded-holo-pill text-[15px] transition " +
                  (on
                    ? "bg-holo-gradient font-bold text-white shadow-[0_2px_6.9px_rgba(84,43,180,0.5)]"
                    : "font-medium text-[#A289CD]")
                }
              >
                {f}
              </button>
            );
          })}
        </div>
      </section>

      {/* 카드 — 우측 상단 화살표 아이콘 클릭 시 게시물 상세로 이동 (가로 드래그 스크롤)
          빈 상태일 때는 가로 슬라이드를 비우고 별도의 풀 너비 안내 박스를 표시한다. */}
      {visiblePosts.length === 0 ? (
        <section className="mt-3 px-4 pb-3">
          <div className="flex h-[220px] w-full flex-col items-center justify-center gap-3 rounded-[16px] bg-holo-lilac-card-2 px-6 text-center">
            <p className="text-[15px] font-semibold text-holo-ink">
              해당 필터에 표시할 모임이 없어요
            </p>
            <p className="text-[12px] leading-relaxed text-holo-ink-3">
              다른 필터를 선택하거나 지도를 움직여
              <br />
              가까운 모임을 찾아보세요
            </p>
          </div>
        </section>
      ) : (
      <section
        ref={cardsRef}
        className="holo-no-scrollbar mt-3 cursor-grab select-none overflow-x-auto pb-3 pl-4 pr-4 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onClickCapture={onClickCapture}
      >
        <div className="flex w-max gap-3">
          {visiblePosts.map((p) => {
            // 카드에 표시할 참여 인원수는 게시글 UI 와 동일한 baseJoined 를 사용
            // (= holds for home card / board detail / chat room).
            const { baseJoined } = calcJoined(p);
            // 아바타는 실제 멤버 닉네임을 시드로 사용해 채팅방 헤더 / board 와
            // 동일한 얼굴이 나오도록 한다.
            // 홈 카드와 동일하게 작성자 얼굴을 항상 앞에 포함(작성자=나여도 표시).
            const memberSeeds = [
              p.authorNickname,
              ...deriveMeetupMembers(p, baseJoined).filter((n) => n !== p.authorNickname),
            ];
            const visibleSeeds = memberSeeds.slice(0, 3);
            // visible+extra 가 항상 baseJoined 와 일치하도록(고정 -3 대신 실제 표시 개수 차감) — 홈과 통일.
            const extraCount = Math.max(0, baseJoined - visibleSeeds.length);
            return (
              <article
                key={p.id}
                data-post-card={p.id}
                className="relative h-[153px] w-[169px] min-w-[169px] shrink-0 rounded-[10px] bg-holo-lilac-card-2 px-[14px] pb-[13px] pt-[15px]"
              >
                <div className="text-[16px] font-bold text-holo-ink line-clamp-1 break-keep pr-[40px]">
                  {p.title}
                </div>
                <div className="mt-[5px] text-[12px] font-medium text-holo-purple-mid opacity-80">
                  {/* 거리: 내 위치+글 위치가 있을 때만 실제 계산(없으면 생략), 시간: 등록 경과(timeAgo).
                      이전엔 저장된 가짜 "0m · 0분" 을 그대로 표시했음. */}
                  {userPos && p.location
                    ? `${fmtDistance(distanceMeters(userPos, p.location))} · ${p.timeAgo}`
                    : p.timeAgo}
                </div>
                <p className="mt-[10px] line-clamp-2 text-[13px] leading-[1.45] text-[#333]">
                  {p.description}
                </p>
                <Link
                  to={`/board/${p.id}`}
                  aria-label={`${p.title} 게시글로 이동`}
                  className="absolute right-[13px] top-[13px] flex h-[33px] w-[33px] items-center justify-center rounded-full bg-holo-lilac-light transition-colors hover:bg-holo-purple-mid"
                >
                  <ArrowOutIcon stroke="#FFFFFF" />
                </Link>

                {/* 참여자 아바타 — 실제 멤버 닉네임을 시드로 사용해 채팅방/board 와 일치 */}
                {baseJoined > 0 && visibleSeeds.length > 0 && (
                  <div className="absolute bottom-[13px] left-[14px] flex">
                    {visibleSeeds.map((seed, i) => (
                      <img
                        key={seed + i}
                        src={avatarForSeed(seed, i === 0 && seed === p.authorNickname, p.authorPhone)}
                        alt=""
                        aria-hidden
                        draggable={false}
                        className="block h-[28px] w-[28px] rounded-full border-2 border-holo-lilac-card-2 object-cover"
                        style={{
                          marginLeft: i === 0 ? 0 : -6,
                        }}
                      />
                    ))}
                    {extraCount > 0 && (
                      <span
                        className="flex h-[28px] min-w-[28px] items-center justify-center rounded-full border-2 border-holo-lilac-card-2 bg-holo-purple-mid px-1 text-[11px] font-bold text-white"
                        style={{ marginLeft: -6 }}
                        aria-label={"외 " + extraCount + "명 더"}
                      >
                        +{extraCount}
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => navigate("/board/write")}
        aria-label="모임 만들기"
        className="fixed bottom-[88px] right-4 z-20 flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-[0_2px_6.9px_rgba(84,43,180,0.5)] transition active:scale-95"
        style={{ background: "linear-gradient(135deg,#542BB4,#E95AA4)" }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path d="M11 4V18M4 11H18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* 확장 모달 — viewport 고정 + mx-auto 센터링 */}
      {expanded && (
        <div className="fixed inset-0 z-[500] mx-auto flex max-w-[360px] flex-col bg-white">
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-holo-line-3 px-4">
            <button
              type="button"
              onClick={handleModalClose}
              aria-label="닫기"
              className="flex h-8 w-8 items-center justify-center"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m15 18-6-6 6-6" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="text-[15px] font-bold text-holo-ink">모임 지도</span>
            <span className="h-8 w-8" />
          </header>

          {/* 반경 선택 — 5km / 10km 세그먼트 토글 */}
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3">
            <span className="text-[12px] font-medium text-holo-ink-3">
              내 주변 {RADIUS_LABEL[modalRadius]} 안의 모임
              <span className="ml-1 text-holo-purple-mid">{modalPosts.length}</span>
              <span className="text-holo-ink-4">개</span>
            </span>
            <div className="flex h-[32px] items-center rounded-full border border-holo-line-2 bg-white p-[3px]">
              {MODAL_RADIUS_OPTIONS.map((r) => {
                const on = modalRadius === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setModalRadius(r)}
                    className={
                      "h-full rounded-full px-3 text-[12px] transition " +
                      (on
                        ? "bg-holo-purple-mid font-bold text-white shadow-[0_1px_4px_rgba(116,72,221,0.35)]"
                        : "font-medium text-holo-ink-3")
                    }
                  >
                    {RADIUS_LABEL[r]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 p-4 pt-3">
            <div className="relative h-full w-full overflow-hidden rounded-holo-tile shadow-[0_4px_20px_rgba(84,43,180,0.10)]">
              <MapView
                preview={false}
                visiblePosts={modalPosts}
                onMarkerClick={handleMarkerClick}
                // 직전 view 가 저장돼 있으면 그 좌표/줌으로 복원, 없으면 GPS 위치.
                // viewRef 는 mount 시점에 한 번만 읽혀 MapView 내부 ref 로 캡쳐되므로
                // 이후 ref 가 갱신돼도 지도 view 가 끌려다니지 않음.
                initialCenter={
                  viewRef.current
                    ? { lat: viewRef.current.lat, lng: viewRef.current.lng }
                    : (userPos ?? undefined)
                }
                initialZoom={viewRef.current?.zoom}
                onViewChange={handleModalViewChange}
                // 저장된 view 가 있을 땐 GPS fix 자동 센터링 차단.
                centerOnFix={!viewRef.current}
                // 채팅방에서 진입했으면 모임 장소를 핀+말풍선으로 강조 표시
                focusMarker={focusMarker}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="#7448DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowOutIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 11L11 3M11 3H5M11 3V9" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 지도 위 현재 위치 라벨.
 * 1) 사용자가 직접 인증한 동네(verifiedRegion) 가 있으면 그걸 우선 — 마이페이지·계정관리
 *    화면과 일관된 라벨이 노출되도록.
 * 2) 인증된 동네가 없으면 GPS 좌표 reverse geocoding 결과로 폴백.
 * 3) 둘 다 없으면 안내문 노출.
 */
function LocationLabel({ userPos }: { userPos: GeoPosition | null }) {
  const verification = useVerification();
  const geoLabel = useReverseGeocodedRegion(userPos);
  // 핸드폰에서도 라벨이 한 줄에 잘리지 않게 truncate + min-w-0 처리.
  // 위치 공유 OFF/신호 없음(userPos=null)이면 geo 라벨을 쓰지 않는다 — 역지오코딩 훅이
  // 깜빡임 방지로 직전 라벨을 유지하는데, 그게 끈 위치의 동네명을 계속 노출하던 문제 방지.
  const label = verification.verifiedRegion || (userPos ? geoLabel : "");

  return (
    <div className="mx-4 mt-3 flex items-center gap-1.5 px-1 text-[13px] text-holo-ink-2">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="#7448DD"
        stroke="#7448DD"
        strokeWidth="1"
        aria-hidden
        className="shrink-0"
      >
        <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
        <circle cx="12" cy="9" r="2.5" fill="white" />
      </svg>
      <span className="min-w-0 flex-1 truncate font-medium">
        {label || (userPos ? "위치 확인 중…" : "위치 정보를 받을 수 없어요")}
      </span>
    </div>
  );
}
