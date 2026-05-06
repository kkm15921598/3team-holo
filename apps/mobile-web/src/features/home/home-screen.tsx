const NICKNAME = "무지는 단무지";
const LEVEL = 24;
const TITLE = "#벌레_해결사";

type Meetup = {
  id: string;
  title: string;
  distance: string;
  duration: string;
  description: string;
};

const MEETUPS: Meetup[] = [
  { id: "1", title: "점심 번개", distance: "500m", duration: "20분", description: "오피스 단지 떡볶이 메이트!" },
  { id: "2", title: "수박 소분", distance: "350m", duration: "15분", description: "마트에서 산 큰 수박 나눌 분~" },
  { id: "3", title: "코스트코 소분", distance: "700m", duration: "50분", description: "코스트코에서 함께 장 보고 나눌 분~" },
  { id: "4", title: "러닝 메이트", distance: "200m", duration: "60분", description: "다같이 러닝해요" },
];

export function HomeScreen() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative px-4 pt-2">
        <div className="relative overflow-hidden rounded-holo-card bg-holo-hero">
          <img
            src="/illustrations/home-hero.png"
            alt=""
            className="h-[280px] w-full object-cover"
            aria-hidden
          />
          {/* 상태 메시지 말풍선 */}
          <div className="absolute right-6 top-20 rounded-full bg-white px-3 py-1.5 text-[12px] text-holo-ink shadow-md">
            상태 메시지
          </div>
        </div>

        {/* Profile card overlapping */}
        <div className="-mt-7 flex items-center gap-3 rounded-holo-card bg-holo-surface p-3 shadow-holo-card">
          <div className="h-12 w-12 shrink-0 rounded-full bg-holo-yellow-room" />
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="rounded-[4px] bg-holo-gradient px-2 py-0.5 text-[11px] font-semibold text-white">
                Lv.{LEVEL}
              </span>
              <span className="text-[15px] font-semibold text-holo-ink">{NICKNAME}</span>
            </div>
            <span className="text-[12px] text-holo-ink-3">{TITLE}</span>
          </div>
        </div>
      </section>

      {/* Recommendation header */}
      <section className="px-4 pt-6">
        <p className="text-[14px] text-holo-ink-2">어떤 모임에 들어갈지 고민되시나요?</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-[15px] font-semibold text-holo-ink">
            <span className="text-holo-purple-mid">{NICKNAME}</span> 님을 위한 <span className="text-holo-purple-mid">추천 모임</span>
          </p>
          <button type="button" aria-label="새로고침" className="text-holo-purple-mid">
            <RefreshIcon />
          </button>
        </div>
      </section>

      {/* Meetup cards horizontal scroll */}
      <section className="-mx-4 mt-3 overflow-x-auto px-4 pb-4">
        <div className="flex w-max gap-3">
          {MEETUPS.map((m) => (
            <article
              key={m.id}
              className="flex h-[150px] w-[170px] shrink-0 flex-col justify-between rounded-holo-tile bg-holo-lilac-card p-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-holo-ink">{m.title}</p>
                  <p className="mt-1 text-[11px] text-holo-ink-3">
                    {m.distance} · {m.duration}
                  </p>
                </div>
                <ArrowChip />
              </div>
              <p className="text-[12px] leading-snug text-holo-ink-2">{m.description}</p>
              <div className="flex">
                <AvatarStack />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FAB */}
      <button
        type="button"
        aria-label="모임 만들기"
        className="fixed bottom-[88px] right-1/2 z-10 flex h-[50px] w-[50px] translate-x-[160px] items-center justify-center rounded-full bg-holo-gradient text-white shadow-md"
      >
        <PlusIcon />
      </button>
    </main>
  );
}

function RefreshIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 0 1 15.5-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
function ArrowChip() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-holo-lilac-light text-white">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 17 17 7" />
        <path d="M8 7h9v9" />
      </svg>
    </span>
  );
}
function AvatarStack() {
  return (
    <div className="flex -space-x-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-5 w-5 rounded-full border-2 border-holo-lilac-card bg-holo-yellow-room"
        />
      ))}
    </div>
  );
}
function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
