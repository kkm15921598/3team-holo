import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PasswordToggle } from "@/shared/components/password-toggle";
import { CapsLockBadge } from "@/shared/components/caps-lock-badge";
import { useCapsLock } from "@/shared/hooks/use-caps-lock";
import { setGender } from "@/shared/stores/verification-store";
import {
  setProfileFace,
  setNickname,
  setTitle,
  setEquippedBadgeId,
} from "@/shared/stores/profile-store";
import { defaultFaceForGender } from "@/features/home/home-faces";
import { setCurrentAccount, clearCurrentAccount } from "@/shared/stores/account-choices-store";
import { resetUserStoresForLogin } from "@/shared/lib/fresh-signup-reset";
import { syncAllUserDataFromSupabase } from "@/shared/lib/sync-all-user-data";
import { supabase } from "@/shared/lib/supabaseClient";

const PHONE_PATTERN = /^01[0-9]{8,9}$/;
const formatPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

export function LoginScreen() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [phoneError, setPhoneError] = useState(false);
  const [phoneErrorMessage, setPhoneErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  // 로그인 진행 중 — 버튼 비활성화 + 중복 제출 방지(느린 네트워크에서 연타 시 중복 요청)
  const [submitting, setSubmitting] = useState(false);

  const { capsOn, capsHandlers } = useCapsLock();

  const clearErrors = () => {
    setPhoneError(false);
    setPhoneErrorMessage("");
    setPasswordError(false);
    setPasswordErrorMessage("");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setPhone(digits);
    clearErrors();
  };

  const handlePhoneBlur = () => {
    if (phone && !PHONE_PATTERN.test(phone)) {
      setPhoneError(true);
      setPhoneErrorMessage("올바른 휴대폰 번호를 입력해주세요.");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    if (!phone) {
      setPhoneError(true);
      setPhoneErrorMessage("휴대폰 번호를 입력해주세요.");
      return;
    }

    if (!PHONE_PATTERN.test(phone)) {
      setPhoneError(true);
      setPhoneErrorMessage("올바른 휴대폰 번호를 입력해주세요.");
      return;
    }

    if (!password) {
      setPasswordError(true);
      setPasswordErrorMessage("비밀번호를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
    // 1) Supabase DB에서 실제 가입 계정 확인.
    //    maybeSingle: 0건이면 data=null(정상), 실제 오류(네트워크/RLS/중복행)는 error 로 구분.
    //    (이전엔 .single() + error 무시라 모든 실패가 '미가입'으로 잘못 안내됐음)
    const { data: dbUser, error: loginError } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .eq("password", password)
      .maybeSingle();

    if (loginError) {
      setPhoneError(true);
      setPhoneErrorMessage("일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
      return;
    }

    if (dbUser) {
      // Supabase 계정으로 로그인 성공
      // 1) 현재 계정 포인터를 먼저 비운다. ★중요★
      //    각 store 의 setter/reset 은 getCurrentAccount() 가 있으면 그 phone 의 Supabase
      //    row 를 즉시 업데이트한다. 포인터가 남아 있으면 아래 "기본값으로 리셋" 들이
      //    실제 사용자의 레벨/XP/프로필/접속일수 등을 기본값으로 덮어써 데이터가 손상된다.
      //    포인터를 null 로 비우면 그 쓰기들이 전부 건너뛰어져(=로컬 전용) 안전하다.
      clearCurrentAccount();

      // 2) 이전 계정/세션의 localStorage 잔여 데이터를 비운다(로컬 전용, Supabase 미반영).
      resetUserStoresForLogin();
      setGender(dbUser.gender ?? "female");
      setProfileFace(defaultFaceForGender(dbUser.gender ?? "female"));
      setNickname(dbUser.nickname ?? "");
      setTitle("");
      setEquippedBadgeId("badge_24");

      // 3) 가입 직후 2분 skip 플래그 제거 — 로그인은 신규가입이 아니므로 즉시 복원 허용.
      try {
        window.localStorage.removeItem("holo:fresh-signup");
      } catch {
        // ignore
      }

      // 4) 이제 현재 계정을 확정하고, Supabase(=source of truth)에서 프로필 사진/칭호/
      //    뱃지/레벨/XP/마이룸/포인트/인증/친구/접속일수 등 저장된 값을 그대로 복원한다.
      //    (계정 확정을 sync 직전에 해야 위 리셋이 Supabase 를 건드리지 않는다)
      setCurrentAccount(dbUser.phone);
      await syncAllUserDataFromSupabase();

      navigate("/home", { replace: true });
      return;
    }

    // Supabase에 없으면 미가입 번호
    setPhoneError(true);
    setPhoneErrorMessage("등록되지 않은 휴대폰 번호입니다.");
    } catch {
      setPhoneError(true);
      setPhoneErrorMessage("일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      // 성공 시엔 navigate 로 화면을 떠나므로 사실상 영향 없음.
      setSubmitting(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-20">
      <div className="mb-12 flex flex-col items-center gap-3">
        {/* 진입 모션은 wrapper에, 지속 float+glow는 img에 — transform 충돌 없이 합쳐짐 */}
        <div className="animate-holo-logo-in">
          <img
            src="/illustrations/splash-logo.png"
            alt=""
            aria-hidden
            className="h-[90px] w-[105px] animate-holo-logo object-contain will-change-transform"
          />
        </div>
        <span className="font-fredoka text-[44px] font-semibold leading-none text-holo-purple">
          HOLO
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* 휴대폰 번호 입력 영역 */}
        <div className="flex flex-col gap-1">
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="휴대폰 번호 입력"
            value={formatPhone(phone)}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
            className={`h-[62px] rounded-holo-input px-5 text-[15px] outline-none transition ${
              phoneError
                ? "border-2 border-holo-error"
                : phone && PHONE_PATTERN.test(phone)
                  ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                  : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
            }`}
          />
          {phoneErrorMessage && (
            <p className="pl-2 text-[13px] text-holo-error">{phoneErrorMessage}</p>
          )}
        </div>

        {/* 비밀번호 입력 영역 */}
        <div className="flex flex-col gap-1">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value.slice(0, 16));
                clearErrors();
              }}
              onKeyDown={capsHandlers.onKeyDown}
              onKeyUp={capsHandlers.onKeyUp}
              onBlur={capsHandlers.onBlur}
              maxLength={16}
              className={`h-[62px] w-full rounded-holo-input px-5 pr-12 text-[15px] outline-none transition ${
                passwordError
                  ? "border-2 border-holo-error"
                  : password
                    ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                    : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
              }`}
            />
            <PasswordToggle visible={showPw} onClick={() => setShowPw((s) => !s)} />
          </div>
          <CapsLockBadge visible={capsOn} />
          {passwordErrorMessage && (
            <p className="pl-2 text-[13px] text-holo-error">{passwordErrorMessage}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="h-[60px] rounded-holo-pill bg-holo-gradient text-[16px] font-semibold text-white shadow-md transition active:scale-[0.99] disabled:opacity-60"
        >
          {submitting ? "로그인 중…" : "로그인"}
        </button>
      </form>

      <nav className="mt-auto flex items-center justify-center gap-4 pt-10 text-[12px] text-holo-ink-3">
        <button type="button" onClick={() => navigate("/signup/terms")}>
          회원가입
        </button>
        <span className="h-3 w-px bg-holo-line" />
        <button type="button" onClick={() => navigate("/auth/find-password")}>
          비밀번호 찾기
        </button>
      </nav>
    </main>
  );
}
