const FURNITURE = "/illustrations/furniture";

export function RoomScene() {
  return (
    <div className="relative mx-auto h-[340px] w-[400px] shrink-0">
      {/* Base isometric room (walls + floor) — sized larger than the card */}
      <img
        src="/illustrations/room_basic.png"
        alt=""
        className="absolute left-1/2 top-0 -translate-x-1/2 select-none max-w-none"
        style={{ top:50, width: 370, }}
        draggable={false}
        aria-hidden
      />

      {/* Wall art on the back-left wall */}
      <img
        src={`${FURNITURE}/wall/wall_03_left.png`}
        alt=""
        className="absolute select-none max-w-none"
        style={{ top: 50, left: 70, width: 100 }}
        draggable={false}
        aria-hidden
      />

      {/* Bookshelf — back-center, against the back wall */}
      <img
        src={`${FURNITURE}/bookshelf/bookshelf_01_left.png`}
        alt=""
        className="absolute select-none max-w-none"
        style={{ top: 180, left: 60, width: 65 }}
        draggable={false}
        aria-hidden
      />

      {/* Desk with laptop, lamp & chair — front-left */}
      <img
        src={`${FURNITURE}/desk/desk_01_left.png`}
        alt=""
        className="absolute select-none max-w-none"
        style={{ top: 150, left: 100, width: 100 }}
        draggable={false}
        aria-hidden
      />

      {/* Bean-bag chair — front-right */}
      <img
        src={`${FURNITURE}/chair/chair_01_right.png`}
        alt=""
        className="absolute select-none max-w-none"
        style={{ top: 195, right: 30, width: 95 }}
        draggable={false}
        aria-hidden
      />
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
