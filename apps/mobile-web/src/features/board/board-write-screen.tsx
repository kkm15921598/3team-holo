import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function BoardWriteScreen() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  return (
    <main className="flex flex-1 flex-col">
      {/* Action bar */}
      <header className="flex h-12 shrink-0 items-center justify-between px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <div className="flex items-center gap-3 text-[14px]">
          <button type="button" className="text-holo-ink-2">임시 보관함</button>
          <span className="h-3 w-px bg-holo-line" />
          <button type="button" className="text-holo-ink">등록하기</button>
        </div>
      </header>

      {/* Compose card */}
      <section className="mx-4 flex flex-1 flex-col rounded-holo-card bg-white shadow-holo-card">
        <div className="flex h-[60px] items-center justify-between rounded-t-holo-card bg-holo-lilac-soft px-5">
          <span className="text-[16px] font-bold text-holo-purple-mid">자유게시판</span>
          <ChevronDownIcon color="#7448DD" />
        </div>

        <div className="flex gap-2 px-5 pt-3">
          <PillButton label="모임유형" />
          <PillButton label="2026-04-27" icon={<CalIcon />} />
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력해주세요."
          className="mx-5 mt-4 border-b border-holo-line py-2 text-[16px] outline-none placeholder:text-holo-ink-3"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="작성하고 싶으신 내용을 입력해주세요"
          className="mx-5 mt-3 min-h-[180px] flex-1 resize-none text-[14px] outline-none placeholder:text-holo-ink-3"
        />

        {!content && (
          <div className="mx-5 mb-5 mt-2 text-[11px] leading-relaxed text-holo-ink-3">
            ※ 커뮤니티 이용규칙을 꼭 지켜주세요. ※
            <br />
            정치·사회 갈등 조장, 광고·홍보, 불법·유해 콘텐츠, 욕설·혐오 표현, 타인 비방·사생활 침해, 공포·낚시성 게시물은 제한될 수 있습니다.
            <br />
            모두가 편하게 소통할 수 있도록 서로 존중하는 글을 작성해주세요
          </div>
        )}

        <div className="mt-auto flex items-center gap-4 border-t border-holo-line-3 px-5 py-3 text-[14px] text-holo-ink">
          <button type="button" className="flex items-center gap-1">
            <PhotoIcon /> 사진
          </button>
          <button type="button" className="flex items-center gap-1">
            <PinIcon /> 장소
          </button>
        </div>
      </section>
    </main>
  );
}

function PillButton({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1 rounded-full border border-holo-lilac-soft px-3 py-1 text-[12px] text-holo-ink"
    >
      {icon}
      {label}
      <ChevronDownIcon color="#A8A8A8" />
    </button>
  );
}
function ChevronDownIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function CalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function PhotoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
