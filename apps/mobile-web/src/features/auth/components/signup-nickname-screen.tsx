import { useNavigate } from "react-router-dom";
import { useSignup } from "@/features/auth/signup-context";
import {
  useNicknameAvailability,
  type AvailabilityStatus,
} from "@/features/auth/hooks/use-nickname-availability";

const BIO_MAX = 40;

export function SignupNicknameScreen() {
  const { state, patch } = useSignup();
  const navigate = useNavigate();
  const status = useNicknameAvailability(state.nickname);

  const valid = status === "available";

  return (
    <div className="flex flex-1 flex-col px-6 pb-6 pt-8">
      <p className="text-xl font-semibold leading-tight text-gray-900">
        프로필을
        <br />
        설정해주세요
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">닉네임</span>
          <div className="flex h-12 items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-holo-purple focus-within:bg-white">
            <input
              type="text"
              value={state.nickname}
              onChange={(e) => patch({ nickname: e.target.value.slice(0, 12) })}
              placeholder="2~12자, 한글/영문/숫자"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
            {status === "checking" && <Spinner />}
            {status === "available" && <CheckMark />}
          </div>
          <StatusHint status={status} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <span>한 줄 소개 <span className="text-gray-400">(선택)</span></span>
            <span className="font-normal text-gray-400">{state.bio.length} / {BIO_MAX}</span>
          </span>
          <textarea
            value={state.bio}
            onChange={(e) => patch({ bio: e.target.value.slice(0, BIO_MAX) })}
            placeholder="이웃에게 보여줄 한 줄 소개를 적어보세요"
            rows={3}
            className="resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-holo-purple focus:bg-white"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={!valid}
        onClick={() => navigate("/signup/done")}
        className={`mt-auto h-12 rounded-full text-sm font-semibold transition ${
          valid
            ? "bg-holo-gradient text-white shadow-md active:scale-[0.99]"
            : "bg-gray-200 text-gray-400"
        }`}
      >
        다음
      </button>
    </div>
  );
}

function StatusHint({ status }: { status: AvailabilityStatus }) {
  switch (status) {
    case "idle":
      return <span className="text-[11px] text-gray-400">2~12자 사이로 입력해주세요</span>;
    case "too_short":
      return <span className="text-[11px] text-gray-400">2자 이상 입력해주세요</span>;
    case "too_long":
      return <span className="text-[11px] text-gray-400">12자를 초과할 수 없어요</span>;
    case "checking":
      return <span className="text-[11px] text-gray-500">중복 확인 중...</span>;
    case "available":
      return <span className="text-[11px] font-medium text-emerald-500">사용 가능한 닉네임이에요</span>;
    case "taken":
      return <span className="text-[11px] font-medium text-red-500">이미 사용 중인 닉네임이에요</span>;
  }
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="#E5E7EB" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="#B77CFF" strokeWidth="3" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
