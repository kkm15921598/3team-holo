import { useEffect, useLayoutEffect, useRef } from "react";
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
    if (firstFix && options.centerOnFix !== false) {
      map.setView(e.latlng, map.getZoom());
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
};

export function MapView({
  preview,
  visiblePosts,
  onMarkerClick,
  initialCenter,
  initialZoom,
  onViewChange,
  centerOnFix = true,
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
      minZoom: 14,
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
  }, [visiblePosts, preview, onMarkerClick]);

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
        "relative w-full overflow-hidden " + (className ?? "h-[160px]")
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
};

export function LocationPicker({ value, onChange, className }: LocationPickerProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useLayoutEffect(() => {
    if (!elRef.current || mapRef.current) return;

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

    // 글쓰기 화면 — 사용자 위치는 실제 GPS fix 가 들어오면 helper 가 마커를 만든다.
    // 지도 중심은 사용자가 선택한 좌표를 유지하므로 centerOnFix:false.
    const cleanupLocate = attachLiveUserLocation(map, { preview: true, centerOnFix: false });

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
        "relative w-full overflow-hidden " + (className ?? "h-full")
      }
    >
      <div ref={elRef} className="absolute inset-0" />
    </div>
  );
}
