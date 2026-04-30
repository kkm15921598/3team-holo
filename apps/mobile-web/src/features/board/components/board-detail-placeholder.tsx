import { useParams } from "react-router-dom";

export function BoardDetailPlaceholder() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-xs text-gray-400">게시글 #{id}</p>
      <h2 className="text-lg font-semibold text-gray-900">게시글 상세 (placeholder)</h2>
      <p className="text-sm text-gray-500">
        실제 게시글 내용/댓글은 다음 단계에서 구현됩니다.
      </p>
    </div>
  );
}
