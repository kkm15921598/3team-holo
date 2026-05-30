/**
 * 마이페이지 → 내 활동 → "이웃찾기" 버튼에서 진입하는 추천 친구 페이지.
 *
 * 추천 로직은 두 신호의 가중치 합으로 단순화:
 *   - 관심사 겹침 (interest overlap)         : ×3 가중치
 *   - 나이대 근접도 (age proximity)           : ×1 가중치 (5살 이내 만점, 거리 1살당 -1)
 *
 * 내 관심사는 가입 시 localStorage.holoUser 에 저장된 `interests` + `customInterest` 에서 가져오고,
 * 후보(이웃) 의 관심사는 닉네임 해시로 결정적으로 산출 — 같은 닉네임은 항상 같은 관심사를 갖는다.
 * 나이도 author-gender.ts 의 getAuthorAge / getAuthorBirthYear 와 동일한 결정적 해시.
 *
 * 화면에는 점수가 가장 높은 3명을 카드로 노출. 카드 안에는:
 *   - 프로필 얼굴 + 닉네임 + 나이대
 *   - 나와 겹치는 관심사 칩 (없으면 "비슷한 또래" 라벨로 대체)
 *   - "친구 추가" 버튼 — friends-store 의 sendFriendRequest 호출
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAvatarUrl } from "@/features/chat/avatars";
import { postsStore } from "@/features/board/posts-store";
import { useProfile } from "@/shared/hooks/use-profile";
import { supabase } from "@/shared/lib/supabaseClient";
import {
  getFriends,
  sendFriendRequest,
  useFriends,
  useSentRequests,
} from "./friends-store";
import { ConfirmModal } from "@/shared/components/confirm-modal";
import { getBlockedNicknames } from "@/shared/stores/blocked-nicknames-store";
import { getReportedNicknames } from "@/shared/stores/reported-users-store";

/** Supabase users.gender 값을 'M'|'F'|null 로 정규화 (남/여, M/F 모두 허용). */
function normalizeGender(g: unknown): "M" | "F" | null {
  if (typeof g !== "string") return null;
  if (g === "F" || g.includes("여")) return "F";
  if (g === "M" || g.includes("남")) return "M";
  return null;
}

/**
 * 내 관심사 — 가입 시 localStorage.holoUser 에 저장된 값.
 * 없으면 빈 배열 (이 경우 추천은 나이 기준으로만 정렬됨).
 */
function getMyInterests(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("holoUser");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed?.interests) ? parsed.interests : [];
    const custom = typeof parsed?.customInterest === "string" ? parsed.customInterest.trim() : "";
    return custom ? [...list, custom] : list;
  } catch {
    return [];
  }
}

type Neighbor = {
  nickname: string;
  face: string;
  /** 실제 성별(Supabase users.gender). 데이터 없으면 null → 표시 안 함. */
  gender: "M" | "F" | null;
  /** 실제 관심사(Supabase users.interests). 없으면 빈 배열 → 칩 표시 안 함. */
  interests: string[];
  sharedInterests: string[];
  score: number;
};

export function NeighborhoodFindScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  // 친구 / 보낸 요청 store 를 라이브로 구독 — 버튼 상태(친구/요청중/추가)가 실시간으로 갱신됨.
  const friends = useFriends();
  const sent = useSentRequests();

  /** 친구 요청 결과 안내 모달 — 추가 직후 결과(이미 친구/이미 보냄/완료 등)에 따라 메시지 분기 */
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  // 내 관심사 — 가입 시 저장한 실제 값(localStorage.holoUser). 없으면 빈 셋
  // (예전엔 닉네임 해시로 가짜 관심사를 만들었으나, 가짜 매칭을 없애려 제거).
  const myInterestList = useMemo(() => getMyInterests(), []);
  const myInterests = useMemo(() => new Set(myInterestList), [myInterestList]);

  /**
   * 추천 후보 3명 — "마운트 시점에 친구가 아닌" 사람들 중에서만 골라 고정.
   *
   * 의도:
   * - "이미 친구인 사람은 추천 친구에 안뜨게" → 마운트 시점에 친구라면 제외.
   * - 클릭 후 "친구 요청중" / 자동 수락 후 "이미 친구중" 으로 버튼 라벨이 바뀌는 UX 를 보려면
   *   리스트 자체는 고정돼야 한다 (라이브로 friends 가 바뀐다고 카드가 사라지면 사용자가
   *   상태 변화를 인지할 수 없으니까). 그래서 useState 의 lazy init 으로 1회 계산.
   * - 후보 닉네임만 기억하고 버튼 상태는 friends/sent store 에서 실시간으로 derive.
   *
   * 후보 풀에 sent requests 는 굳이 제외하지 않는다 — 이전에 요청 보낸 사람도 카드에
   * "친구 요청중" 으로 같이 보여주는 게 일관된다.
   */
  // 추천 후보 — 실제 게시글 작성자 중 친구/차단/신고 제외. 관심사·성별은 Supabase users 의
  // '실제' 값을 조회해 사용한다(이전엔 닉네임 해시로 관심사·나이·성별을 지어냈다). 나이 정보는
  // 신뢰 가능한 출처가 없어 더 이상 표시/필터하지 않는다. 마운트 시 1회 계산해 고정.
  const [top3, setTop3] = useState<Neighbor[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const friendsAtMount = new Set(getFriends().map((f) => f.nickname));
      const blockedAtMount = getBlockedNicknames();
      const reportedAtMount = getReportedNicknames();
      const candidates = Array.from(
        new Set(postsStore.getPosts().map((p) => p.authorNickname).filter(Boolean)),
      ).filter(
        (name) =>
          name !== profile.nickname &&
          !friendsAtMount.has(name) &&
          !blockedAtMount.has(name) &&
          !reportedAtMount.has(name),
      );
      if (candidates.length === 0) {
        if (!cancelled) setTop3([]);
        return;
      }
      // 후보들의 실제 관심사/성별을 조회.
      const byNick = new Map<string, { interests: string[]; gender: "M" | "F" | null }>();
      const { data } = await supabase
        .from("users")
        .select("nickname, interests, gender")
        .in("nickname", candidates);
      (data ?? []).forEach((row: any) => {
        byNick.set(row.nickname, {
          interests: Array.isArray(row.interests) ? row.interests : [],
          gender: normalizeGender(row.gender),
        });
      });
      const neighbors = candidates
        .map<Neighbor>((name) => {
          const real = byNick.get(name);
          const interests = real?.interests ?? [];
          const sharedInterests = interests.filter((t) => myInterests.has(t));
          return {
            nickname: name,
            face: getAvatarUrl(name),
            gender: real?.gender ?? null,
            interests,
            sharedInterests,
            score: sharedInterests.length,
          };
        })
        // 공통 관심사 많은 순 → 동점이면 닉네임 순(결정적).
        .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname))
        .slice(0, 3);
      if (!cancelled) setTop3(neighbors);
    })();
    return () => {
      cancelled = true;
    };
    // 마운트 시 1회 — profile.nickname/myInterests 의 mount 시점 값 사용.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 라이브 상태 — 친구/요청중 인지 닉네임 셋. 버튼 라벨 결정에 사용. */
  const friendSet = useMemo(
    () => new Set(friends.map((f) => f.nickname)),
    [friends],
  );
  const sentSet = useMemo(
    () => new Set(sent.map((r) => r.nickname)),
    [sent],
  );

  /** 카드 한 장의 라이브 상태 — "친구 추가" / "친구 요청중" / "이미 친구중" 중 하나. */
  const buttonStateFor = (
    nickname: string,
  ): "add" | "requesting" | "already-friend" => {
    if (friendSet.has(nickname)) return "already-friend";
    if (sentSet.has(nickname)) return "requesting";
    return "add";
  };

  const handleAdd = (n: Neighbor) => {
    const r = sendFriendRequest(n.nickname);
    const msg =
      r === "already-friend"
        ? `${n.nickname}님은 이미 친구예요`
        : r === "already-sent"
          ? `${n.nickname}님에게는 이미 친구 요청을 보냈어요`
          : r === "incoming-exists"
            ? `${n.nickname}님이 먼저 친구 요청을 보냈어요. 친구 목록에서 수락해주세요`
            : r === "max-reached"
              ? `친구 정원이 가득 찼어요 (최대 30명)`
              : r === "invalid"
                ? "잘못된 요청이에요"
                : `${n.nickname}님에게 친구 요청을 보냈어요!`;
    setResultMsg(msg);
    // 버튼 상태는 useSentRequests 가 즉시 갱신되므로 별도의 로컬 state 필요 없음.
  };

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          이웃 추천
        </span>
      </header>

      {/* 인트로 카드 — 내 관심사 + 추천 인원 카운트 (최대 3명, 후보 부족하면 그 수만큼) */}
      <section className="mx-4 mt-2 overflow-hidden rounded-[18px] bg-gradient-to-br from-holo-lilac-card-2 to-[#F1E6FF] p-4">
        <p className="text-[14px] font-bold text-holo-ink">
          {top3.length > 0
            ? `나와 닮은 이웃 ${top3.length}명을 골랐어요`
            : "추천할 이웃을 찾지 못했어요"}
        </p>
        <p className="mt-1 text-[12px] text-holo-ink-3">
          관심사가 비슷하고 또래인 이웃을 우선으로 추천해드려요.
        </p>
        {/* 내 관심사 — 라벨은 한 줄, 칩은 다음 줄로 내려서 줄이 길어져도 정돈된 모습 유지. */}
        <p className="mt-3 text-[11px] text-holo-ink-3">내 관심사</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {myInterestList.slice(0, 6).map((t) => (
            <span
              key={t}
              className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-holo-purple-mid"
            >
              #{t}
            </span>
          ))}
          {myInterestList.length > 6 && (
            <span className="text-[11px] text-holo-ink-3">
              외 {myInterestList.length - 6}개
            </span>
          )}
        </div>
      </section>

      {/* 추천 카드 리스트 */}
      <section className="mx-4 mt-4 flex flex-col gap-3 pb-6">
        {top3.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-holo-line bg-white py-10 text-center text-[13px] text-holo-ink-3">
            추천할 이웃이 더 이상 없어요.
            <br />
            이미 친구이거나 요청을 보낸 분들이 많아요!
          </p>
        ) : (
          top3.map((n) => (
            <NeighborCard
              key={n.nickname}
              neighbor={n}
              buttonState={buttonStateFor(n.nickname)}
              onAdd={() => handleAdd(n)}
              onOpenProfile={() =>
                navigate(`/profile/${encodeURIComponent(n.nickname)}`)
              }
            />
          ))
        )}
      </section>

      {/* 친구 요청 결과 안내 — 공용 ConfirmModal 의 singleAction 모드 */}
      <ConfirmModal
        open={resultMsg !== null}
        message={resultMsg ?? ""}
        singleAction
        onConfirm={() => setResultMsg(null)}
      />
    </main>
  );
}

function NeighborCard({
  neighbor,
  buttonState,
  onAdd,
  onOpenProfile,
}: {
  neighbor: Neighbor;
  /** 친구 추가 버튼의 라이브 상태 — friends/sent store 변경에 즉시 반응. */
  buttonState: "add" | "requesting" | "already-friend";
  onAdd: () => void;
  onOpenProfile: () => void;
}) {
  // 프로필 얼굴이 없는 fallback 케이스 대비 — getAvatarUrl 로 시드 기반 얼굴을 보장.
  const face = neighbor.face || getAvatarUrl(neighbor.nickname);
  return (
    <article className="flex flex-col gap-3 rounded-[16px] border border-holo-line-3 bg-white p-4 shadow-[0_2px_8px_rgba(116,72,221,0.06)]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label={`${neighbor.nickname} 프로필 보기`}
          className="shrink-0"
        >
          <img
            src={face}
            alt={neighbor.nickname}
            className="h-12 w-12 rounded-full bg-holo-yellow-room object-cover"
            draggable={false}
          />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={onOpenProfile}
            className="text-left"
          >
            <span className="block truncate text-[14px] font-semibold text-holo-ink hover:underline">
              {neighbor.nickname}
            </span>
          </button>
          {/* 성별은 실제 데이터(users.gender)가 있을 때만 표시. 나이는 신뢰 출처가 없어 미표시.
              (이전엔 닉네임 해시로 나이/성별을 지어내 잘못된 정보를 노출했다.) */}
          {neighbor.gender && (
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-holo-ink-3">
              <span>{neighbor.gender === "F" ? "여성" : "남성"}</span>
            </div>
          )}
        </div>
      </div>

      {/* 관심사 칩 — 실제 데이터가 있을 때만. 겹치면 강조, 아니면 이웃의 실제 관심사.
          둘 다 없으면(데이터 미수집) 가짜를 만들지 않고 칩 행 자체를 숨긴다. */}
      {neighbor.sharedInterests.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-holo-ink-3">함께 좋아해요</span>
          {neighbor.sharedInterests.slice(0, 5).map((t) => (
            <span
              key={t}
              className="rounded-full bg-holo-lilac-card-2 px-2 py-0.5 text-[11px] font-semibold text-holo-purple-mid"
            >
              #{t}
            </span>
          ))}
        </div>
      ) : neighbor.interests.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-holo-ink-3">관심사</span>
          {neighbor.interests.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full bg-holo-surface-2 px-2 py-0.5 text-[11px] text-holo-ink-2"
            >
              #{t}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex-1 rounded-full border border-holo-line py-2 text-[13px] font-medium text-holo-ink"
        >
          프로필 보기
        </button>
        <button
          type="button"
          onClick={onAdd}
          // "친구 추가" 상태일 때만 클릭 가능. 요청 보낸 직후 또는 이미 친구면 disabled.
          disabled={buttonState !== "add"}
          className={`flex-1 rounded-full py-2 text-[13px] font-semibold transition ${
            buttonState === "add"
              ? "bg-holo-purple-mid text-white"
              : "bg-holo-line-3 text-holo-ink-3"
          }`}
        >
          {buttonState === "add"
            ? "친구 추가"
            : buttonState === "requesting"
              ? "친구 요청중"
              : "이미 친구중"}
        </button>
      </div>
    </article>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
