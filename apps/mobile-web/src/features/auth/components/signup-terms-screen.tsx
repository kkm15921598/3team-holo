import { Link, useNavigate } from "react-router-dom";
import { useSignup } from "@/features/auth/signup-context";

type ItemKey = "agreedAge" | "agreedTos" | "agreedPrivacy" | "agreedMarketing";
type Item = { key: ItemKey; slug: string; label: string; required: boolean };

const ITEMS: Item[] = [
  { key: "agreedAge", slug: "age", label: "만 14세 이상입니다", required: true },
  { key: "agreedTos", slug: "tos", label: "서비스 이용약관 동의", required: true },
  { key: "agreedPrivacy", slug: "privacy", label: "개인정보 처리방침 동의", required: true },
  { key: "agreedMarketing", slug: "marketing", label: "마케팅 정보 수신 동의", required: false },
];

export function SignupTermsScreen() {
  const { state, patch } = useSignup();
  const navigate = useNavigate();

  const allChecked = ITEMS.every((i) => state[i.key]);
  const requiredOk = ITEMS.filter((i) => i.required).every((i) => state[i.key]);

  const toggleAll = () => {
    const next = !allChecked;
    patch({
      agreedAge: next,
      agreedTos: next,
      agreedPrivacy: next,
      agreedMarketing: next,
    });
  };

  return (
    <div className="flex flex-1 flex-col px-6 pb-6 pt-8">
      <p className="text-xl font-semibold leading-tight text-gray-900">
        서비스 이용을 위해
        <br />
        약관에 동의해주세요
      </p>

      <button
        type="button"
        onClick={toggleAll}
        className={`mt-8 flex h-14 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition ${
          allChecked ? "bg-holo-purple-light text-holo-purple-deep" : "bg-gray-50 text-gray-700"
        }`}
      >
        <CheckCircle checked={allChecked} />
        전체 동의
      </button>

      <ul className="mt-3 flex flex-col gap-1">
        {ITEMS.map((item) => (
          <li key={item.key} className="flex h-12 items-center gap-1 rounded-xl px-2 active:bg-gray-50">
            <label className="flex flex-1 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={state[item.key]}
                onChange={(e) => patch({ [item.key]: e.target.checked } as Partial<typeof state>)}
                className="sr-only"
              />
              <CheckCircle checked={state[item.key]} small />
              <span className="flex-1 text-sm text-gray-700">
                <span className={item.required ? "text-holo-purple-deep" : "text-gray-400"}>
                  [{item.required ? "필수" : "선택"}]
                </span>{" "}
                {item.label}
              </span>
            </label>
            <Link
              to={`/signup/terms/${item.slug}`}
              aria-label={`${item.label} 자세히 보기`}
              className="flex h-10 w-10 shrink-0 items-center justify-center text-gray-300 hover:text-gray-500"
            >
              ›
            </Link>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={!requiredOk}
        onClick={() => navigate("/signup/identity")}
        className={`mt-auto h-12 rounded-full text-sm font-semibold transition ${
          requiredOk
            ? "bg-holo-gradient text-white shadow-md active:scale-[0.99]"
            : "bg-gray-200 text-gray-400"
        }`}
      >
        다음
      </button>
    </div>
  );
}

function CheckCircle({ checked, small = false }: { checked: boolean; small?: boolean }) {
  const size = small ? 22 : 26;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full transition ${
        checked ? "bg-holo-purple text-white" : "bg-gray-200 text-white"
      }`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={small ? 12 : 14} height={small ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}
