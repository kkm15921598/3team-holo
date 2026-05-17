/**
 * 위경도 → 한국식 행정 주소(시/구/동) 텍스트.
 *
 * OpenStreetMap Nominatim 공개 API 를 사용해 reverse geocoding 한다.
 * - 무료, API 키 불필요. 호출 정책: 초당 1회.
 * - mock 환경/개발 단계에서 충분한 정확도. 실제 서비스라면 카카오·네이버 API 로 교체 권장.
 *
 * 결과 문자열은 "성남시 분당구 정자동" 형식. 알 수 없는 부분은 생략.
 * 동일 좌표는 짧은 시간 동안 메모리에 캐시한다.
 */
import { useEffect, useState } from "react";

type Coord = { lat: number; lng: number };

const CACHE = new Map<string, string>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10분
const CACHE_TIMES = new Map<string, number>();

function cacheKey(lat: number, lng: number): string {
  // 약 100m 격자로 키 생성 → 미세하게 움직여도 동일 캐시 사용
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

async function reverseGeocode(coord: Coord): Promise<string> {
  const key = cacheKey(coord.lat, coord.lng);
  const at = CACHE_TIMES.get(key) ?? 0;
  if (CACHE.has(key) && Date.now() - at < CACHE_TTL_MS) {
    return CACHE.get(key) ?? "";
  }
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?format=jsonv2&lat=${coord.lat}&lon=${coord.lng}` +
    `&zoom=18&accept-language=ko`;
  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim 정책상 User-Agent 또는 Referer 필요 — 브라우저는 Referer 자동
      },
    });
    if (!res.ok) return "";
    const data = await res.json();
    const a = data?.address ?? {};
    // 한국 주소 매핑 — 응답 필드명은 행정구역마다 다름. 후보를 넓게 잡아 첫 값 채택.
    const si =
      a.city ?? a.town ?? a.county ?? a.province ?? a.state ?? "";
    const gu =
      a.borough ??
      a.city_district ??
      a.district ??
      a.municipality ??
      "";
    const dong =
      a.quarter ?? a.suburb ?? a.neighbourhood ?? a.village ?? "";
    const label = [si, gu, dong].filter(Boolean).join(" ");
    CACHE.set(key, label);
    CACHE_TIMES.set(key, Date.now());
    return label;
  } catch {
    return "";
  }
}

/**
 * 좌표가 바뀔 때마다 reverse geocode 호출 → 한글 주소 라벨을 반환.
 * 좌표 미확보 시 빈 문자열.
 */
export function useReverseGeocodedRegion(coord: Coord | null): string {
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    if (!coord) {
      setLabel("");
      return;
    }
    let aborted = false;
    reverseGeocode(coord).then((text) => {
      if (!aborted) setLabel(text);
    });
    return () => {
      aborted = true;
    };
  }, [coord?.lat, coord?.lng]);

  return label;
}
