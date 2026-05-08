/**
 * 비속어/금칙어 필터 (모의 구현).
 *
 * 닉네임, 게시글 제목, 댓글 등 사용자 입력 텍스트의 1차 필터링용.
 * 백엔드 연결 시 서버 측 필터로 보강하고 이 함수는 즉각 피드백 용도로 유지하면 됩니다.
 *
 * 정책:
 * - 입력값을 lowercase + 공백 제거(이모지/특수기호 사이에 공백 우회 방지)로 정규화
 * - 차단어가 substring으로 포함되면 true 반환
 * - 한글 자음 단축형(ㅅㅂ 등)도 일부 포함
 *
 * 한계:
 * - 자모 분리 변형이나 한자 우회까지는 막지 못함 (서버 측 필터에서 보완)
 * - 단어 경계를 보지 않으므로 정상 단어에 우연히 포함된 경우도 차단될 수 있음
 *   (예: 평범한 합성어가 짧은 비속어를 substring으로 포함하는 경우). 이 한계는
 *   목록을 짧은 단어 위주가 아니라 "충분히 식별 가능한" 단어 위주로 유지해서 줄임.
 */

const BANNED_WORDS = [
  // 한국어 비속어 (대표적인 것 위주)
  "씨발",
  "시발",
  "ㅅㅂ",
  "ㅆㅂ",
  "병신",
  "ㅂㅅ",
  "개새끼",
  "개색기",
  "ㄱㅅㄲ",
  "좆",
  "좃",
  "지랄",
  "꺼져",
  // 영어 비속어
  "fuck",
  "shit",
  "asshole",
  "bitch",
  // 차별/혐오 표현
  "한남",
  "한녀",
  "맘충",
  "급식충",
];

function normalize(input: string): string {
  return input.replace(/\s+/g, "").toLowerCase();
}

/**
 * 입력값이 비속어/차단어를 포함하는지 검사합니다.
 */
export function containsProfanity(input: string): boolean {
  if (!input) return false;
  const normalized = normalize(input);
  return BANNED_WORDS.some((w) => normalized.includes(w.toLowerCase()));
}
