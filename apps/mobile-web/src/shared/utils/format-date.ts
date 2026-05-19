/**
 * 앱 전반의 날짜 표시 포맷을 통일하기 위한 헬퍼.
 *
 * 입력으로 다음을 받을 수 있다:
 *   - "yy.m.d"  → "26.4.2"
 *   - "yy.mm.dd" → "26.04.02"
 *   - "yyyy.m.d" / "yyyy.mm.dd" → "2026.4.2", "2026.04.02"
 *   - "yyyy-mm-dd" 또는 "yyyy/mm/dd"
 *   - Date 객체
 *
 * 출력은 항상 "yy.mm.dd" (2-digit year + zero-padded month/day).
 *
 * 잘못된 입력이면 원본을 그대로 반환해 화면이 빈 칸으로 비지 않게 한다.
 */
export function formatYyMmDd(input: string | Date | undefined | null): string {
  if (input === undefined || input === null || input === "") return "";

  // Date 객체 처리
  if (input instanceof Date) {
    const y = String(input.getFullYear()).slice(-2);
    const m = String(input.getMonth() + 1).padStart(2, "0");
    const d = String(input.getDate()).padStart(2, "0");
    return `${y}.${m}.${d}`;
  }

  // 문자열 처리 — 구분자 . - / 모두 지원
  const parts = input.split(/[.\-/]/).map((p) => p.trim());
  if (parts.length !== 3) return input;
  const [rawY, rawM, rawD] = parts;
  // 4자리 연도면 뒤 2자리만 사용. 2자리면 그대로 패딩.
  const y =
    rawY.length === 4 ? rawY.slice(2) : rawY.padStart(2, "0");
  const m = rawM.padStart(2, "0");
  const d = rawD.padStart(2, "0");
  return `${y}.${m}.${d}`;
}
