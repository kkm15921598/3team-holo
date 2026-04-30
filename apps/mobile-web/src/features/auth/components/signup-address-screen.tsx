import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignup } from "@/features/auth/signup-context";

const NEIGHBORHOODS = [
  "서울 강남구 역삼1동",
  "서울 강남구 역삼2동",
  "서울 강남구 삼성동",
  "서울 송파구 잠실3동",
  "서울 마포구 망원1동",
  "서울 용산구 한남동",
];

export function SignupAddressScreen() {
  const { state, patch } = useSignup();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return NEIGHBORHOODS;
    return NEIGHBORHOODS.filter((n) => n.includes(q));
  }, [query]);

  const valid = state.address.trim().length > 0;

  return (
    <div className="flex flex-1 flex-col px-6 pb-6 pt-8">
      <p className="text-xl font-semibold leading-tight text-gray-900">
        우리 동네를
        <br />
        설정해주세요
      </p>

      <label className="mt-8 flex h-12 items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-holo-purple focus-within:bg-white">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="동, 읍, 면으로 검색"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
      </label>

      <ul className="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto">
        {results.map((n) => {
          const active = state.address === n;
          return (
            <li key={n}>
              <button
                type="button"
                onClick={() => patch({ address: n })}
                className={`flex h-12 w-full items-center justify-between rounded-2xl px-4 text-sm transition ${
                  active
                    ? "bg-holo-purple-light font-semibold text-holo-purple-deep"
                    : "bg-gray-50 text-gray-700"
                }`}
              >
                <span>{n}</span>
                {active && <CheckMark />}
              </button>
            </li>
          );
        })}
        {results.length === 0 && (
          <li className="py-12 text-center text-sm text-gray-400">검색 결과 없음</li>
        )}
      </ul>

      <button
        type="button"
        disabled={!valid}
        onClick={() => navigate("/signup/nickname")}
        className={`mt-4 h-12 rounded-full text-sm font-semibold transition ${
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

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
