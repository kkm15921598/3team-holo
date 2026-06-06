import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignup } from "@/shared/contexts/signup-context";
import { containsProfanity } from "@/shared/utils/profanity";
import { MAN_FACES, WOMAN_FACES } from "@/features/chat/avatars";
import { SignupLayout } from "./signup-layout";
import { supabase } from "@/shared/lib/supabaseClient";

const KOREAN_ONLY = /^[가-힣\s]+$/;
const MAX_LEN = 10;

/** 서비스 예약어 — Supabase 조회 전에 클라이언트에서 먼저 차단 */
const RESERVED_NICKNAMES = ["관리자", "운영자", "테스트", "어드민", "admin", "holo", "홀로"];

// 일반 형용사 — 모든 명사 카테고리와 조합 가능
const GENERAL_ADJECTIVES = [
  // 성격·기분
  "행복한",
  "용감한",
  "빛나는",
  "따뜻한",
  "노래하는",
  "춤추는",
  "씩씩한",
  "다정한",
  "귀여운",
  "발랄한",
  "포근한",
  "재밌는",
  "사랑스러운",
  "정겨운",
  "신나는",
  // 분위기·감각
  "반짝이는",
  "산뜻한",
  "보송보송한",
  "몽글몽글한",
  "두근거리는",
  // 취미·행동
  "책읽는",
  "그림그리는",
  "산책하는",
  "글쓰는",
  "사진찍는",
];
// 맛·식감 형용사 — 음식·음료 명사에만 사용. 동물·자연·꽃·계절·색깔·악기·판타지 앞에는 어색하므로 제외.
const FOOD_ADJECTIVES = [
  "달콤한",
  "고소한",
  "새콤한",
  "매콤한",
  "바삭한",
  "쫄깃한",
  "촉촉한",
];

// 동물 명사 — "맛·식감" 형용사와는 조합하지 않음
const ANIMAL_NOUNS = [
  "햄찌",
  "토끼",
  "강아지",
  "고양이",
  "참새",
  "다람쥐",
  "팬더",
  "곰",
  "펭귄",
  "사슴",
  "거북이",
  "너구리",
  "코알라",
  "캥거루",
  "알파카",
  "부엉이",
  "여우",
  "늑대",
  "양",
  "햄스터",
  "수달",
  "고래",
  "돌고래",
  "고슴도치",
];
// 자연·날씨 명사 — 잔잔하고 예쁜 분위기. "맛·식감" 형용사는 제외.
const NATURE_NOUNS = [
  "별",
  "달",
  "햇살",
  "무지개",
  "구름",
  "노을",
  "바람",
  "별빛",
  "달빛",
  "이슬",
  "단풍",
  "물결",
];
// 꽃 명사 — 부드러운 톤. "맛·식감" 형용사는 제외.
const FLOWER_NOUNS = [
  "장미",
  "튤립",
  "해바라기",
  "백합",
  "민들레",
  "벚꽃",
  "코스모스",
  "수국",
  "라일락",
];
// 계절·시간 명사
const SEASON_NOUNS = [
  "봄",
  "여름",
  "가을",
  "겨울",
  "새벽",
  "한낮",
  "한밤",
];
// 색깔 명사 — "행복한 분홍", "포근한 하늘" 처럼 자연스럽게 조합됨
const COLOR_NOUNS = [
  "분홍",
  "노랑",
  "파랑",
  "보라",
  "초록",
  "하늘",
];
// 악기 명사
const INSTRUMENT_NOUNS = [
  "피아노",
  "기타",
  "바이올린",
  "드럼",
  "우쿨렐레",
  "하프",
];
// 판타지·캐릭터 명사
const FANTASY_NOUNS = [
  "요정",
  "천사",
  "마법사",
  "유니콘",
  "별똥별",
];
// 음식 명사 (과일·채소·디저트·분식·음료 등) — 모든 형용사와 조합 가능
const FOOD_NOUNS = [
  // 과일 / 채소
  "오이",
  "복숭아",
  "수박",
  "딸기",
  "망고",
  "바나나",
  "토마토",
  "당근",
  "감자",
  "고구마",
  "파인애플",
  // 디저트 / 분식 / 빵
  "두부",
  "무지",
  "단무지",
  "김밥",
  "떡볶이",
  "만두",
  "라면",
  "김치",
  "도넛",
  "케이크",
  "마카롱",
  "푸딩",
  "젤리",
  "쿠키",
  "호빵",
  "호떡",
  "와플",
  "붕어빵",
  "사탕",
  "초콜릿",
  // 음료
  "라떼",
  "코코아",
  "모카",
  "우유",
  "에이드",
  "주스",
];

const NOUNS = [
  ...ANIMAL_NOUNS,
  ...NATURE_NOUNS,
  ...FLOWER_NOUNS,
  ...SEASON_NOUNS,
  ...COLOR_NOUNS,
  ...INSTRUMENT_NOUNS,
  ...FANTASY_NOUNS,
  ...FOOD_NOUNS,
];
// "맛·식감" 형용사가 어색한 카테고리 — 동물·자연·꽃·계절·색깔·악기·판타지
const NON_FOOD_NOUN_SET = new Set([
  ...ANIMAL_NOUNS,
  ...NATURE_NOUNS,
  ...FLOWER_NOUNS,
  ...SEASON_NOUNS,
  ...COLOR_NOUNS,
  ...INSTRUMENT_NOUNS,
  ...FANTASY_NOUNS,
]);

function generateSuggestions(count = 4): string[] {
  const used = new Set<string>();
  let safety = 0;
  while (used.size < count && safety++ < 50) {
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    // 동물·자연·꽃 앞에는 맛·식감 형용사를 쓰지 않는다.
    const adjPool = NON_FOOD_NOUN_SET.has(noun)
      ? GENERAL_ADJECTIVES
      : [...GENERAL_ADJECTIVES, ...FOOD_ADJECTIVES];
    const adj = adjPool[Math.floor(Math.random() * adjPool.length)];
    const candidate = `${adj} ${noun}`;
    if (
      candidate.length <= MAX_LEN &&
      !RESERVED_NICKNAMES.includes(candidate) &&
      !containsProfanity(candidate)
    ) {
      used.add(candidate);
    }
  }
  return Array.from(used);
}

export function NicknameScreen() {
  const navigate = useNavigate();
  const { data, update } = useSignup();
  const value = data.nickname;

  const [checked, setChecked] = useState(false);
  const [taken, setTaken] = useState(false);
  const [checking, setChecking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(() => generateSuggestions());
  const [showFacePicker, setShowFacePicker] = useState(false);
  // 다음 버튼을 눌렀을 때 빠진 항목을 필드처럼 안내하는 문구(알림창 대신 인라인).
  const [nextHint, setNextHint] = useState<string | null>(null);

  // 주민번호로 인식된 성별에 따라 노출 가능한 프로필 이미지 풀.
  // 성별을 못 잡은 케이스(모바일에서 주민번호 흐름이 어긋난 경우 등)에서도
  // 사용자가 캐릭터를 고를 수 있도록, gender 가 null 이면 남녀 전체를 보여준다.
  const facePool = useMemo(() => {
    if (data.gender === "M") return MAN_FACES;
    if (data.gender === "F") return WOMAN_FACES;
    return [...MAN_FACES, ...WOMAN_FACES];
  }, [data.gender]);

  // 성별과 다른 이미지가 이미 들어있으면 초기화 (예: 가입 중에 주민번호를 수정한 경우)
  useEffect(() => {
    if (data.profileFace && !facePool.includes(data.profileFace)) {
      update("profileFace", null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.gender]);

  const isFormatInvalid =
    value.length > 0 && (!KOREAN_ONLY.test(value) || value.length > MAX_LEN);
  const isFormatValid = value.length > 0 && !isFormatInvalid;
  const isProfane = isFormatValid && containsProfanity(value);

  useEffect(() => {
    if (checked || taken) {
      setChecked(false);
      setTaken(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const canCheck = isFormatValid && !isProfane && !checked && !checking;
  const canNext = checked && !!data.profileFace;

  const handleCheck = async () => {
    if (!canCheck) return;
    const trimmed = value.trim();

    // 1) 예약어 클라이언트 차단
    if (RESERVED_NICKNAMES.some((r) => r === trimmed)) {
      setTaken(true);
      setChecked(false);
      return;
    }

    // 2) Supabase에서 실제 중복 여부 조회
    setChecking(true);
    try {
      const { data: rows, error } = await supabase
        .from("users")
        .select("nickname")
        .eq("nickname", trimmed)
        .limit(1);

      if (error) {
        // 네트워크 오류 등 — 일단 통과시키고 가입 단계에서 재확인
        console.warn("닉네임 중복 확인 실패:", error.message);
        setTaken(false);
        setChecked(true);
      } else if (rows && rows.length > 0) {
        setTaken(true);
        setChecked(false);
      } else {
        setTaken(false);
        setChecked(true);
      }
    } finally {
      setChecking(false);
    }
  };

  const errorMessage = isFormatInvalid
    ? "닉네임을 다시 확인해 주세요."
    : isProfane
      ? "사용할 수 없는 단어가 포함되어 있어요."
      : taken
        ? "이미 사용 중인 닉네임이에요."
        : null;

  const inputBorder =
    isFormatInvalid || isProfane || taken
      ? "border-2 border-holo-error text-holo-error"
      : checked
        ? "border-2 border-holo-purple-mid text-holo-purple-mid"
        : "border-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid";

  return (
    <SignupLayout step={4}>
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
        HOLO에서 사용할
        <br />
        당신의 이름을 정해주세요!
      </h1>
      <p className="mt-2 text-[14px] text-holo-ink-3">한글과 공백 포함 최대 10자 / 영어, 특수문자, 비속어 불가</p>

      {/* 프로필 이미지 미리보기 + 변경 */}
      <div className="mt-6 flex flex-col items-center gap-2">
        {/* 프로필 원형 + 설정 아이콘 오버레이 */}
        <div className="relative h-[88px] w-[88px]">
          <div className="h-full w-full overflow-hidden rounded-full border-2 border-holo-line bg-holo-surface-2">
            {data.profileFace ? (
              <img src={data.profileFace} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[32px] text-holo-ink-4">?</span>
            )}
          </div>
          {/* 설정 아이콘 — 프로필 원 우하단에 겹침. 성별 미인식 케이스에서도
              사용자가 캐릭터를 고를 수 있도록 항상 활성화. */}
          <button
            type="button"
            onClick={() => setShowFacePicker(true)}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-holo-purple-mid text-white shadow transition hover:bg-holo-purple active:scale-95"
            aria-label="프로필 이미지 선택"
          >
            <SettingsIcon />
          </button>
        </div>
        {/* 안내 문구 */}
        <p className="text-[12px] text-holo-ink-3">프로필 이미지를 선택해 주세요</p>
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="닉네임을 입력해 주세요"
              value={value}
              onChange={(e) => update("nickname", e.target.value.slice(0, MAX_LEN + 1))}
              maxLength={MAX_LEN + 1}
              className={`h-[52px] w-full rounded-holo-input border px-5 pr-16 text-[15px] outline-none placeholder:text-holo-ink-4 ${inputBorder}`}
            />
            <span
              className={`pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[12px] tabular-nums ${
                isFormatInvalid || isProfane ? "text-holo-error" : "text-holo-ink-4"
              }`}
            >
              {value.length}/{MAX_LEN}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCheck}
            disabled={!canCheck}
            className={`h-[52px] shrink-0 rounded-holo-input px-4 text-[14px] font-semibold transition ${
              checked
                ? "bg-holo-purple-mid text-white"
                : canCheck
                  ? "bg-holo-ink text-white active:scale-[0.98]"
                  : "bg-holo-ink-4 text-white"
            }`}
          >
            {checking ? "확인 중…" : checked ? "확인 완료" : "중복확인"}
          </button>
        </div>

        {errorMessage && (
          <p className="pl-2 text-[13px] text-holo-error">{errorMessage}</p>
        )}
        {checked && !errorMessage && (
          <p className="pl-2 text-[13px] text-holo-purple-mid">사용 가능한 닉네임이에요.</p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-holo-ink-3">이런 이름은 어때요?</span>
            <button
              type="button"
              onClick={() => setSuggestions(generateSuggestions())}
              className="flex items-center gap-1 text-[12px] text-holo-ink-3 hover:text-holo-ink"
            >
              <RefreshIcon />
              다시 추천
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => update("nickname", s)}
                className="rounded-full border border-holo-line bg-white px-4 py-1.5 text-[13px] text-holo-ink transition hover:border-holo-purple-mid hover:text-holo-purple-mid"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

      <div className="mt-auto flex flex-col items-center gap-3 pt-6">
        <p className="text-[12px] text-holo-ink-3">나중에 다시 수정할 수 있어요!</p>
        {/* 비활성 상태에서 눌렀을 때 빠진 항목 안내 — 알림창 대신 버튼 위 인라인 문구. */}
        {nextHint && !canNext && (
          <p className="text-[13px] font-medium text-holo-error">{nextHint}</p>
        )}
        <button
          type="button"
          onClick={() => {
            // 비활성 상태여도 클릭은 받아 빠진 항목을 안내한다(첫 미충족 항목 우선).
            if (!data.profileFace) {
              setNextHint("프로필 사진을 선택해 주세요.");
              return;
            }
            if (!checked) {
              setNextHint(
                isFormatValid ? "닉네임 중복확인을 해주세요." : "닉네임을 입력해 주세요.",
              );
              return;
            }
            setNextHint(null);
            navigate("/signup/interest");
          }}
          className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
            canNext ? "bg-holo-ink" : "bg-holo-ink-4"
          }`}
        >
          다음
        </button>
      </div>

      {showFacePicker && (
        <FacePickerSheet
          faces={facePool}
          selected={data.profileFace}
          onSelect={(face) => {
            update("profileFace", face);
            setShowFacePicker(false);
          }}
          onClose={() => setShowFacePicker(false)}
        />
      )}
    </SignupLayout>
  );
}

function FacePickerSheet({
  faces,
  selected,
  onSelect,
  onClose,
}: {
  faces: string[];
  selected: string | null;
  onSelect: (face: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-t-[18px] bg-white p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-holo-line" />
        <p className="mb-3 text-center text-[15px] font-semibold text-holo-ink">
          프로필 이미지 선택
        </p>
        <div className="no-scrollbar max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <div className="grid grid-cols-4 gap-3">
            {faces.map((src) => {
              const on = selected === src;
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => onSelect(src)}
                  className={`relative aspect-square overflow-hidden rounded-full border-2 ${
                    on ? "border-holo-purple-mid" : "border-transparent"
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}
