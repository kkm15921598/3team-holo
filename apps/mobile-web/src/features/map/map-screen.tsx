import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import { MY_LOCATION, POSTS, type Post } from "@/shared/mock/data";
import { pickPersonas } from "@/features/home/home-faces";

const FILTERS = ["전체", "지금바로", "계속 함께"] as const;
type Filter = (typeof FILTERS)[number];

function filterPosts(filter: Filter): Post[] {
  const withLocation = POSTS.filter((p) => !!p.location);
  if (filter === "전체") return withLocation;
  if (filter === "지금바로") return withLocation.filter((p) => p.status === "모집중");
  return withLocation.filter((p) => p.status === "모집완료");
}

const postIcon = L.divIcon({
  className: "holo-post-marker",
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  html: '<div class="holo-post-glow"><div class="holo-post-dot"></div></div>',
});

// 표준 앱 스타일 사용자 위치 마커: 정확도 링 + solid dot
function buildUserIcon(preview: boolean) {
  const size = preview ? 48 : 80;
  return L.divIcon({
    className: "holo-user-marker" + (preview ? " holo-preview" : ""),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html:
      '<div class="holo-user-glow-outer">' +
      '<div class="holo-user-glow-inner"></div>' +
      "</div>",
  });
}

type MapViewProps = {
  preview: boolean;
  visiblePosts: Post[];
  onMarkerClick?: (id: string) => void;
};

function MapView({ preview, visiblePosts, onMarkerClick }: MapViewProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const postMarkersRef = useRef<Record<string, L.Marker>>({});

  useLayoutEffect(() => {
    if (!elRef.current || mapRef.current) return;

    const map = L.map(elRef.current, {
      center: [MY_LOCATION.lat, MY_LOCATION.lng],
      zoom: 16,
      minZoom: 14,
      maxZoom: 18,
      zoomControl: !preview,
      attributionControl: !preview,
      dragging: !preview,
      scrollWheelZoom: !preview,
      doubleClickZoom: !preview,
      touchZoom: !preview,
      boxZoom: !preview,
      keyboard: !preview,
    });

    const tiles = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        subdomains: "abcd",
        attribution: "© OSM © CARTO",
      },
    );
    tiles.addTo(map);

    L.marker([MY_LOCATION.lat, MY_LOCATION.lng], {
      icon: buildUserIcon(preview),
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
    }).addTo(map);

    mapRef.current = map;

    function refreshSize() {
      map.invalidateSize();
      tiles.redraw();
      // 1px 팬 → 원위치: leaflet의 내부 viewport 캐시를 강제로 무효화
      map.panBy([1, 0], { animate: false });
      map.panBy([-1, 0], { animate: false });
    }
    const ro = new ResizeObserver(refreshSize);
    ro.observe(elRef.current);
    const raf1 = requestAnimationFrame(refreshSize);
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(refreshSize));
    const timers = [50, 200, 500, 1000, 2000].map((d) => setTimeout(refreshSize, d));

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      timers.forEach(clearTimeout);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      postMarkersRef.current = {};
    };
  }, [preview]);

  // 게시물 마커 동기화
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(postMarkersRef.current).forEach((m) => m.remove());
    postMarkersRef.current = {};

    visiblePosts.forEach((p) => {
      if (!p.location) return;
      const marker = L.marker([p.location.lat, p.location.lng], {
        icon: postIcon,
        interactive: !preview,
        riseOnHover: true,
      }).addTo(map);

      if (!preview && onMarkerClick) {
        marker.on("click", () => onMarkerClick(p.id));
      }

      postMarkersRef.current[p.id] = marker;
    });
  }, [visiblePosts, preview, onMarkerClick]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={elRef}
        className="absolute inset-0"
        style={preview ? { pointerEvents: "none" } : undefined}
      />
    </div>
  );
}

export function MapScreen() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("전체");
  const [expanded, setExpanded] = useState(false);

  const visiblePosts = useMemo(() => filterPosts(filter), [filter]);

  // ESC로 모달 닫기
  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded]);

  // 카드 가로 드래그 스크롤
  const cardsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ down: false, startX: 0, scrollLeft: 0, moved: false });

  function goToPost(id: string) {
    navigate("/board/" + id);
  }

  function handleCardClick(p: Post) {
    if (dragRef.current.moved) return; // 드래그 중 클릭은 무시
    goToPost(p.id);
  }

  function handleMarkerClick(id: string) {
    setExpanded(false); // 모달 닫고
    goToPost(id);       // 게시물로 이동
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

  return (
    <main className="relative flex flex-1 flex-col overflow-x-clip">
      {/* 지도 미리보기 — 클릭 시 확장 (button 대신 div: leaflet 내부 panes 사이즈 계산이 button child일 때 어긋남) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(true);
          }
        }}
        aria-label="지도 크게 보기"
        className="relative mx-4 mt-3 h-[290px] cursor-pointer overflow-hidden rounded-holo-tile shadow-[0_4px_20px_rgba(84,43,180,0.10)]"
      >
        <MapView preview visiblePosts={visiblePosts} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-2 z-[400] flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow"
        >
          <ExpandIcon />
        </span>
      </div>

      <p className="mt-2 px-4 text-center text-[12px] font-medium text-holo-ink-4">
        ※ 정책상 반경 50m 거리 내 위치만 표시됩니다
      </p>

      {/* 필터 */}
      <section className="mt-5 px-4">
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

      {/* 카드 — 클릭 시 게시물 상세로 이동 (가로 드래그 스크롤) */}
      <section
        ref={cardsRef}
        className="holo-no-scrollbar mt-3 cursor-grab select-none overflow-x-auto pb-3 pl-4 pr-4 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div className="flex w-max gap-3">
          {visiblePosts.length === 0 && (
            <div className="flex h-[153px] w-[280px] items-center justify-center rounded-holo-tile bg-[#EBE4F5] text-[13px] text-holo-ink-3">
              해당 필터에 표시할 모임이 없어요
            </div>
          )}
          {visiblePosts.map((p) => (
            <article
              key={p.id}
              data-post-card={p.id}
              onClick={() => handleCardClick(p)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goToPost(p.id);
                }
              }}
              className="relative h-[153px] w-[169px] min-w-[169px] shrink-0 cursor-pointer rounded-[10px] bg-holo-lilac-card-2 px-[14px] pb-[13px] pt-[15px]"
            >
              <div className="line-clamp-1 break-keep pr-[40px] text-[16px] font-bold leading-tight text-holo-ink">
                {p.title}
              </div>
              <div className="mt-[3px] text-[12px] font-medium text-holo-purple-mid opacity-80">
                {p.distance} · {p.duration}
              </div>
              <p className="mt-2 line-clamp-2 max-h-[40px] max-w-[120px] text-[13px] leading-[1.4] text-[#333]">
                {p.description}
              </p>

              <Link
                to={`/board/${p.id}`}
                aria-label={`${p.title} 게시글로 이동`}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-[13px] top-[13px] flex h-[33px] w-[33px] items-center justify-center rounded-full bg-holo-lilac-light transition-colors hover:bg-holo-purple-mid"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M3 11L11 3M11 3H5M11 3V9" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>

              {/* 참여자 아바타 — 페르소나 얼굴 사진 사용 (홈 카드와 동일) */}
              {p.participants.length > 0 && (() => {
                const personas = pickPersonas(parseInt(p.id, 10) || 1, p.participants.length);
                const visible = personas.slice(0, 4);
                const extra = p.participants.length - visible.length;
                return (
                  <div className="absolute bottom-[13px] left-[14px] flex">
                    {visible.map((pa, i) => (
                      <img
                        key={pa.name + i}
                        src={pa.face}
                        alt={pa.name}
                        title={pa.name}
                        className="h-[28px] w-[28px] rounded-full border-2 border-holo-lilac-card-2 object-cover"
                        style={{ marginLeft: i === 0 ? 0 : -6 }}
                        draggable={false}
                      />
                    ))}
                    {extra > 0 && (
                      <span
                        className="ml-[-6px] flex h-[28px] min-w-[28px] items-center justify-center rounded-full border-2 border-holo-lilac-card-2 bg-holo-purple-mid px-1 text-[11px] font-bold text-white"
                        aria-label={"외 " + extra + "명 더"}
                      >
                        +{extra}
                      </span>
                    )}
                  </div>
                );
              })()}
            </article>
          ))}
        </div>
      </section>

      {/* FAB */}
      <button
        type="button"
        onClick={() => navigate("/board/write")}
        aria-label="모임 만들기"
        className="absolute bottom-3 right-4 z-[400] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-holo-gradient shadow-[0_4px_16px_rgba(84,43,180,0.4)] transition active:scale-95"
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
              onClick={() => setExpanded(false)}
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
          <div className="min-h-0 flex-1 p-4">
            <div className="relative h-full w-full overflow-hidden rounded-holo-tile shadow-[0_4px_20px_rgba(84,43,180,0.10)]">
              <MapView
                preview={false}
                visiblePosts={visiblePosts}
                onMarkerClick={handleMarkerClick}
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
