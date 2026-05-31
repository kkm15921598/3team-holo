import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/shared/hooks/use-profile";
import {
  setNickname as storeSetNickname,
  setProfileFace as storeSetProfileFace,
} from "@/shared/stores/profile-store";
import { ME_PERSONA } from "@/features/home/home-faces";
// 가입 흐름과 동일한 풀(성인+소년/소녀+노인 전부 포함) 을 사용 — 가입 때와 옵션 수가 동일해야 사용자가 같은 선택지를 본다.
import { MAN_FACES, WOMAN_FACES } from "@/features/chat/avatars";
import {
  getVerification,
  subscribeVerification,
} from "@/shared/stores/verification-store";
import { containsProfanity } from "@/shared/utils/profanity";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentPhone } from "@/shared/lib/phone";
import { TAG_GROUPS } from "@/features/signup/interest-screen";

// 가입(nickname-screen)과 동일한 닉네임 규칙 — 프로필 편집에도 같은 검증을 적용한다.
const KOREAN_ONLY = /^[가-힣\s]+$/;
const MAX_LEN = 10;
const RESERVED_NICKNAMES = ["관리자", "운영자", "테스트", "어드민", "admin", "holo", "홀로"];

/** 관심사 최대 선택 수 — 가입(interest-screen)과 동일. */
const INTEREST_MAX = 10;

/**
 * 내 관심사 로드 — 이웃찾기와 동일하게 localStorage.holoUser 의 interests + customInterest 를 합쳐 읽는다.
 */
function loadMyInterests(): string[] {
  try {
    const raw = window.localStorage.getItem("holoUser");
    if (!raw) return [];
    const p = JSON.parse(raw);
    const list = Array.isArray(p?.interests) ? (p.interests as string[]) : [];
    const custom = typeof p?.customInterest === "string" ? p.customInterest.trim() : "";
    return custom ? [...list, custom] : list;
  } catch {
    return [];
  }
}

/**
 * 내 관심사 저장 — localStorage(내 화면용) + Supabase users.interests(남이 매칭 시 보는 값) 둘 다 갱신.
 * customInterest 는 interests 배열로 합쳐 비운다(단일 출처로 단순화).
 */
function persistMyInterests(list: string[]) {
  try {
    const raw = window.localStorage.getItem("holoUser");
    const p = raw ? JSON.parse(raw) : {};
    p.interests = list;
    p.customInterest = "";
    window.localStorage.setItem("holoUser", JSON.stringify(p));
  } catch {
    // ignore
  }
  const phone = getCurrentPhone();
  if (phone) {
    // best-effort — interests 컬럼이 없는 환경(42703)에선 조용히 무시.
    void supabase
      .from("users")
      .update({ interests: list })
      .eq("phone", phone)
      .then(undefined, () => {});
  }
}

/**
 * Supabase fallback 으로 받아온 가입 관심사를 localStorage.holoUser 에 캐싱.
 * 단, 로컬에 이미 값이 있으면(마지막 편집 결과) 건드리지 않는다.
 * 다음 진입부터 서버 대기 없이 즉시 표시되도록 하는 용도.
 */
function cacheSignupInterestsIfEmpty(list: string[]) {
  try {
    const raw = window.localStorage.getItem("holoUser");
    const p = raw ? JSON.parse(raw) : {};
    const cur = Array.isArray(p?.interests) ? (p.interests as string[]) : [];
    const custom = typeof p?.customInterest === "string" ? p.customInterest.trim() : "";
    if (cur.length > 0 || custom) return; // 로컬에 이미 있으면 보존
    p.interests = list;
    p.customInterest = "";
    window.localStorage.setItem("holoUser", JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function ProfileEditScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [nickname, setNickname] = useState(profile.nickname);
  const [check, setCheck] = useState<"ok" | "fail" | null>(null);

  // 본인인증 시 판별된 성별 — 신규 가입자에겐 verification.gender 가 진실이다.
  const [verification, setVerification] = useState(getVerification);
  useEffect(() => {
    const unsub = subscribeVerification(() => setVerification(getVerification()));
    return unsub;
  }, []);

  // 캐릭터 옵션 결정 로직:
  //  1) 현재 저장된 profileFace 의 경로(/man/ vs /woman/) 가 있으면 그쪽을 기준으로 — 마이페이지에
  //     남자 얼굴이 떠 있는데 편집창에선 여자만 보이는 desync 를 막는다.
  //  2) profileFace 가 없으면 verification.gender 로 폴백 ("F" 또는 null 일 땐 FEMALE).
  //  3) 둘 다 모르면 FEMALE 기본.
  const initialFace = profile.profileFace ?? ME_PERSONA.face;
  const inferredGender: "M" | "F" = initialFace.includes("/man/")
    ? "M"
    : initialFace.includes("/woman/")
      ? "F"
      : verification.gender === "M"
        ? "M"
        : "F";
  const characterOptions = inferredGender === "M" ? MAN_FACES : WOMAN_FACES;

  const currentFaceIndex = Math.max(
    0,
    characterOptions.findIndex((f) => f === initialFace),
  );
  const [character, setCharacter] = useState(currentFaceIndex);

  // 관심사 — 진입 시 localStorage 에서 로드, 완료 시 localStorage + Supabase 에 저장.
  const [interests, setInterests] = useState<string[]>(() => loadMyInterests());
  const [customInput, setCustomInput] = useState("");
  // 관심사 선택지는 길어서 바텀시트로 분리 — 편집 화면은 선택 요약만 짧게 노출.
  const [interestSheetOpen, setInterestSheetOpen] = useState(false);

  // 가입 때 고른 관심사 연동 — 이 기기 localStorage 가 비어 있으면(다른 기기 가입·재설치·구 계정)
  // Supabase users.interests(가입 review-screen 이 저장하는 값)에서 끌어와 채운다.
  // localStorage 에 값이 있으면 그게 마지막 편집 결과이므로 덮지 않는다.
  useEffect(() => {
    const phone = getCurrentPhone();
    if (!phone) return;
    let cancelled = false;
    supabase
      .from("users")
      .select("interests")
      .eq("phone", phone)
      .single()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const remote = Array.isArray(data.interests)
          ? (data.interests as string[]).slice(0, INTEREST_MAX)
          : [];
        if (remote.length === 0) return;
        // 비어 있을 때만 채움 — 진입 후 사용자가 이미 편집했으면 유지.
        setInterests((cur) => (cur.length === 0 ? remote : cur));
        // 로컬 캐시에도 써둬서 다음 진입부터는 서버 대기 없이 즉시 표시(깜빡임 제거).
        // 로컬이 이미 있으면 건드리지 않음 — 이웃찾기와 동일 출처라 함께 이득.
        cacheSignupInterestsIfEmpty(remote);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const selectedInterests = new Set(interests);
  const toggleInterest = (tag: string) => {
    if (selectedInterests.has(tag)) {
      setInterests(interests.filter((t) => t !== tag));
    } else if (interests.length < INTEREST_MAX) {
      setInterests([...interests, tag]);
    }
  };
  const removeInterest = (tag: string) =>
    setInterests(interests.filter((t) => t !== tag));
  const addCustomInterest = () => {
    const t = customInput.trim().replace(/\s+/g, " ");
    if (!t || interests.includes(t) || interests.length >= INTEREST_MAX) {
      setCustomInput("");
      return;
    }
    setInterests([...interests, t]);
    setCustomInput("");
  };
  // 닉네임 중복확인 — 이전엔 하드코딩("감자는 감자"만 fail)이라 빈값/중복/비속어가
  // 전부 통과했다. 가입 화면과 동일하게 형식·비속어·예약어·Supabase 중복을 실제 검증한다.
  const handleCheck = async () => {
    // 천지인 결합점('·')은 조합 중간 문자라 검증 전에 제거 — 입력은 허용하지만
    // 완성형만 받는 KOREAN_ONLY 검증에서 '·'가 남아 거부되던 불일치 방지.
    const trimmed = nickname.trim().replace(/·/g, "");
    if (
      trimmed.length === 0 ||
      !KOREAN_ONLY.test(trimmed) ||
      trimmed.length > MAX_LEN ||
      containsProfanity(trimmed) ||
      RESERVED_NICKNAMES.includes(trimmed)
    ) {
      setCheck("fail");
      return;
    }
    // 내 현재 닉네임 그대로면 중복 조회 없이 통과.
    if (trimmed === profile.nickname.trim()) {
      setCheck("ok");
      return;
    }
    try {
      const { data: rows, error } = await supabase
        .from("users")
        .select("nickname")
        .eq("nickname", trimmed)
        .limit(1);
      // 네트워크 오류 시엔 가입 화면과 동일하게 통과 처리(오프라인 편집 허용).
      setCheck(error ? "ok" : rows && rows.length > 0 ? "fail" : "ok");
    } catch {
      setCheck("ok");
    }
  };

  const selectedFace = characterOptions[character] ?? characterOptions[0];

  return (
    <main className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-holo-line-3 px-4">
        <div className="flex items-center">
          <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <span className="ml-1 text-[16px] font-semibold text-holo-ink">프로필 수정</span>
        </div>
        <button
          type="button"
          onClick={() => {
            const trimmed = nickname.trim();
            const nickChanged = trimmed !== profile.nickname.trim();
            // 닉네임을 바꿨는데 중복확인을 통과하지 않았으면 저장/이탈을 막고 확인을 유도한다.
            // (이전엔 닉네임은 저장 안 되면서 얼굴만 저장되고 그대로 빠져나가 상태가 어긋났다.
            //  닉네임을 안 바꾸고 얼굴만 변경하는 흐름은 그대로 통과시킨다.)
            if (nickChanged && check !== "ok") {
              setCheck("fail");
              return;
            }
            if (check === "ok" && trimmed.length > 0) storeSetNickname(trimmed);
            // 닉네임 저장과 함께(또는 얼굴만 변경 시) 선택한 캐릭터 얼굴 저장.
            if (selectedFace) storeSetProfileFace(selectedFace);
            // 관심사 저장 — localStorage + Supabase(이웃찾기 매칭 반영).
            persistMyInterests(interests);
            navigate(-1);
          }}
          className="text-[14px] font-semibold text-holo-ink"
        >
          완료
        </button>
      </header>

      {/* Nickname — 안드로이드에서 input 의 기본 min-width 가 커서 버튼이 화면 밖으로
          밀려나는 문제가 있어, 컨테이너는 overflow-hidden, input 은 min-w-0,
          버튼은 shrink-0 로 항상 컨테이너 안에 보이도록 강제한다. */}
      <section className="px-4 py-5">
        <p className="text-[14px] font-semibold text-holo-ink">닉네임</p>
        <div className="mt-2 flex w-full items-center gap-2 overflow-hidden rounded-holo-pill border border-holo-line bg-white pl-4 pr-1">
          <input
            value={nickname}
            maxLength={10}
            onChange={(e) => {
              // 한글 스크립트 전체 + 공백 + 천지인 "·" 허용 (천지인 키보드 조합 호환).
              const filtered = e.target.value
                .replace(/[^\p{Script=Hangul}· ]/gu, "")
                .slice(0, 10);
              setNickname(filtered);
              setCheck(null);
            }}
            className="h-[44px] min-w-0 flex-1 bg-transparent text-[14px] text-holo-ink outline-none"
          />
          <button
            type="button"
            onClick={handleCheck}
            className="shrink-0 rounded-full bg-holo-purple-mid px-4 py-1.5 text-[13px] font-semibold text-white"
          >
            중복확인
          </button>
        </div>
        <p className="mt-1 text-[12px] text-holo-ink-3">한글과 공백 포함 최대 10자 / 영어, 특수문자, 비속어 불가</p>
        {check === "ok" && <p className="mt-1 text-[13px] text-holo-purple-mid">사용할 수 있는 닉네임입니다!</p>}
        {check === "fail" && <p className="mt-1 text-[13px] text-holo-error">사용할 수 없는 닉네임입니다!</p>}
      </section>

      <Divider />

      {/* Profile image */}
      <section className="px-4 py-5">
        <p className="text-[14px] font-semibold text-holo-ink">프로필 이미지</p>

        {/* 미리보기 — 선택한 캐릭터를 둥근 원으로 표시 (배경 없이 프로필 사진만) */}
        <div className="mt-4 flex justify-center">
          <img
            src={selectedFace}
            alt="선택된 캐릭터 미리보기"
            className="h-[160px] w-[160px] rounded-full object-cover"
            draggable={false}
          />
        </div>

        {/* 캐릭터 — 가로 스크롤(드래그) 가능. 선택 시 보라 ring 이 잘리지 않도록
            컨테이너에 세로 padding 을 줘 ring 공간을 확보한다. */}
        <div className="mt-6">
          <p className="text-[13px] font-semibold text-holo-ink">캐릭터</p>
          <div className="-mx-4 mt-3 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-[10px]">
              {characterOptions.map((face, i) => (
                <button
                  key={face}
                  type="button"
                  onClick={() => setCharacter(i)}
                  className={`relative h-11 w-11 shrink-0 rounded-full transition ${
                    character === i
                      ? "ring-2 ring-holo-purple-mid ring-offset-1"
                      : "opacity-80"
                  }`}
                >
                  <img
                    src={face}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

      </section>

      <Divider />

      {/* 관심사 — 가입과 동일한 칩 목록. 이웃찾기·추천 매칭에 활용된다. */}
      <section className="px-4 py-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[14px] font-semibold text-holo-ink">관심사</p>
          <span
            className={`text-[12px] tabular-nums ${
              interests.length > 0 ? "text-holo-purple-mid" : "text-holo-ink-4"
            }`}
          >
            {interests.length}/{INTEREST_MAX}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-holo-ink-3">
          이웃찾기·추천 매칭에 활용돼요. 최대 {INTEREST_MAX}개
        </p>

        {/* 선택한 관심사 요약 — 없으면 안내, 있으면 칩으로. 긴 선택지는 시트에서. */}
        {interests.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {interests.map((tag) => (
              <SelectedChip key={tag} label={tag} onRemove={() => removeInterest(tag)} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-holo-ink-4">아직 선택한 관심사가 없어요.</p>
        )}

        {/* 추가/편집 — 그룹 칩 목록은 바텀시트로 분리해 화면을 짧게 유지 */}
        <button
          type="button"
          onClick={() => setInterestSheetOpen(true)}
          className="mt-4 flex h-[44px] w-full items-center justify-center gap-1.5 rounded-holo-pill border border-holo-purple-mid/60 text-[14px] font-semibold text-holo-purple-mid active:bg-holo-lilac-card-2/40"
        >
          <PlusIcon />
          {interests.length > 0 ? "관심사 편집" : "관심사 추가"}
        </button>
      </section>

      {interestSheetOpen && (
        <InterestSheet
          interests={interests}
          selected={selectedInterests}
          customInput={customInput}
          onCustomChange={setCustomInput}
          onToggle={toggleInterest}
          onRemove={removeInterest}
          onAddCustom={addCustomInterest}
          onClose={() => {
            setCustomInput("");
            setInterestSheetOpen(false);
          }}
        />
      )}
    </main>
  );
}

/**
 * 관심사 선택 바텀시트 — 가입과 동일한 그룹 칩 + 직접 입력.
 * 선택은 부모 state 를 직접 갱신하므로 닫으면 그대로 반영된다.
 */
function InterestSheet({
  interests,
  selected,
  customInput,
  onCustomChange,
  onToggle,
  onRemove,
  onAddCustom,
  onClose,
}: {
  interests: string[];
  selected: Set<string>;
  customInput: string;
  onCustomChange: (v: string) => void;
  onToggle: (tag: string) => void;
  onRemove: (tag: string) => void;
  onAddCustom: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed left-1/2 top-0 z-[1100] flex h-[100dvh] w-full max-w-[360px] -translate-x-1/2 flex-col bg-black/40">
      <button type="button" aria-label="닫기" className="flex-1" onClick={onClose} />
      <div className="flex h-[80%] flex-col overflow-hidden rounded-t-2xl bg-white">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-holo-line px-4">
          <span className="text-[15px] font-semibold text-holo-ink">관심사 선택</span>
          <span className="text-[12px] tabular-nums text-holo-ink-3">
            {interests.length}/{INTEREST_MAX}
          </span>
        </div>

        {/* 선택 요약 */}
        {interests.length > 0 && (
          <div className="flex max-h-[92px] shrink-0 flex-wrap gap-2 overflow-y-auto border-b border-holo-line-3 px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {interests.map((tag) => (
              <SelectedChip key={tag} label={tag} onRemove={() => onRemove(tag)} />
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-4">
            {TAG_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-holo-ink-4">{group.label}</span>
                <div className="flex flex-wrap gap-2">
                  {group.items.map(({ tag }) => {
                    const on = selected.has(tag);
                    const reachedMax = !on && interests.length >= INTEREST_MAX;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => onToggle(tag)}
                        disabled={reachedMax}
                        className={`inline-flex items-center gap-1 rounded-[20px] border px-3.5 py-1.5 text-[14px] transition ${
                          on
                            ? "border-holo-purple-mid text-holo-purple-mid"
                            : reachedMax
                              ? "border-holo-line text-holo-ink-4"
                              : "border-holo-line text-holo-ink"
                        }`}
                      >
                        <span className={on ? "text-holo-purple-mid" : "text-holo-ink-4"}>
                          {on ? "✓" : "+"}
                        </span>
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* 직접 입력 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-holo-ink-4">직접 입력</span>
              <div className="flex gap-2">
                <input
                  value={customInput}
                  onChange={(e) => onCustomChange(e.target.value.slice(0, 20))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAddCustom();
                    }
                  }}
                  placeholder="관심사를 입력해 추가"
                  maxLength={20}
                  className="h-[40px] min-w-0 flex-1 rounded-[20px] border border-holo-line bg-white px-4 text-[14px] text-holo-ink outline-none placeholder:text-holo-ink-4 focus:border-holo-purple-mid"
                />
                <button
                  type="button"
                  onClick={onAddCustom}
                  disabled={!customInput.trim() || interests.length >= INTEREST_MAX}
                  className="shrink-0 rounded-full bg-holo-purple-mid px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 완료 — 시트 닫기(선택은 이미 반영됨) */}
        <div className="shrink-0 border-t border-holo-line px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-[48px] w-full rounded-holo-pill bg-holo-purple-mid text-[15px] font-semibold text-white active:opacity-90"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SelectedChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  // 액션 버튼(보라 솔리드)과 구분되도록 '태그' 톤 — 연한 라일락 배경 + 보라 글자.
  return (
    <span className="flex h-[28px] shrink-0 items-center gap-1 rounded-full bg-holo-lilac-card-2 pl-3 pr-1 text-[12px] font-medium text-holo-purple-mid">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} 제거`}
        className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-holo-purple-mid/70 transition hover:bg-holo-purple-mid/10"
      >
        <CloseIcon />
      </button>
    </span>
  );
}

function CloseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function Divider() {
  // 계정관리와 동일하게 여백 없이 붙는 회색 띠로 섹션을 나눈다.
  return <div className="h-2 w-full shrink-0 bg-holo-surface-2" />;
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
