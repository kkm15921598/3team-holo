export function HomeScreen() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <section className="rounded-2xl bg-holo-gradient p-5 text-white shadow-sm">
        <p className="text-xs opacity-90">오늘의 출석체크</p>
        <p className="mt-1 text-lg font-semibold">3일 연속 출석 중!</p>
      </section>
      <PlaceholderCard title="추천 게시글" body="이웃들의 새 글이 여기 표시됩니다." />
      <PlaceholderCard title="친구 활동" body="친구의 최근 활동이 여기 표시됩니다." />
      <PlaceholderCard title="동네 소식" body="동네 공지/이벤트가 여기 표시됩니다." />
    </div>
  );
}

function PlaceholderCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl bg-gray-50 p-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-xs text-gray-500">{body}</p>
    </article>
  );
}
