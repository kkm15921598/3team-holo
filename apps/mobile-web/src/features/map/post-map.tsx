import { useEffect, useLayoutEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { type Post, type PostLocation } from "@/shared/mock/data";

/**
 * GPS fix 가 아직 안 잡혔거나 좌표가 지정되지 않은 경우의 지도 기본 중심.
 * 의미 있는 fallback 좌표가 없으면 서울 시청 부근으로 떨군다.
 */
const SEOUL_FALLBACK_CENTER = { lat: 37.5665, lng: 126.9780 };

// ──────────────────────────────────────────────────────────────
// Shared marker icons + helpers
// ──────────────────────────────────────────────────────────────

const postIcon = L.divIcon({
  className: "holo-post-marker",
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  html: '<div class="holo-post-glow"><div class="holo-post-dot"></div></div>',
});

/**
 * 채팅방 → 지도 진입 시 강조 표시할 "모임 장소" 핀.
 * 일반 게시글 마커(원형 글로우)와 시각적으로 확실히 구분되도록 드롭 핀 모양으로 렌더.
 * iconAnchor 를 핀 끝(아래쪽)에 맞춰 좌표 정확도 유지.
 */
const focusPinIcon = L.divIcon({
  className: "holo-focus-pin",
  iconSize: [36, 44],
  iconAnchor: [18, 42],
  html:
    '<svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><filter id="holo-focus-shadow" x="-50%" y="-30%" width="200%" height="180%">' +
    '<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#542BB4" flood-opacity="0.35"/>' +
    "</filter></defs>" +
    '<path d="M18 2C9.7 2 3 8.7 3 17c0 11 15 25 15 25s15-14 15-25C33 8.7 26.3 2 18 2z" ' +
    'fill="#7448DD" stroke="#FFFFFF" stroke-width="2" filter="url(#holo-focus-shadow)"/>' +
    '<circle cx="18" cy="17" r="6" fill="#FFFFFF"/>' +
    "</svg>",
});

/**
 * 여러 게시글 마커가 한 곳에 겹칠 때 보여줄 클러스터 아이콘.
 * 기존 단일 마커(.holo-post-marker) 와 동일한 라일락 글로우 + 보라 점 디자인,
 * 안쪽 점에 숫자를 표기한다. 개수에 따라 살짝 커진다.
 */
function buildClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  let size = 44;
  let tier: "sm" | "md" | "lg" = "sm";
  if (count >= 10) {
    size = 50;
    tier = "md";
  }
  if (count >= 30) {
    size = 56;
    tier = "lg";
  }
  return L.divIcon({
    className: "holo-post-marker holo-cluster-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html:
      '<div class="holo-post-glow holo-cluster-' +
      tier +
      '"><div class="holo-post-dot holo-cluster-dot"><span class="holo-cluster-count">' +
      count +
      "</span></div></div>",
  });
}

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

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";
const TILE_ATTR = "© OSM © CARTO";

function attachResizeNudges(
  map: L.Map,
  tiles: L.TileLayer,
  el: HTMLElement,
): () => void {
  function refreshSize() {
    map.invalidateSize();
    tiles.redraw();
    // leaflet 내부 viewport 캐시를 강제로 무효화
    map.panBy([1, 0], { animate: false });
    map.panBy([-1, 0], { animate: false });
  }
  const ro = new ResizeObserver(refreshSize);
  ro.observe(el);
  const raf1 = requestAnimationFrame(refreshSize);
  const raf2 = requestAnimationFrame(() =>
    requestAnimationFrame(refreshSize),
  );
  const timers = [50, 200, 500, 1000, 2000].map((d) =>
    setTimeout(refreshSize, d),
  );
  return () => {
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
    timers.forEach(clearTimeout);
    ro.disconnect();
  };
}

/**
 * Leaflet 의 watchPosition 래퍼인 map.locate({watch:true}) 를 사용해
 * 실시간 GPS 위치를 추적한다.
 * - 첫 fix 시 사용자 마커를 그 위치에 새로 생성 (mock 좌표를 미리 깔지 않는다)
 * - 이후 fix 마다 마커 좌표 갱신
 * - 첫 fix 시 옵션에 따라 지도 중심도 사용자 위치로 이동
 * - 권한 거부 / HTTPS 미사용 등 에러 시 마커를 표시하지 않은 채로 둔다
 */
function attachLiveUserLocation(
  map: L.Map,
  options: {
    preview: boolean;
    centerOnFix?: boolean;
    /**
     * 상위가 이미 알고 있는 마지막 GPS 좌표.
     * 주어지면 마커를 즉시 그 위치에 그려서 첫 watchPosition fix 가 들어오기 전에도
     * 사용자 위치가 보이게 한다. fix 가 들어오면 그 위치로 자연스럽게 이동.
     */
    initialPosition?: { lat: number; lng: number };
    /**
     * 첫 GPS fix 콜백 — 호출자가 직접 지도 중심 이동 여부를 결정하고 싶을 때 사용.
     * centerOnFix 와는 독립적으로 동작. (centerOnFix:false 일 때도 호출됨)
     */
    onFirstFix?: (latlng: { lat: number; lng: number }) => void;
  },
): () => void {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    if (options.initialPosition) {
      // geolocation API 미지원이지만 상위가 좌표를 줬다면 정적 마커만이라도 그린다.
      const m = L.marker(options.initialPosition, {
        icon: buildUserIcon(options.preview),
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(map);
      return () => {
        m.remove();
      };
    }
    return () => {};
  }
  let userMarker: L.Marker | null = null;
  let firstFix = true;
  if (options.initialPosition) {
    userMarker = L.marker(options.initialPosition, {
      icon: buildUserIcon(options.preview),
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
    }).addTo(map);
  }
  const onFound = (e: L.LocationEvent) => {
    if (!userMarker) {
      userMarker = L.marker(e.latlng, {
        icon: buildUserIcon(options.preview),
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      userMarker.setLatLng(e.latlng);
    }
    if (firstFix) {
      if (options.centerOnFix !== false) {
        map.setView(e.latlng, map.getZoom());
      }
      options.onFirstFix?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      firstFix = false;
    }
  };
  const onError = (e: L.ErrorEvent) => {
    // 권한 거부 / GPS 비활성 / HTTPS 미사용 등.
    // mock 좌표로 떨구지 않고 마커 없이 진행한다.
    if (typeof console !== "undefined") {
      console.warn("[map] geolocation error:", e.message);
    }
  };
  map.on("locationfound", onFound);
  map.on("locationerror", onError);
  map.locate({ watch: true, enableHighAccuracy: true, setView: false });
  return () => {
    map.stopLocate();
    map.off("locationfound", onFound);
    map.off("locationerror", onError);
    if (userMarker) {
      userMarker.remove();
      userMarker = null;
    }
  };
}

// ──────────────────────────────────────────────────────────────
// MapView — 여러 게시물 마커 + 사용자 위치 (map-screen에서 사용)
// ──────────────────────────────────────────────────────────────

type MapViewProps = {
  preview: boolean;
  visiblePosts: Post[];
  onMarkerClick?: (id: string) => void;
  /**
   * 지도 마운트 시 초기 중심 좌표. 상위에서 이미 GPS 좌표를 들고 있을 때 전달하면
   * 모달이 열린 직후 깜빡임 없이 사용자 위치 부근에서 시작한다.
   * 없으면 서울 시청을 fallback 으로 잡는다.
   */
  initialCenter?: { lat: number; lng: number };
  /** 마운트 시 초기 줌. 미지정 시 16. 직전에 사용자가 줌인/아웃 했던 값을 복원할 때 사용. */
  initialZoom?: number;
  /**
   * 사용자가 지도를 드래그/줌하여 view 가 바뀐 직후 호출.
   * 상위에서 sessionStorage 등으로 영속화하여 재진입 시 같은 view 를 복원하는 데 사용.
   */
  onViewChange?: (view: { lat: number; lng: number; zoom: number }) => void;
  /**
   * GPS fix 가 들어오면 자동으로 그 좌표로 지도 중심을 이동할지 여부. 기본 true.
   * 직전 view 를 복원해야 하는 경우(모달 재진입) 에는 false 로 전달해 자동 센터링 차단.
   */
  centerOnFix?: boolean;
  /**
   * 강조할 단일 위치(드롭 핀 + 영구 말풍선 라벨).
   * 채팅방 "장소" 핀 클릭으로 지도에 들어왔을 때 모임 장소를 명시적으로 표시할 용도.
   * 일반 게시글 마커 위에 겹쳐 그려지므로 zIndexOffset 으로 항상 최상단에 노출된다.
   */
  focusMarker?: {
    location: { lat: number; lng: number };
    label: string;
  } | null;
};

export function MapView({
  preview,
  visiblePosts,
  onMarkerClick,
  initialCenter,
  initialZoom,
  onViewChange,
  centerOnFix = true,
  focusMarker = null,
}: MapViewProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  // 초기 중심/줌/센터링 정책은 한 번 캡쳐 — useLayoutEffect 의존성에 넣지 않고
  // mount 시점 값만 사용. 부모 re-render 로 인해 지도가 통째로 리마운트되는 것 방지.
  const initialCenterRef = useRef(initialCenter);
  const initialZoomRef = useRef(initialZoom);
  const centerOnFixRef = useRef(centerOnFix);
  // onViewChange 는 매 렌더마다 새 함수가 올 수 있으므로 ref 로 묶어두고 effect 의존성에서 제외
  const onViewChangeRef = useRef(onViewChange);
  useEffect(() => {
    onViewChangeRef.current = onViewChange;
  }, [onViewChange]);

  useLayoutEffect(() => {
    if (!elRef.current || mapRef.current) return;

    // 상위에서 GPS 좌표를 넘겨줬으면 그쪽에서 시작, 아니면 서울 시청 fallback.
    const initial = initialCenterRef.current ?? SEOUL_FALLBACK_CENTER;
    const zoom = initialZoomRef.current ?? 16;

    const map = L.map(elRef.current, {
      center: [initial.lat, initial.lng],
      zoom,
      // 미리보기는 5km 반경이 한눈에 들어오도록 zoom=13 을 허용(모달은 14 유지).
      // (이전엔 minZoom:14 가 공통 적용돼 미리보기의 initialZoom=13 이 14 로 클램프됐다.)
      minZoom: preview ? 13 : 14,
      maxZoom: 18,
      // 컨트롤 UI 는 양쪽 모두 숨김 — 표준 지도 앱처럼 제스처로만 줌
      zoomControl: false,
      attributionControl: !preview,
      // 인터랙션(드래그/줌) 은 미리보기에서도 허용
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: true,
      keyboard: true,
    });

    const tiles = L.tileLayer(TILE_URL, {
      maxZoom: 19,
      subdomains: "abcd",
      attribution: TILE_ATTR,
    });
    tiles.addTo(map);

    mapRef.current = map;

    // 마커 클러스터 그룹 — 줌 인 시 자동으로 펼쳐지고, 클러스터 클릭 시
    // 자식 마커들을 보여주기 위해 확대된다.
    const clusterGroup = L.markerClusterGroup({
      iconCreateFunction: buildClusterIcon,
      showCoverageOnHover: false,
      // 미리보기에서도 드래그/줌이 가능하므로 모두 활성화
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      animate: true,
    });
    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    const cleanupNudges = attachResizeNudges(map, tiles, elRef.current);
    // 실시간 GPS 위치 추적 — fix 가 들어오면 그때 user marker 생성/이동.
    // initialPosition 이 있으면 마커가 즉시 그려지므로 모달 열자마자 위치 표시됨.
    // centerOnFix=false 인 경우 마커만 그리고 지도 중심은 사용자가 마지막에 본 위치로 유지.
    const cleanupLocate = attachLiveUserLocation(map, {
      preview,
      centerOnFix: centerOnFixRef.current ?? true,
      initialPosition: initialCenterRef.current,
    });

    // 사용자 드래그/줌이 끝날 때마다 부모에게 view 보고 → 영속화 가능
    const handleMoveEnd = () => {
      const fn = onViewChangeRef.current;
      if (!fn) return;
      const c = map.getCenter();
      fn({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    };
    map.on("moveend", handleMoveEnd);
    map.on("zoomend", handleMoveEnd);

    return () => {
      map.off("moveend", handleMoveEnd);
      map.off("zoomend", handleMoveEnd);
      cleanupNudges();
      cleanupLocate();
      clusterGroup.clearLayers();
      map.remove();
      mapRef.current = null;
      clusterGroupRef.current = null;
    };
    // centerOnFix 는 ref 로 처리하므로 deps 에 포함하지 않음 — 부모 re-render 시
    // 값이 바뀌어도 지도가 리마운트되지 않게 한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  // 게시물 마커 동기화 — clusterGroup 에 add/remove 만 하면 클러스터링은 라이브러리가 처리
  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = clusterGroupRef.current;
    if (!map || !clusterGroup) return;

    clusterGroup.clearLayers();

    const markers: L.Marker[] = [];
    visiblePosts.forEach((p) => {
      if (!p.location) return;
      // 강조 핀과 좌표가 동일한 게시글은 일반 마커를 그리지 않음 — 중복 표시 회피.
      if (
        focusMarker &&
        Math.abs(p.location.lat - focusMarker.location.lat) < 1e-6 &&
        Math.abs(p.location.lng - focusMarker.location.lng) < 1e-6
      ) {
        return;
      }
      const marker = L.marker([p.location.lat, p.location.lng], {
        icon: postIcon,
        interactive: true,
        riseOnHover: true,
      });
      if (onMarkerClick) {
        marker.on("click", () => onMarkerClick(p.id));
      }
      markers.push(marker);
    });
    if (markers.length > 0) {
      clusterGroup.addLayers(markers);
    }
  }, [visiblePosts, preview, onMarkerClick, focusMarker]);

  // 강조 핀(드롭 핀 + 영구 말풍선) — 클러스터링 대상 아님. 항상 최상단.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!focusMarker) return;
    const m = L.marker([focusMarker.location.lat, focusMarker.location.lng], {
      icon: focusPinIcon,
      interactive: false,
      keyboard: false,
      zIndexOffset: 2000,
    }).addTo(map);
    m.bindTooltip(focusMarker.label, {
      permanent: true,
      direction: "top",
      offset: [0, -38],
      className: "holo-focus-tooltip",
    });
    return () => {
      m.remove();
    };
  }, [focusMarker?.location.lat, focusMarker?.location.lng, focusMarker?.label]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={elRef} className="absolute inset-0" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// LocationMap — 단일 위치를 보여주는 지도 (게시글 상세에서 사용)
// ──────────────────────────────────────────────────────────────

type LocationMapProps = {
  location: PostLocation;
  className?: string;
  /** 사용자(나)의 현재 위치 마커도 함께 표시 */
  showUserMarker?: boolean;
  /** 인터랙션 비활성화 */
  preview?: boolean;
};

export function LocationMap({
  location,
  className,
  showUserMarker = true,
  preview = false,
}: LocationMapProps) {
  const elRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!elRef.current) return;

    const map = L.map(elRef.current, {
      center: [location.lat, location.lng],
      zoom: 17,
      minZoom: 13,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: !preview,
      dragging: !preview,
      scrollWheelZoom: !preview,
      doubleClickZoom: !preview,
      touchZoom: !preview,
      boxZoom: !preview,
      keyboard: !preview,
    });

    const tiles = L.tileLayer(TILE_URL, {
      maxZoom: 19,
      subdomains: "abcd",
      attribution: TILE_ATTR,
    });
    tiles.addTo(map);

    L.marker([location.lat, location.lng], {
      icon: postIcon,
      interactive: false,
      keyboard: false,
    }).addTo(map);

    let cleanupLocate: (() => void) | null = null;
    if (showUserMarker) {
      // mock 좌표로 미리 깔지 않고, 실제 GPS fix 가 들어오면 helper 가 마커를 만든다.
      // 게시글 상세 지도에서는 게시글 위치에 중심을 유지하므로 centerOnFix:false.
      cleanupLocate = attachLiveUserLocation(map, {
        preview: true,
        centerOnFix: false,
      });
    }

    const cleanupNudges = attachResizeNudges(map, tiles, elRef.current);

    return () => {
      cleanupNudges();
      cleanupLocate?.();
      map.remove();
    };
  }, [location.lat, location.lng, showUserMarker, preview]);

  return (
    <div
      className={
        // isolate — Leaflet 내부 pane 들이 z-index 200~700 을 쓰는데, 격리(isolation:isolate)를
        // 걸어주지 않으면 부모 stacking context 로 새어 나와 알림창(z-[1200])·드롭다운·
        // 시트 같은 상위 UI 의 z-index 와 경쟁한다. 그래서 지도 위로 모달이 안 보이는
        // 현상이 발생. isolate 로 stacking 을 가두면 외부에서는 항상 지도 컨테이너의 z-index 만 보인다.
        "relative isolate w-full overflow-hidden " + (className ?? "h-[160px]")
      }
    >
      <div
        ref={elRef}
        className="absolute inset-0"
        style={preview ? { pointerEvents: "none" } : undefined}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// LocationPicker — 클릭으로 위치를 선택하는 지도 (글쓰기 모달에서 사용)
// ──────────────────────────────────────────────────────────────

type LocationPickerProps = {
  /** 현재 선택된 위치(없으면 사용자 위치 중심) */
  value: { lat: number; lng: number } | null;
  onChange: (next: { lat: number; lng: number }) => void;
  className?: string;
  /**
   * 좌표 클릭 후 reverse geocoding 으로 얻은 장소명(상호 / 시설 / 도로명)을 받아간다.
   * 호출자가 "장소 이름" 입력란을 자동으로 채우는 데 사용.
   */
  onPlaceName?: (name: string) => void;
};

/**
 * 좌표 → 사람이 읽을 수 있는 장소명 (상호 / 시설 / 도로명).
 * OpenStreetMap Nominatim 공개 API 사용 — 무료, 키 불필요.
 * 사용 정책: 초당 1회 이하 / 캐싱 / User-Agent 명시 권장.
 *  - 브라우저는 User-Agent 를 override 할 수 없으므로 자동으로 브라우저 UA 사용.
 *  - 같은 좌표는 가까운 값으로 정규화해 캐시.
 */
/**
 * 주소/장소명 → 좌표 (forward geocoding) — Nominatim search API.
 * 한국 내 결과로 제한 (countrycodes=kr) 해서 의도치 않은 해외 매치를 막는다.
 * near 가 주어지면 그 주변을 우선 검색하도록 viewbox 로 바이어스 + 더 많은 결과를 받아
 * 클라이언트에서 거리순으로 다시 정렬한다 (사용자에게 가까운 매장이 위에 노출되게).
 */
type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
  /** near 가 주어졌을 때 채워지는 사용자 위치 ↔ 결과 거리(m). 정렬·표시에 사용. */
  distanceM?: number;
};

/** Haversine — 두 위경도 사이 직선 거리(m). */
function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function searchAddress(
  query: string,
  near?: { lat: number; lng: number },
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  try {
    // near 있으면 ~25km 반경을 viewbox 로 지정 → Nominatim 이 그 영역의 결과를 우선.
    // bounded=0 으로 두면 영역 밖 결과도 받지만 우선순위가 낮아진다.
    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=10&accept-language=ko&countrycodes=kr&addressdetails=1`;
    if (near) {
      const dLat = 0.22; // 위도 1도 ≈ 111km, 0.22 ≈ 24km
      const dLng = 0.27; // 한국 위도 37° 부근에서 경도 1도 ≈ 89km, 0.27 ≈ 24km
      const viewbox = `${near.lng - dLng},${near.lat + dLat},${near.lng + dLng},${near.lat - dLat}`;
      url += `&viewbox=${viewbox}&bounded=0`;
    }
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    const results: GeocodeResult[] = data.map((d) => ({
      lat: Number(d.lat),
      lng: Number(d.lon),
      displayName: d.display_name,
    }));
    if (near) {
      for (const r of results) {
        r.distanceM = distanceMeters(near, { lat: r.lat, lng: r.lng });
      }
      // 가까운 순으로 정렬 — 사용자 위치 기준 가장 가까운 매장이 맨 위.
      results.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
    }
    return results;
  } catch {
    return [];
  }
}

const reverseGeocodeCache = new Map<string, string>();
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (reverseGeocodeCache.has(key)) return reverseGeocodeCache.get(key) ?? null;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18&accept-language=ko`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as {
      name?: string;
      display_name?: string;
      address?: {
        amenity?: string;
        shop?: string;
        building?: string;
        office?: string;
        leisure?: string;
        tourism?: string;
        road?: string;
        neighbourhood?: string;
        suburb?: string;
      };
    };
    // 우선순위: 구체적인 상호 / 시설 → 건물 / 사무실 → 도로명 → 동네명
    const addr = data.address ?? {};
    const name =
      data.name ||
      addr.amenity ||
      addr.shop ||
      addr.tourism ||
      addr.leisure ||
      addr.building ||
      addr.office ||
      addr.road ||
      addr.neighbourhood ||
      addr.suburb ||
      null;
    if (name) reverseGeocodeCache.set(key, name);
    return name;
  } catch {
    return null;
  }
}

export function LocationPicker({ value, onChange, className, onPlaceName }: LocationPickerProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onPlaceNameRef = useRef(onPlaceName);
  onPlaceNameRef.current = onPlaceName;
  // 주소 검색 상태 — 검색어 / 검색 결과 / 로딩 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // 거리 정렬 기준점 — 실제 GPS fix 가 들어오면 그 좌표로 갱신.
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const runSearch = async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearching(true);
    setSearchOpen(true);
    const results = await searchAddress(q, userPosRef.current ?? undefined);
    setSearchResults(results);
    setSearching(false);
  };

  /** 검색 결과 선택 — 지도 중심을 결과 위치로 이동 + 마커 + 장소명 자동 채움. */
  const handlePickResult = (result: GeocodeResult) => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([result.lat, result.lng], 17, { animate: true });
    if (markerRef.current) {
      markerRef.current.setLatLng([result.lat, result.lng]);
    } else {
      markerRef.current = L.marker([result.lat, result.lng], {
        icon: postIcon,
        interactive: false,
      }).addTo(map);
    }
    onChangeRef.current({ lat: result.lat, lng: result.lng });
    // 검색 결과에서 첫 단어(가장 구체적인 명칭)를 장소명으로 채움.
    const firstSegment = result.displayName.split(",")[0]?.trim();
    if (firstSegment) onPlaceNameRef.current?.(firstSegment);
    setSearchOpen(false);
    setSearchQuery(firstSegment ?? result.displayName);
  };
  /** GPS fix 가 한 번이라도 들어왔으면 중심 자동 이동을 멈춤 (첫 fix 만 따라간다). */
  const centeredOnFixRef = useRef(false);

  useLayoutEffect(() => {
    if (!elRef.current || mapRef.current) return;

    // 초기 중심 우선순위:
    //  1) 사용자가 이미 선택한 좌표 (value)
    //  3) 서울 시청 폴백 (네트워크 이슈 / mock 데이터 미설정 시)
    // 이전엔 value 가 없을 때 무조건 서울 시청으로 떨어졌어서, 분당 사용자가
    // 위치 선택 모달을 열면 서울 도심이 떴다.
    const center = value ?? SEOUL_FALLBACK_CENTER;

    const map = L.map(elRef.current, {
      center: [center.lat, center.lng],
      zoom: 17,
      minZoom: 13,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    const tiles = L.tileLayer(TILE_URL, {
      maxZoom: 19,
      subdomains: "abcd",
      attribution: TILE_ATTR,
    });
    tiles.addTo(map);

    // 사용자 위치 마커 + 실 GPS fix 가 들어오면 첫 fix 시점에만 지도 중심도 거기로 이동.
    // 이후 패닝은 사용자에게 맡긴다 (계속 따라가면 위치 선택이 불편).
    const cleanupLocate = attachLiveUserLocation(map, {
      preview: true,
      centerOnFix: false,
      onFirstFix: (latlng) => {
        // 검색 거리 정렬 기준점도 실제 위치로 갱신
        userPosRef.current = { lat: latlng.lat, lng: latlng.lng };
        if (centeredOnFixRef.current) return;
        if (markerRef.current) return; // 사용자가 이미 위치를 찍었으면 그대로 둔다
        centeredOnFixRef.current = true;
        map.setView([latlng.lat, latlng.lng], map.getZoom(), { animate: true });
      },
    });

    if (value) {
      markerRef.current = L.marker([value.lat, value.lng], {
        icon: postIcon,
        interactive: false,
      }).addTo(map);
    }

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], {
          icon: postIcon,
          interactive: false,
        }).addTo(map);
      }
      onChangeRef.current({ lat, lng });
      // 비동기 reverse geocode — 응답이 도착하면 호출자에게 장소명을 전달.
      // 네트워크/CORS 실패 시 null 이라 별도 노출 없이 조용히 무시.
      void reverseGeocode(lat, lng).then((name) => {
        if (name) onPlaceNameRef.current?.(name);
      });
    });

    mapRef.current = map;
    const cleanupNudges = attachResizeNudges(map, tiles, elRef.current);

    return () => {
      cleanupNudges();
      cleanupLocate();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // 의도적으로 mount 시 1회만 초기화 — value 변경 시 마커 갱신은 별도 effect에서
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 외부에서 value가 바뀌면 마커 동기화
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (value) {
      if (markerRef.current) {
        markerRef.current.setLatLng([value.lat, value.lng]);
      } else {
        markerRef.current = L.marker([value.lat, value.lng], {
          icon: postIcon,
          interactive: false,
        }).addTo(map);
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [value?.lat, value?.lng]);

  return (
    <div
      className={
        // isolate — LocationMap 과 동일한 이유. Leaflet pane 의 z-index 가 상위로 새어 나가지 못하게 stacking 격리.
        "relative isolate w-full overflow-hidden " + (className ?? "h-full")
      }
    >
      <div ref={elRef} className="absolute inset-0" />

      {/* 주소/상호 검색창 — 지도 상단 가운데 떠 있음. 입력 후 엔터 또는 결과 클릭 시 해당 위치로 이동. */}
      <div className="pointer-events-none absolute left-2 right-2 top-2 z-[500]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch(searchQuery);
          }}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.12)]"
        >
          <SearchIcon />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setSearchOpen(true);
            }}
            placeholder="주소 · 장소명으로 검색"
            className="h-7 min-w-0 flex-1 bg-transparent text-[13px] text-holo-ink outline-none placeholder:text-holo-ink-4"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="검색어 지우기"
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setSearchOpen(false);
              }}
              className="shrink-0 text-holo-ink-3"
            >
              <ClearIcon />
            </button>
          )}
        </form>

        {/* 검색 결과 드롭다운 */}
        {searchOpen && (
          <div className="pointer-events-auto mt-2 max-h-[40vh] overflow-y-auto rounded-[12px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
            {searching && (
              <p className="px-4 py-3 text-[13px] text-holo-ink-3">검색 중…</p>
            )}
            {!searching && searchResults.length === 0 && (
              <p className="px-4 py-3 text-[13px] text-holo-ink-3">
                일치하는 결과가 없어요.
              </p>
            )}
            {!searching &&
              searchResults.map((r, i) => {
                const first = r.displayName.split(",")[0]?.trim() ?? r.displayName;
                const rest = r.displayName.split(",").slice(1).join(",").trim();
                const distLabel = r.distanceM != null
                  ? r.distanceM < 1000
                    ? `${Math.round(r.distanceM)}m`
                    : `${(r.distanceM / 1000).toFixed(1)}km`
                  : null;
                return (
                  <button
                    key={`${r.lat},${r.lng}-${i}`}
                    type="button"
                    onClick={() => handlePickResult(r)}
                    className="flex w-full flex-col items-start gap-0.5 border-b border-holo-line-3 px-4 py-3 text-left last:border-b-0 active:bg-holo-surface-2"
                  >
                    <div className="flex w-full items-center gap-2">
                      <span className="text-[13px] font-semibold text-holo-ink">
                        {first}
                      </span>
                      {distLabel && (
                        <span className="ml-auto shrink-0 text-[11px] font-medium text-holo-purple-mid">
                          {distLabel}
                        </span>
                      )}
                    </div>
                    {rest && (
                      <span className="text-[11px] leading-tight text-holo-ink-3">
                        {rest}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 text-holo-ink-3"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" opacity="0.15" />
      <path d="M9 9l6 6M9 15l6-6" />
    </svg>
  );
}
