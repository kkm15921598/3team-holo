/**
 * 휴대폰 번호 포맷/마스킹 공용 유틸.
 *
 * 가입·로그인 시 번호는 raw 숫자("01012341234")로 저장된다
 * (localStorage 의 holo:current-account-phone:v1 + Supabase users.phone).
 * 화면에 보여줄 때 이 유틸로 일관되게 포맷/마스킹한다.
 */
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

/** raw 숫자(또는 하이픈 포함 문자열)를 010-1234-5678 형태로 포맷 */
export function formatPhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/**
 * 가운데 자리를 가린 마스킹 포맷 (예: 010-****-1234).
 * 계정관리 목록·번호변경 화면처럼 개인정보 노출을 줄여야 하는 곳에서 사용.
 */
export function maskPhone(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 7) return digits || "-";
  const head = digits.slice(0, 3);
  const tail = digits.slice(-4);
  const middle = "*".repeat(digits.length - 7);
  return `${head}-${middle}-${tail}`;
}

/** 현재 로그인한 계정의 번호 (raw 숫자). 미로그인 시 null */
export function getCurrentPhone(): string | null {
  return getCurrentAccount();
}

/** 현재 로그인한 계정 번호의 마스킹 표시값. 없으면 "-" */
export function getCurrentPhoneMasked(): string {
  return maskPhone(getCurrentAccount());
}
