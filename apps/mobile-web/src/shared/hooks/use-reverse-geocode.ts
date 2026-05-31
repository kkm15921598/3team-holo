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

type NominatimResponse = {
  address?: Record<string, string>;
  display_name?: string;
};

/**
 * 단일 zoom 으로 Nominatim 리버스 지오코드 호출.
 * 한국에서 zoom 별 응답 디테일:
 *   - zoom=18 : 건물·도로 단위 (mobile GPS 정밀 좌표). neighbourhood 빠질 수 있음.
 *   - zoom=14 : 동(neighbourhood) 단위. 행정동 정보가 안정적으로 채워짐.
 *   - zoom=12 : 구·시 단위.
 */
async function fetchAt(coord: Coord, zoom: number): Promise<NominatimResponse | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=jsonv2&lat=${coord.lat}&lon=${coord.lng}` +
      `&zoom=${zoom}&addressdetails=1&accept-language=ko`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as NominatimResponse;
  } catch {
    return null;
  }
}

export async function reverseGeocode(coord: Coord): Promise<string> {
  const key = cacheKey(coord.lat, coord.lng);
  const at = CACHE_TIMES.get(key) ?? 0;
  if (CACHE.has(key) && Date.now() - at < CACHE_TTL_MS) {
    return CACHE.get(key) ?? "";
  }
  try {
    // 두 번 호출해 결과 병합:
    //  - zoom=18: 정확한 좌표 기반 응답 (mobile GPS 의 도로/건물 정보).
    //  - zoom=14: 동(neighbourhood) 단위 응답. 핸드폰처럼 좌표가 건물에 떨어져
    //             zoom=18 응답에 동 정보가 빠지는 케이스를 보완.
    const [d18, d14] = await Promise.all([fetchAt(coord, 18), fetchAt(coord, 14)]);
    if (!d18 && !d14) return "";
    // 동·구 정보는 zoom=14 응답을 우선 채택 (행정동까지 안정적).
    // 시·도 정보도 마찬가지로 zoom=14 우선.
    const a: Record<string, string> = {
      ...(d18?.address ?? {}),
      ...(d14?.address ?? {}),
    };
    // display_name 도 두 응답을 모두 활용 — 어느 한 쪽에라도 동이 들어있을 수 있음.
    const displayName: string =
      [d14?.display_name ?? "", d18?.display_name ?? ""].filter(Boolean).join(", ");
    // 한국 행정구역 추출 — 시/군 → 구 → 읍/면 → 동·리.
    // OSM 의 한국 데이터는 필드명이 들쭉날쭉해서 후보를 넓게 잡고 첫 매칭 채택.
    //
    //  ※ "도"(경기도 / 충청북도 / 전라남도 등) 는 일부러 제외 — 너무 길어지고
    //     일반 주소 표기에서도 도는 잘 안 붙는다. 단 "서울특별시 / 부산광역시"
    //     같은 광역시는 시·군이 따로 없을 수 있어 그 경우엔 fallback 으로 사용.
    const stateLevel: string = a.state ?? a.province ?? ""; // 경기도 / 서울특별시 등
    const isDo = /도$/.test(stateLevel); // "OO도" 형태면 일반 도 → 제외
    //  1) 시·군 — 일반 시("성남시"), 군 지역("안성군").
    let cityOrCounty: string =
      a.city ?? a.county ?? a.town ?? a.municipality ?? "";
    // 광역시인데 city 필드가 비어 있으면 광역시 이름을 시 자리에 사용.
    if (!cityOrCounty && !isDo && stateLevel) cityOrCounty = stateLevel;
    //  2) 일반 구 — "분당구" 같은 자치구.
    const district: string =
      a.borough ?? a.city_district ?? a.district ?? "";
    //  3) 읍·면 — OSM 에서 면이 city_district 으로 잡히기도 하지만, 그 자리에
    //     이미 자치구가 들어갈 수 있어 별도 후보(suburb/quarter)로 본다.
    let township: string = "";
    //  4) 동·리·마을 — 가장 좁은 단위.
    //  핸드폰의 정밀 GPS 는 도로/건물 위에 정확히 떨어져 neighbourhood/suburb
    //  필드가 비는 경우가 잦다. 그래서 display_name 도 함께 파싱한다.
    let neighbourhood: string =
      a.quarter ?? a.suburb ?? a.neighbourhood ?? a.village ?? a.hamlet ?? "";
    // 1차 폴백: display_name 토큰들 중 "OO동" / "OO리" / "OO읍" / "OO면" 으로 끝나는 첫 항목.
    //  예: "성남시 분당구 동원동, 경기도, 대한민국" → 동원동 추출
    if (!neighbourhood && displayName) {
      const tokens = displayName.split(",").map((t) => t.trim());
      for (const t of tokens) {
        if (/[동리읍면]$/.test(t) && t !== district && t !== cityOrCounty) {
          neighbourhood = t;
          break;
        }
      }
    }
    // suburb 이 "OO면" 형태면 동·리가 아니라 township 으로 분류.
    if (/[읍면]$/.test(neighbourhood)) {
      township = neighbourhood;
    }
    const dong = township ? "" : neighbourhood;
    // 중복 제거 + 빈 문자열 제거.
    const parts = [cityOrCounty, district, township, dong];
    const seen = new Set<string>();
    const label = parts
      .filter((p) => {
        if (!p) return false;
        if (seen.has(p)) return false;
        seen.add(p);
        return true;
      })
      .join(" ");
    // 비어있는 결과는 캐싱하지 않음 — 다음 호출에서 재시도할 수 있도록.
    if (label) {
      CACHE.set(key, label);
      CACHE_TIMES.set(key, Date.now());
    }
    return label;
  } catch {
    return "";
  }
}

const DETAIL_CACHE = new Map<string, string>();
const DETAIL_TIMES = new Map<string, number>();

/**
 * 위경도 → 상세 주소 (시/구/동 + 도로명/건물/번지까지).
 *
 * reverseGeocode 는 "시 구 동" 행정 단위만 반환하지만, 위치 공유에서는
 * 사용자가 어디인지 바로 알 수 있게 도로명/건물명까지 보여주는 편이 좋다.
 * zoom=18 응답의 road/house_number/building 을 행정 라벨 뒤에 붙인다.
 */
export async function reverseGeocodeDetailed(coord: Coord): Promise<string> {
  const key = cacheKey(coord.lat, coord.lng);
  const at = DETAIL_TIMES.get(key) ?? 0;
  if (DETAIL_CACHE.has(key) && Date.now() - at < CACHE_TTL_MS) {
    return DETAIL_CACHE.get(key) ?? "";
  }
  try {
    // 행정 라벨(시/구/동)은 기존 함수 재사용 — 동까지 안정적으로 채워진다.
    const [region, d18] = await Promise.all([
      reverseGeocode(coord),
      fetchAt(coord, 18),
    ]);
    const a: Record<string, string> = d18?.address ?? {};
    // 도로명 + 번지(있으면) + 건물명 — 중복 없이 이어붙임.
    const road = a.road ?? a.pedestrian ?? a.footway ?? "";
    const houseNo = a.house_number ?? "";
    const building =
      a.building ?? a.amenity ?? a.shop ?? a.office ?? a.tourism ?? "";
    const detailParts: string[] = [];
    if (road) detailParts.push(houseNo ? `${road} ${houseNo}` : road);
    if (building && building !== road) detailParts.push(building);
    const detail = detailParts.join(" ");
    // 행정 라벨 + 상세. 행정 라벨이 비면 display_name 으로 폴백.
    const label =
      [region, detail].filter(Boolean).join(" ") ||
      (d18?.display_name ?? "").split(",").slice(0, 3).join(" ").trim();
    if (label) {
      DETAIL_CACHE.set(key, label);
      DETAIL_TIMES.set(key, Date.now());
    }
    return label;
  } catch {
    return "";
  }
}

/**
 * 좌표가 바뀔 때마다 reverse geocode 호출 → 한글 주소 라벨을 반환.
 *
 * ── "잠깐 보였다 사라짐" 버그 방지 ─────────────────────────────────
 * GPS 가 미세하게 좌표를 갱신할 때마다 Nominatim 을 재호출하는데, 응답 데이터의
 * 정확도가 좌표에 따라 다르다 (도로/건물에 떨어지면 neighbourhood 가 빠지는 경우).
 * 그래서 이전엔 "성남시 분당구 동원동" → "성남시 분당구" 처럼 더 짧은 결과가
 * 좋은 결과를 덮어쓰는 깜빡임이 발생했다.
 *
 * 정책: **빈 라벨로는 절대 덮어쓰지 않음**. 빈 결과가 와도 이전 라벨을 유지.
 * 좌표가 null 이 되어도 이전 라벨을 유지해 GPS 신호 끊김에 강건하게.
 */
export function useReverseGeocodedRegion(coord: Coord | null): string {
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    if (!coord) return; // 좌표 사라져도 기존 라벨 유지
    let aborted = false;
    reverseGeocode(coord).then((text) => {
      if (aborted) return;
      // 빈 결과면 이전 라벨 유지. 의미 있는 결과만 반영.
      if (text) setLabel(text);
    });
    return () => {
      aborted = true;
    };
  }, [coord?.lat, coord?.lng]);

  return label;
}
