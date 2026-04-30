import { useParams } from "react-router-dom";

export function ChatRoomPlaceholder() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-xs text-gray-400">채팅방 #{id}</p>
      <h2 className="text-lg font-semibold text-gray-900">채팅방 (placeholder)</h2>
      <p className="text-sm text-gray-500">
        Realtime 메시지/입력 UI는 다음 단계에서 구현됩니다.
      </p>
    </div>
  );
}
