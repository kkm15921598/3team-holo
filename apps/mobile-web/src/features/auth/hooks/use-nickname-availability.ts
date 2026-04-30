import { useEffect, useState } from "react";

export type AvailabilityStatus =
  | "idle"
  | "too_short"
  | "too_long"
  | "checking"
  | "available"
  | "taken";

const RESERVED = new Set([
  "admin",
  "administrator",
  "holo",
  "관리자",
  "운영자",
  "test",
  "테스트",
  "지영",
  "민수",
]);

const MIN = 2;
const MAX = 12;
const DEBOUNCE_MS = 400;
const FAKE_LATENCY_MS = 350;

export function useNicknameAvailability(nickname: string): AvailabilityStatus {
  const [status, setStatus] = useState<AvailabilityStatus>("idle");

  useEffect(() => {
    const trimmed = nickname.trim();

    if (trimmed.length === 0) {
      setStatus("idle");
      return;
    }
    if (trimmed.length < MIN) {
      setStatus("too_short");
      return;
    }
    if (trimmed.length > MAX) {
      setStatus("too_long");
      return;
    }

    setStatus("checking");
    const id = setTimeout(() => {
      setStatus(RESERVED.has(trimmed.toLowerCase()) ? "taken" : "available");
    }, DEBOUNCE_MS + FAKE_LATENCY_MS);

    return () => clearTimeout(id);
  }, [nickname]);

  return status;
}
