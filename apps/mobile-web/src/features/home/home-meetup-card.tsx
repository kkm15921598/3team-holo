import { Link } from "react-router-dom";
import type { Persona } from "./home-faces";

export type Meetup = {
  id: string;
  title: string;
  distance: string;
  duration: string;
  description: string;
  members: Persona[];
  /** total member count — if greater than members.length, the extra is shown as "+N" */
  totalCount?: number;
  dim?: boolean;
};

const MAX_VISIBLE_AVATARS = 3;

export function MeetupCard({ m }: { m: Meetup }) {
  const visible = m.members.slice(0, MAX_VISIBLE_AVATARS);
  const total = m.totalCount ?? m.members.length;
  const extra = total - visible.length;

  return (
    <article
      className="relative h-[153px] w-[169px] min-w-[169px] shrink-0 rounded-[10px] bg-holo-lilac-card-2 px-[14px] pb-[13px] pt-[15px]"
    >
      <div className="line-clamp-1 break-keep pr-[40px] text-[16px] font-bold text-holo-ink">
        {m.title}
      </div>
      <div className="mt-[5px] text-[12px] font-medium text-holo-purple-mid opacity-80">
        {m.distance} · {m.duration}
      </div>
      <p className="mt-[10px] line-clamp-2 text-[13px] leading-[1.45] text-[#333]">
        {m.description}
      </p>
      <Link
        to={`/board/${m.id}`}
        aria-label={`${m.title} 게시글로 이동`}
        className="absolute right-[13px] top-[13px] flex h-[33px] w-[33px] items-center justify-center rounded-full bg-holo-lilac-light transition-colors hover:bg-holo-purple-mid"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M3 11L11 3M11 3H5M11 3V9" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <div className="absolute bottom-[13px] left-[14px] flex">
        {visible.map((p, i) => (
          <img
            key={p.name + i}
            src={p.face}
            alt={p.name}
            title={p.name}
            className="h-[28px] w-[28px] rounded-full border-2 border-holo-lilac-card-2 object-cover"
            style={{ marginLeft: i === 0 ? 0 : -6 }}
            draggable={false}
          />
        ))}
        {extra > 0 && (
          <span
            className="flex h-[28px] min-w-[28px] items-center justify-center rounded-full border-2 border-holo-lilac-card-2 bg-holo-purple-mid px-1 text-[11px] font-bold text-white"
            style={{ marginLeft: -6 }}
          >
            +{extra}
          </span>
        )}
      </div>
    </article>
  );
}

export function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 9C3 6.24 5.24 4 8 4C9.5 4 10.84 4.66 11.76 5.71" stroke="#7448DD" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15 9C15 11.76 12.76 14 10 14C8.5 14 7.16 13.34 6.24 12.29" stroke="#7448DD" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 4.5L13 6L11 6" stroke="#7448DD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11.5L5 13L7 13" stroke="#7448DD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <path d="M11 4V18M4 11H18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
