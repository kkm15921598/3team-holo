import { useNavigate } from "react-router-dom";
import { useSignup } from "@/features/auth/signup-context";

const GENDERS = [
  { value: "male", label: "남자" },
  { value: "female", label: "여자" },
  { value: "none", label: "선택 안 함" },
] as const;

export function SignupIdentityScreen() {
  const { state, patch } = useSignup();
  const navigate = useNavigate();

  const valid = state.name.trim().length >= 2 && state.birth.length === 10;

  return (
    <div className="flex flex-1 flex-col px-6 pb-6 pt-8">
      <p className="text-xl font-semibold leading-tight text-gray-900">
        본인 정보를
        <br />
        입력해주세요
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <Field label="이름">
          <input
            type="text"
            value={state.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="실명을 입력해주세요"
            className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-holo-purple focus:bg-white"
          />
        </Field>

        <Field label="생년월일">
          <input
            type="date"
            value={state.birth}
            onChange={(e) => patch({ birth: e.target.value })}
            className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-holo-purple focus:bg-white"
          />
        </Field>

        <Field label="성별">
          <div className="grid grid-cols-3 gap-2">
            {GENDERS.map((g) => {
              const active = state.gender === g.value;
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => patch({ gender: g.value })}
                  className={`h-12 rounded-2xl border text-sm transition ${
                    active
                      ? "border-holo-purple bg-holo-purple-light font-semibold text-holo-purple-deep"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      <button
        type="button"
        disabled={!valid}
        onClick={() => navigate("/signup/phone")}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}
