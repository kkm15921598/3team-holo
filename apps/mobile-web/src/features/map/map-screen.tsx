import { useState } from "react";

const FILTERS = ["전체", "지금바로", "계속 함께"] as const;
type Filter = (typeof FILTERS)[number];

const MEETUPS = [
  { id: "1", title: "점심 번개", distance: "500m", duration: "20분", description: "오피스 단지 떡볶이 메이트!" },
  { id: "2", title: "수박 소분", distance: "350m", duration: "15분", description: "마트에서 산 큰 수박 나눌 분~" },
  { id: "3", title: "코스트코 소분", distance: "700m", duration: "50분", description: "코스트코에서 함께 장 보고 나눌 분~" },
];

export function MapScreen() {
  const [filter, setFilter] = useState<Filter>("전체");
  return (
    <main className="flex flex-1 flex-col">
      <section className="px-2 pt-2">
        <img
          src="/illustrations/map.png"
          alt="지도"
          className="aspect-[349/382] w-full rounded-holo-tile object-cover"
        />
        <p className="mt-2 text-center text-[11px] text-holo-ink-3">
          ※ 정책상 반경 50m 거리 내 위치만 표시됩니다
        </p>
      </section>

      <section className="mt-2 flex justify-center px-4">
        <div className="flex h-[44px] w-full items-center rounded-holo-pill bg-holo-surface-2 p-1">
          {FILTERS.map((f) => {
            const on = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`flex flex-1 items-center justify-center rounded-holo-pill text-[13px] transition ${
                  on ? "bg-holo-gradient font-semibold text-white shadow-sm" : "text-holo-lilac-light"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </section>

      <section className="-mx-4 mt-3 overflow-x-auto px-4 pb-4">
        <div className="flex w-max gap-3">
          {MEETUPS.map((m) => (
            <article
              key={m.id}
              className="flex h-[150px] w-[170px] shrink-0 flex-col justify-between rounded-holo-tile bg-holo-lilac-card p-3"
            >
              <div>
                <p className="text-[14px] font-semibold text-holo-ink">{m.title}</p>
                <p className="mt-1 text-[11px] text-holo-ink-3">
                  {m.distance} · {m.duration}
                </p>
              </div>
              <p className="text-[12px] leading-snug text-holo-ink-2">{m.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
