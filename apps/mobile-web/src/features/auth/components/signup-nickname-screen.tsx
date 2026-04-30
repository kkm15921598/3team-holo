import { useNavigate } from "react-router-dom";
import { useSignup } from "@/features/auth/signup-context";

const MIN = 2;
const MAX = 12;
const BIO_MAX = 40;

export function SignupNicknameScreen() {
  const { state, patch } = useSignup();
  const navigate = useNavigate();

  const len = state.nickname.trim().length;
  const valid = len >= MIN && len <= MAX;

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
          <input
            type="text"
            value={state.nickname}
            onChange={(e) => patch({ nickname: e.target.value.slice(0, MAX) })}
            placeholder="2~12자, 한글/영문/숫자"
            className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-holo-purple focus:bg-white"
          />
          <span className={`text-[11px] ${valid ? "text-emerald-500" : "text-gray-400"}`}>
            {len === 0
              ? `${MIN}~${MAX}자 사이로 입력해주세요`
              : valid
                ? "사용 가능한 닉네임이에요"
                : len < MIN
                  ? `${MIN}자 이상 입력해주세요`
                  : `${MAX}자를 초과할 수 없어요`}
          </span>
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
