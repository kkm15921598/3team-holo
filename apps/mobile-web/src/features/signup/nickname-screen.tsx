import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignup } from "@/shared/contexts/signup-context";
import { containsProfanity } from "@/shared/utils/profanity";
import { MAN_FACES, WOMAN_FACES } from "@/features/chat/avatars";
import { SignupLayout } from "./signup-layout";

const KOREAN_ONLY = /^[가-힣\s]+$/;
const MAX_LEN = 10;

const MOCK_TAKEN_NICKNAMES = ["관리자", "운영자", "테스트", "단무지", "어드민"];

const ADJECTIVES = [
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
];
const NOUNS = [
  "햄찌",
  "오이",
  "무지",
  "토끼",
  "강아지",
  "고양이",
  "참새",
  "다람쥐",
  "두부",
  "복숭아",
  "수박",
  "팬더",
];

function generateSuggestions(count = 4): string[] {
  const used = new Set<string>();
  let safety = 0;
  while (used.size < count && safety++ < 50) {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const candidate = `${adj} ${noun}`;
    if (
      candidate.length <= MAX_LEN &&
      !MOCK_TAKEN_NICKNAMES.includes(candidate) &&
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
  const [suggestions, setSuggestions] = useState<string[]>(() => generateSuggestions());
  const [showFacePicker, setShowFacePicker] = useState(false);

  // 주민번호로 인식된 성별에 따라 노출 가능한 프로필 이미지 풀
  const facePool = useMemo(() => {
    if (data.gender === "M") return MAN_FACES;
    if (data.gender === "F") return WOMAN_FACES;
    return [];
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

  const canCheck = isFormatValid && !isProfane && !checked;
  const canNext = checked && !!data.profileFace;

  const handleCheck = () => {
    if (!canCheck) return;
    if (MOCK_TAKEN_NICKNAMES.includes(value.trim())) {
      setTaken(true);
      setChecked(false);
    } else {
      setTaken(false);
      setChecked(true);
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
    <SignupLayout step={3}>
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
        HOLO에서 사용할
        <br />
        당신의 이름을 정해주세요!
      </h1>
      <p className="mt-2 text-[14px] text-holo-ink-3">한글 최대 10자 / 특수문자, 비속어 불가</p>

      {/* 프로필 이미지 미리보기 + 변경 */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setShowFacePicker(true)}
          disabled={!data.gender}
          className="relative h-[88px] w-[88px] overflow-hidden rounded-full border-2 border-holo-line bg-holo-surface-2 disabled:opacity-50"
          aria-label="프로필 이미지 선택"
        >
          {data.profileFace ? (
            <img src={data.profileFace} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[24px] text-holo-ink-3">
              ?
            </span>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-holo-purple-mid text-white shadow">
            <CameraIcon />
          </span>
        </button>
        <p className="text-[12px] text-holo-ink-3">
          {data.gender
            ? "프로필 이미지를 선택해 주세요"
            : "주민번호를 먼저 입력해 주세요"}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-1">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="닉네임을 입력해 주세요"
              value={value}
              onChange={(e) => update("nickname", e.target.value.slice(0, MAX_LEN + 1))}
              maxLength={MAX_LEN + 1}
              className={`h-[62px] w-full rounded-holo-input border px-5 pr-16 text-[15px] outline-none placeholder:text-holo-ink-4 ${inputBorder}`}
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
            className={`h-[62px] shrink-0 rounded-holo-input px-4 text-[14px] font-semibold transition ${
              checked
                ? "bg-holo-purple-mid text-white"
                : canCheck
                  ? "bg-holo-ink text-white active:scale-[0.98]"
                  : "bg-holo-ink-4 text-white"
            }`}
          >
            {checked ? "확인 완료" : "중복확인"}
          </button>
        </div>

        {errorMessage && (
          <p className="pl-2 text-[13px] text-holo-error">{errorMessage}</p>
        )}
        {checked && !errorMessage && (
          <p className="pl-2 text-[13px] text-holo-purple-mid">사용 가능한 닉네임이에요.</p>
        )}
      </div>

      {value.length === 0 && (
        <div className="mt-5 flex flex-col gap-2">
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
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => update("nickname", s)}
                className="truncate rounded-full border border-holo-line bg-white px-4 py-1.5 text-center text-[13px] text-holo-ink transition hover:border-holo-purple-mid hover:text-holo-purple-mid"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-col items-center gap-3 pt-6">
        <p className="text-[12px] text-holo-ink-3">나중에 다시 수정할 수 있어요!</p>
        <button
          type="button"
          onClick={() => canNext && navigate("/signup/interest")}
          disabled={!canNext}
          className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
            canNext ? "bg-holo-ink" : "bg-holo-ink-4"
          }`}
        >
          다음
        </button>
      </div>

      {showFacePicker && data.gender && (
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
        <div className="max-h-[60vh] overflow-y-auto">
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

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
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
