import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/auth/auth-context";

const STATS: { label: string; value: string }[] = [
  { label: "레벨", value: "Lv.1" },
  { label: "포인트", value: "0P" },
  { label: "출석", value: "3일" },
];

const MENU: { label: string; to: string; icon: "calendar" | "users" | "qr" | "gear" | "bell" | "info" }[] = [
  { label: "출석체크", to: "/me/checkin", icon: "calendar" },
  { label: "친구", to: "/me/friends", icon: "users" },
  { label: "내 QR", to: "/me/qr", icon: "qr" },
  { label: "알림", to: "/me", icon: "bell" },
  { label: "설정", to: "/me", icon: "gear" },
  { label: "고객센터", to: "/me", icon: "info" },
];

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
          <span className="text-xs text-gray-500">역삼1동 · 가입 1일째</span>
        </div>
      </section>

      <section className="grid grid-cols-3 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col items-center justify-center py-4 ${
              i < STATS.length - 1 ? "border-r border-gray-100" : ""
            }`}
          >
            <span className="text-base font-bold text-holo-purple-deep">{s.value}</span>
            <span className="mt-0.5 text-[11px] text-gray-500">{s.label}</span>
          </div>
        ))}
      </section>

      <Link
        to="/myroom"
        className="flex h-14 items-center justify-between rounded-2xl bg-holo-gradient px-5 text-sm font-semibold text-white shadow-sm"
      >
        <div className="flex flex-col">
          <span>마이룸 가기</span>
          <span className="text-[11px] font-normal opacity-90">내 방을 꾸며보세요</span>
        </div>
        <span aria-hidden className="text-lg">→</span>
      </Link>

      <ul className="flex flex-col divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100">
        {MENU.map((m) => (
          <li key={m.label}>
            <Link to={m.to} className="flex h-12 items-center gap-3 px-4 text-sm text-gray-700 active:bg-gray-50">
              <MenuIcon kind={m.icon} />
              <span className="flex-1">{m.label}</span>
              <span className="text-gray-300" aria-hidden>›</span>
            </Link>
          </li>
        ))}
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

function MenuIcon({ kind }: { kind: "calendar" | "users" | "qr" | "gear" | "bell" | "info" }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#B77CFF",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "calendar":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "users":
      return (
        <svg {...props}>
          <circle cx="9" cy="9" r="3" />
          <path d="M3 19a6 6 0 0 1 12 0" />
          <circle cx="17" cy="8" r="2.5" />
          <path d="M15 19a5 5 0 0 1 6-4" />
        </svg>
      );
    case "qr":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <path d="M14 14h3v3M21 17v4M14 21h3" />
        </svg>
      );
    case "bell":
      return (
        <svg {...props}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
      );
    case "gear":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
    case "info":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      );
  }
}
