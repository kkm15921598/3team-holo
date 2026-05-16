// 그룹 채팅용 멀티-아바타 컴포넌트.
// chat-room-screen 헤더(sm)와 chat-list-screen Thumbnail(md) 양쪽에서 동일한
// 레이아웃을 쓰도록 공통화. 인원 수에 따라 1:1=원형, 2명=좌우 2분할,
// 3명=2x2 그리드의 좌상/우상/좌하(우하 빈 칸), 4명+=2x2 그리드 4칸으로 표시한다.

import type { ChatRoom } from "@/shared/mock/data";
import { getAvatarUrl } from "./avatars";
import { getProfile } from "@/shared/stores/profile-store";
import { ME_PERSONA } from "@/features/home/home-faces";

/** memberNames 가 부족할 때 채워 넣는 fallback 닉네임 풀. */
const FALLBACK_NICKS = [
  "고소한 감자",
  "보송보송한 햄찌",
  "새콤한 망고",
  "매콤한 떡볶이",
];

/** 본인 닉네임이면 프로필 store 의 사진을, 그 외에는 닉네임 시드 아바타를 반환. */
function avatarSrcFor(nickname: string): string {
  const profile = getProfile();
  if (nickname === profile.nickname) {
    return profile.profileFace ?? ME_PERSONA.face;
  }
  return getAvatarUrl(nickname);
}

/**
 * 방의 멤버 시드 닉네임을 인원 수만큼 만들어 반환. 항상 본인을 첫 번째로 포함.
 * - memberNames 가 있으면 그것을 우선
 * - 부족하면 fallback 풀로 채움
 * - 그래도 부족하면 방 이름 시드 더미로 채움
 * 결과는 최소 2개, 최대 4개로 슬라이스.
 */
function buildSeeds(room: ChatRoom): string[] {
  const profile = getProfile();
  const myNickname = profile.nickname;

  const target = Math.max(2, Math.min(4, room.memberCount));
  const seeds: string[] = [myNickname];

  // 1) 방의 실제 멤버 닉네임
  if (room.memberNames) {
    for (const n of room.memberNames) {
      if (seeds.length >= target) break;
      if (!seeds.includes(n)) seeds.push(n);
    }
  }
  // 2) Fallback 풀
  for (const n of FALLBACK_NICKS) {
    if (seeds.length >= target) break;
    if (!seeds.includes(n)) seeds.push(n);
  }
  // 3) 방 이름 시드 더미
  let filler = 0;
  while (seeds.length < target) {
    seeds.push(`${room.name}_g${filler++}`);
  }

  return seeds.slice(0, target);
}

type Size = "sm" | "md";

const SIZE_BOX: Record<Size, string> = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
};

const SIZE_RADIUS: Record<Size, string> = {
  sm: "rounded-[7px]",
  md: "rounded-[8px]",
};

/**
 * 그룹 채팅 멀티-아바타. 1:1 방은 단일 원형 아바타로 폴백.
 * 인원 N 에 따라 레이아웃 자동 분기.
 */
export function GroupAvatar({
  room,
  size = "md",
}: {
  room: ChatRoom;
  size?: Size;
}) {
  // 1:1 채팅 → 큰 단일 원형 (방 이름 = 상대 닉네임)
  if (!room.isGroup) {
    return (
      <img
        src={getAvatarUrl(room.name)}
        alt=""
        className={`${SIZE_BOX[size]} shrink-0 rounded-full bg-holo-yellow-room object-cover`}
      />
    );
  }

  const seeds = buildSeeds(room);

  // 2명 → 좌우 2분할
  if (seeds.length === 2) {
    return (
      <div
        className={`${SIZE_BOX[size]} ${SIZE_RADIUS[size]} flex shrink-0 gap-0.5 overflow-hidden bg-holo-surface-2 p-0.5`}
      >
        {seeds.map((seed, i) => (
          <img
            key={i}
            src={avatarSrcFor(seed)}
            alt=""
            className="h-full w-0 min-w-0 flex-1 rounded-[3px] object-cover"
          />
        ))}
      </div>
    );
  }

  // 3명 → 2x2 그리드, 좌상/우상/좌하 + 우하는 빈 칸 (좌측 정렬)
  if (seeds.length === 3) {
    return (
      <div
        className={`${SIZE_BOX[size]} ${SIZE_RADIUS[size]} grid shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-holo-surface-2 p-0.5`}
      >
        <img
          src={avatarSrcFor(seeds[0])}
          alt=""
          className="h-full w-full rounded-[3px] object-cover"
        />
        <img
          src={avatarSrcFor(seeds[1])}
          alt=""
          className="h-full w-full rounded-[3px] object-cover"
        />
        <img
          src={avatarSrcFor(seeds[2])}
          alt=""
          className="h-full w-full rounded-[3px] object-cover"
        />
        {/* 우하 칸은 비움 → 좌측 정렬 효과 */}
        <span aria-hidden />
      </div>
    );
  }

  // 4명 이상 → 2x2 그리드 4칸 모두 채움
  return (
    <div
      className={`${SIZE_BOX[size]} ${SIZE_RADIUS[size]} grid shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-holo-surface-2 p-0.5`}
    >
      {seeds.slice(0, 4).map((seed, i) => (
        <img
          key={i}
          src={avatarSrcFor(seed)}
          alt=""
          className="h-full w-full rounded-[3px] object-cover"
        />
      ))}
    </div>
  );
}
