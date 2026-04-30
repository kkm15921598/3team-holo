import { useNavigate } from "react-router-dom";
import { useSignup } from "@/features/auth/signup-context";
import { useAuth } from "@/shared/auth/auth-context";

export function SignupDoneScreen() {
  const { state, reset } = useSignup();
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const displayName = state.nickname.trim() || state.name.trim() || "이웃";

  const enterApp = () => {
    signIn(state.nickname.trim() || state.name.trim() || "new-user");
    reset();
    navigate("/myroom", { replace: true });
  };

  return (
    <div className="flex flex-1 flex-col px-6 pb-6 pt-6">
      <section className="rounded-3xl bg-holo-gradient p-6 text-center text-white shadow-md">
        <p className="text-xs opacity-90">가입 완료</p>
        <p className="mt-1 text-2xl font-bold">환영해요, {displayName}님 🎉</p>
        <p className="mt-2 text-xs opacity-90">{state.address || "우리 동네"}의 새로운 이웃이 되었어요</p>
      </section>

      <div className="mt-6 aspect-square w-full overflow-hidden rounded-3xl bg-holo-purple-light">
        <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
          <polygon points="100,40 180,80 100,120 20,80" fill="#F3E8FF" />
          <polygon points="20,80 100,120 100,180 20,140" fill="#E9D5FF" />
          <polygon points="100,120 180,80 180,140 100,180" fill="#D8B4FE" />
        </svg>
      </div>

      <p className="mt-6 text-center text-sm leading-6 text-gray-600">
        나만의 마이룸을 꾸미고
        <br />
        이웃들과 인사를 나눠보세요
      </p>

      <button
        type="button"
        onClick={enterApp}
        className="mt-auto h-12 rounded-full bg-holo-gradient text-sm font-semibold text-white shadow-md active:scale-[0.99]"
      >
        내 방 만들기
      </button>
    </div>
  );
}
