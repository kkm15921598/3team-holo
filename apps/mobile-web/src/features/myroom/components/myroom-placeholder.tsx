export function MyRoomPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <div className="flex h-56 w-56 items-center justify-center rounded-3xl bg-holo-purple-light text-sm text-holo-purple-deep">
        2.5D 아이소메트릭 방 (P3)
      </div>
      <h2 className="text-lg font-semibold text-gray-900">마이룸</h2>
      <p className="text-sm text-gray-500">
        가구 배치 / 방문 / 좋아요 등은 P3 단계에서 구현됩니다.
      </p>
    </div>
  );
}
