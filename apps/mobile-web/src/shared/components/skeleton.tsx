/**
 * 로딩 스켈레톤 — 데이터 로드 중 빈 화면/스피너 대신 콘텐츠 윤곽을 회색으로 보여준다.
 * (2026 모바일 UX: 스켈레톤이 체감 대기를 줄이고 '로딩 중'을 즉시 알린다.)
 */

/** 회색 펄스 블록 1개. */
export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-holo-line-3 ${className}`} />;
}

/** 게시판 카드 1줄 스켈레톤 (아바타 + 제목/본문 2줄 + 메타). */
function PostCardSkeleton() {
  return (
    <li className="border-b border-holo-line">
      <div className="flex items-stretch gap-3 px-4 py-3">
        <SkeletonBox className="h-12 w-12 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2 py-1">
          <SkeletonBox className="h-4 w-3/4" />
          <SkeletonBox className="h-3 w-1/2" />
          <SkeletonBox className="h-3 w-1/3" />
        </div>
      </div>
    </li>
  );
}

/** 게시판 리스트 스켈레톤 — N줄. */
export function PostListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="flex-1 overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </ul>
  );
}
