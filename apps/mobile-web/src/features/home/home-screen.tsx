import badgeImg from "../../badge/badge_01.png";
import { ProfileAvatar, RoomScene } from "./home-illustrations";
import { MeetupCard, PlusIcon, RefreshIcon, type Meetup } from "./home-meetup-card";

const NICKNAME = "무지는 단무지";
const LEVEL = 24;
const TITLE = "#벌레_해결사";

const MEETUPS: Meetup[] = [
  {
    id: "1",
    title: "점심 번개",
    distance: "500m",
    duration: "20분",
    description: "오피스 단지 떡볶이 메이트!",
    avatars: [
      { bg: "#F4A261", emoji: "🧑" },
      { bg: "#E76F51", emoji: "👩" },
      { bg: "#457B9D", emoji: "🧔" },
    ],
  },
  {
    id: "2",
    title: "수박 소분",
    distance: "350m",
    duration: "15분",
    description: "마트에서 산 큰 수박 나눌 분~",
    avatars: [
      { bg: "#E9C46A", emoji: "👩" },
      { bg: "#A8DADC", emoji: "🧓" },
    ],
  },
  {
    id: "3",
    title: "편의점 야식",
    distance: "120m",
    duration: "5분",
    description: "혼자 먹긴 많아서요 ㅎㅎ",
    avatars: [{ bg: "#CDB4DB", emoji: "🧑" }],
    dim: true,
  },
];

export function HomeScreen() {
  return (
    <main className="flex flex-1 flex-col pb-6">
      <section className="relative">
        <div
          className="relative mx-auto h-[447px] w-[calc(100%-32px)] overflow-visible rounded-b-[40px] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/illustrations/home-hero.png)" }}
        >
          <div className="absolute left-0 right-0 top-[10px] flex justify-center">
            <RoomScene />
          </div>

          <div className="absolute right-[42px] top-[148px] z-[5] whitespace-nowrap rounded-[12px] rounded-bl-[4px] bg-white px-[14px] py-[8px] text-[15px] font-semibold text-holo-ink shadow-[0_2px_10px_rgba(116,72,221,0.15)]">
            상태 메시지
            <span
              className="absolute h-0 w-0"
              style={{
                bottom: "-8px",
                left: "12px",
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "8px solid #fff",
              }}
            />
          </div>

          <div className="absolute -bottom-[44px] left-1/2 z-[6] flex h-[88px] w-[319px] -translate-x-1/2 items-center gap-[14px] rounded-[20px] bg-holo-surface px-4 shadow-[0_4px_16px_rgba(116,72,221,0.1)]">
            <div className="relative h-[63px] w-[63px] shrink-0">
              <div className="h-[63px] w-[63px] overflow-hidden rounded-full">
                <ProfileAvatar />
              </div>
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[4px] px-[9px] py-[3px] text-[12px] font-bold text-white"
                style={{ background: "linear-gradient(to right,#542BB4,#E95AA4)" }}
              >
                Lv.{LEVEL}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-[6px] flex items-center gap-2">
                <span className="text-[20px] font-bold text-holo-ink">{NICKNAME}</span>
                <img src={badgeImg} alt="" className="h-[27px] w-[27px] object-contain" />
              </div>
              <div className="text-[15px] text-[#A9A9A9]">{TITLE}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-[68px] px-[14px]">
        <p className="mb-[3px] text-[15px] text-[#8E8E8E]">어떤 모임에 들어갈지 고민되시나요?</p>
        <div className="mb-[14px] flex items-center gap-[6px] text-[18px]">
          <span className="font-bold text-holo-purple-mid">{NICKNAME}</span>
          <span className="font-medium text-black">님을 위한</span>
          <span className="font-bold text-holo-purple-mid">추천 모임</span>
          <button type="button" aria-label="새로고침" className="ml-[2px] flex items-center p-[2px] text-holo-purple-mid">
            <RefreshIcon />
          </button>
        </div>
        <div className="no-scrollbar -mx-[14px] flex gap-3 overflow-x-auto px-[14px] pb-2">
          {MEETUPS.map((m) => (
            <MeetupCard key={m.id} m={m} />
          ))}
        </div>
      </section>

      <button
        type="button"
        aria-label="모임 만들기"
        className="fixed bottom-[103px] left-1/2 z-20 flex h-[52px] w-[52px] translate-x-[110px] items-center justify-center rounded-full text-white shadow-[0_2px_6.9px_rgba(84,43,180,0.5)]"
        style={{ background: "linear-gradient(135deg,#542BB4,#E95AA4)" }}
      >
        <PlusIcon />
      </button>
    </main>
  );
}
