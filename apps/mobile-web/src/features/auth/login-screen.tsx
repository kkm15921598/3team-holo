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
  setFriendCode,
} from "@/shared/stores/profile-store";
import { defaultFaceForGender } from "@/features/home/home-faces";
import { setMyroomItems, setStatusMessage } from "@/features/myroom/myroom-store";
import { TEST_ACCOUNTS } from "@/shared/mock/test-accounts";
import { seedAccount } from "@/shared/lib/seed-account";
import {
  getChoices,
  setCurrentAccount,
} from "@/shared/stores/account-choices-store";
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

    // 1) Supabase DB에서 실제 가입 계정 확인
    const { data: dbUser } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .eq("password", password)
      .single();

    if (dbUser) {
      // Supabase 계정으로 로그인 성공
      setGender(dbUser.gender ?? "female");
      setCurrentAccount(dbUser.phone);
      setProfileFace(defaultFaceForGender(dbUser.gender ?? "female"));
      setNickname(dbUser.nickname ?? "");
      setTitle("");
      setEquippedBadgeId("badge_24"); // 기본 장착 뱃지
      setFriendCode("");
      setMyroomItems([]);
      setStatusMessage("");
      navigate("/home", { replace: true });
      return;
    }

    // 2) 테스트 계정 확인 (기존 mock 로그인)
    const account = TEST_ACCOUNTS[phone];
    if (!account) {
      setPhoneError(true);
      setPhoneErrorMessage("등록되지 않은 휴대폰 번호입니다.");
      return;
    }

    if (password === account.password) {
      setGender(account.gender);
      setCurrentAccount(account.phone);
      const saved = getChoices(account.phone);
      setProfileFace(account.profileFace ?? defaultFaceForGender(account.gender));
      setNickname(account.nickname);
      setTitle(saved.title ?? account.title);
      setEquippedBadgeId(saved.equippedBadgeId ?? account.equippedBadgeId);
      setFriendCode(account.friendCode);
      setMyroomItems(account.myroomItems);
      setStatusMessage(account.statusMessage);
      seedAccount(account);
      navigate("/home", { replace: true });
    } else {
      setPasswordError(true);
      setPasswordErrorMessage("비밀번호를 다시 확인해 주세요.");
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
          className="h-[60px] rounded-holo-pill bg-holo-gradient text-[16px] font-semibold text-white shadow-md transition active:scale-[0.99]"
        >
          로그인
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
