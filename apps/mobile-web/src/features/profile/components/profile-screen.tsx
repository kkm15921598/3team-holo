import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/auth/auth-context";

export function ProfileScreen() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <section className="flex items-center gap-4 rounded-2xl bg-gray-50 p-4">
        <div className="h-16 w-16 shrink-0 rounded-full bg-holo-gradient" aria-hidden />
        <div className="flex flex-col">
          <span className="text-base font-semibold text-gray-900">{session?.userId ?? "게스트"}</span>
          <span className="text-xs text-gray-500">레벨 1 · 포인트 0P</span>
        </div>
      </section>

      <Link
        to="/myroom"
        className="flex h-12 items-center justify-between rounded-2xl bg-holo-purple-light px-4 text-sm font-semibold text-holo-purple-deep"
      >
        <span>마이룸 가기</span>
        <span aria-hidden>→</span>
      </Link>

      <ul className="flex flex-col divide-y divide-gray-100 rounded-2xl bg-gray-50">
        <MenuRow label="출석체크" />
        <MenuRow label="친구" />
        <MenuRow label="설정" />
      </ul>

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-2 h-12 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 active:bg-gray-50"
      >
        로그아웃
      </button>
    </div>
  );
}

function MenuRow({ label }: { label: string }) {
  return (
    <li className="flex h-12 items-center justify-between px-4 text-sm text-gray-700">
      <span>{label}</span>
      <span className="text-gray-300" aria-hidden>›</span>
    </li>
  );
}
