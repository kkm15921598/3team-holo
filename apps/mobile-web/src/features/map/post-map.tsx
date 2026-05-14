import { useEffect, useLayoutEffect, useRef } from "react";
import L from "leaflet";
import { MY_LOCATION, type Post, type PostLocation } from "@/shared/mock/data";

// ──────────────────────────────────────────────────────────────
// Shared marker icons + helpers
// ──────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────
// MapView — 여러 게시물 마커 + 사용자 위치 (map-screen에서 사용)
// ──────────────────────────────────────────────────────────────

type MapViewProps = {
  preview: boolean;
  visiblePosts: Post[];
  onMarkerClick?: (id: string) => void;
};

export function MapView({ preview, visiblePosts, onMarkerClick }: MapViewProps) {
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

    const tiles = L.tileLayer(TILE_URL, {
      maxZoom: 19,
      subdomains: "abcd",
      attribution: TILE_ATTR,
    });
    tiles.addTo(map);

    L.marker([MY_LOCATION.lat, MY_LOCATION.lng], {
      icon: buildUserIcon(preview),
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
    }).addTo(map);

    mapRef.current = map;

    const cleanupNudges = attachResizeNudges(map, tiles, elRef.current);

    return () => {
      cleanupNudges();
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
      zoomControl: !preview,
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

    if (showUserMarker) {
      L.marker([MY_LOCATION.lat, MY_LOCATION.lng], {
        icon: buildUserIcon(true),
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(map);
    }

    const cleanupNudges = attachResizeNudges(map, tiles, elRef.current);

    return () => {
      cleanupNudges();
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

    const center = value ?? { lat: MY_LOCATION.lat, lng: MY_LOCATION.lng };

    const map = L.map(elRef.current, {
      center: [center.lat, center.lng],
      zoom: 17,
      minZoom: 13,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: false,
    });

    const tiles = L.tileLayer(TILE_URL, {
      maxZoom: 19,
      subdomains: "abcd",
      attribution: TILE_ATTR,
    });
    tiles.addTo(map);

    L.marker([MY_LOCATION.lat, MY_LOCATION.lng], {
      icon: buildUserIcon(true),
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
    }).addTo(map);

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
