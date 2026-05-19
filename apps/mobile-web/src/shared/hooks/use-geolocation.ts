import { useEffect, useState } from "react";
import { usePrivacy } from "@/shared/stores/privacy-store";

export type GeoPosition = {
  lat: number;
  lng: number;
  accuracy?: number;
};

/**
 * 브라우저 Geolocation API 를 React 친화적으로 래핑.
 * navigator.geolocation.watchPosition 으로 실시간 위치를 구독하고,
 * 권한 거부 / API 미지원 / 에러 시 null 을 유지한다.
 *
 * 추가로 "개인정보 → 위치 정보 공유" 토글을 존중한다.
 * 사용자가 위치 공유를 끈 상태면 watch 를 시작하지 않고 항상 null 을 반환한다.
 */
export function useGeolocation(): GeoPosition | null {
  const [pos, setPos] = useState<GeoPosition | null>(null);
  const { shareLocation } = usePrivacy();

  useEffect(() => {
    if (!shareLocation) {
      // 위치 공유 OFF — 이전에 쌓아둔 위치 정보도 비워서 화면에 노출되지 않도록.
      setPos(null);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPos({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        });
      },
      (err) => {
        if (typeof console !== "undefined") {
          console.warn("[geolocation] error:", err.message);
        }
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
    );
    return () => {
      navigator.geolocation.clearWatch(id);
    };
  }, [shareLocation]);

  return pos;
}

/**
 * Haversine 공식으로 두 좌표 간 직선거리(미터) 계산.
 * 지구를 완전한 구로 가정 (R = 6371km).
 */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const phi1 = (a.lat * Math.PI) / 180;
  const phi2 = (b.lat * Math.PI) / 180;
  const dphi = ((b.lat - a.lat) * Math.PI) / 180;
  const dlambda = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
