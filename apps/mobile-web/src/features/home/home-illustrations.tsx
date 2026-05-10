import { furnitureSrc, ROOM_BG_W, ROOM_H, ROOM_W } from "../myroom/myroom-data";
import { useMyroomItems } from "../myroom/myroom-store";

export function RoomScene() {
  const items = useMyroomItems();
  return (
    <div className="relative mx-auto shrink-0" style={{ width: ROOM_W, height: ROOM_H }}>
      <img
        src="/illustrations/room_basic.png"
        alt=""
        className="absolute left-1/2 top-0 -translate-x-1/2 select-none max-w-none"
        style={{ width: ROOM_BG_W }}
        draggable={false}
        aria-hidden
      />
      {items.map((it) => (
        <img
          key={it.id}
          src={furnitureSrc(it)}
          alt=""
          className="absolute select-none max-w-none"
          style={{ left: it.x, top: it.y, width: it.width }}
          draggable={false}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function ProfileAvatar() {
  return (
    <svg viewBox="0 0 63 63" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="63" height="63" fill="#F5E8A0" />
      <ellipse cx="31.5" cy="26" rx="14" ry="14" fill="#FDDBA0" />
      <ellipse cx="31.5" cy="15" rx="14" ry="9" fill="#1A0A00" />
      <circle cx="38" cy="14" r="7" fill="#1A0A00" />
      <ellipse cx="20" cy="24" rx="6" ry="10" fill="#1A0A00" />
      <ellipse cx="43" cy="24" rx="6" ry="10" fill="#1A0A00" />
      <ellipse cx="31.5" cy="18" rx="13" ry="8" fill="#1A0A00" />
      <circle cx="27" cy="27" r="2.5" fill="#2A1A0A" />
      <circle cx="36" cy="27" r="2.5" fill="#2A1A0A" />
      <circle cx="28" cy="26" r="1" fill="white" />
      <circle cx="37" cy="26" r="1" fill="white" />
      <ellipse cx="23" cy="32" rx="5" ry="3" fill="#FFBCB0" opacity="0.7" />
      <ellipse cx="40" cy="32" rx="5" ry="3" fill="#FFBCB0" opacity="0.7" />
      <path d="M27 36 Q31.5 40 36 36" stroke="#C07040" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <ellipse cx="31.5" cy="55" rx="22" ry="14" fill="#FF9999" />
    </svg>
  );
}
