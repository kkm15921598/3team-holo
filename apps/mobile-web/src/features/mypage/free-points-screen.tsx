import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDailyCount, tryDailyEarn } from "@/features/myroom/myroom-store";
import { useProfile } from "@/shared/hooks/use-profile";
import { postsStore } from "@/features/board/posts-store";
import { useVerification } from "@/shared/stores/verification-store";

type Mission = {
  id: string;
  category: "daily" | "onetime" | "ongoing";
  label: string;
  hint: string;
  reward: number;
  emoji: string;
};

const DAILY: Mission[] = [
  { id: "login",   category: "daily", label: "매일 접속", hint: "하루 1회 자동 적립",       reward: 5, emoji: "📅" },
  { id: "ad",      category: "daily", label: "광고 시청", hint: "30초 광고 1편당",          reward: 5, emoji: "🎬" },
  { id: "post",    category: "daily", label: "글쓰기",    hint: "하루 최대 30P",            reward: 5, emoji: "✏️" },
  { id: "comment", category: "daily", label: "댓글 달기", hint: "하루 최대 10P",            reward: 1, emoji: "💬" },
];

const ONETIME: Mission[] = [
  { id: "verify",     category: "onetime", label: "동네 인증",  hint: "현재 위치로 동네 인증하기", reward: 10, emoji: "📍" },
  { id: "first-post", category: "onetime", label: "첫 글 작성", hint: "어떤 게시판이든 OK",       reward: 20, emoji: "🎯" },
];

const ONGOING: Mission[] = [
  { id: "invite", category: "ongoing", label: "친구 초대", hint: "초대한 친구 가입 시", reward: 50, emoji: "💌" },
  { id: "meeting", category: "ongoing", label: "단기 모임 참여", hint: "모임 1회 완료 시", reward: 20, emoji: "👥" },
  { id: "long-meeting", category: "ongoing", label: "장기 모임 참여", hint: "모임 1회 완료 시", reward: 20, emoji: "🤝" },
];

/** 데일리 적립 cap — myroom-store 의 tryDailyEarn 키와 일치해야 함 */
const DAILY_CAP = { ad: 5, post: 6, comment: 10 } as const;

/** 매일 가능 미션 합산 최대치 = 5(접속) + 25(광고) + 30(글) + 10(댓글) = 70P */
const MAX_DAILY_POINTS = 70;

export function FreePointsScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const verification = useVerification();

  // postsStore 변경(새 글 작성 등)에 반응하여 "첫 글 작성" 미션 자동 완료 판정
  const [posts, setPosts] = useState(postsStore.getPosts);
  useEffect(() => {
    return postsStore.subscribe(() => setPosts(postsStore.getPosts()));
  }, []);
  const hasAuthoredPost = useMemo(
    () => posts.some((p) => p.authorNickname === profile.nickname),
    [posts, profile.nickname],
  );

  // 매일 가능 미션의 일일 진행도 — myroom-store 의 일일 cap 카운터 사용
  const dailyDone = {
    login: getDailyCount("login"),
    ad: getDailyCount("ad"),
    post: getDailyCount("post"),
    comment: getDailyCount("comment"),
  };

  // 동네 인증 완료 여부 — verification-store 의 캐노니컬 boolean 사용.
  // (이전엔 verifiedRegion 문자열의 truthy 여부를 봤지만, regionVerified 가 의미상
  //  더 명확하고 향후 두 필드가 어긋나는 상황(예: 동네 라벨만 비우고 재인증)에도 안전.)
  const isRegionVerified = verification.regionVerified;

  const [toast, setToast] = useState<string | null>(null);
  const [showAd, setShowAd] = useState<{ remaining: number } | null>(null);
  // 새로 적립할 때 화면을 강제 리렌더
  const [refreshTick, setRefreshTick] = useState(0);
  void refreshTick;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const claimLogin = () => {
    const ok = tryDailyEarn("login", 1, 5, { title: "매일 접속" });
    if (!ok) {
      showToast("이미 적립됐어요!");
      return;
    }
    setRefreshTick((t) => t + 1);
    showToast("출석 보상 +5P 적립");
  };

  const handleAd = () => {
    if (dailyDone.ad >= DAILY_CAP.ad) {
      showToast("오늘 광고 시청은 모두 완료했어요!");
      return;
    }
    setShowAd({ remaining: 30 });
    const interval = setInterval(() => {
      setShowAd((prev) => {
        if (!prev) {
          clearInterval(interval);
          return null;
        }
        if (prev.remaining <= 1) {
          clearInterval(interval);
          const ok = tryDailyEarn("ad", DAILY_CAP.ad, 5, {
            title: "광고 시청",
            note: `${getDailyCount("ad") + 1}/${DAILY_CAP.ad}`,
          });
          setRefreshTick((t) => t + 1);
          if (ok) showToast("광고 시청 완료! +5P 적립");
          else showToast("오늘 광고 시청은 모두 완료했어요!");
          return null;
        }
        return { remaining: prev.remaining - 1 };
      });
    }, 1000);
  };

  const handleVerify = () => {
    if (isRegionVerified) {
      showToast("이미 인증된 동네예요.");
      return;
    }
    navigate("/mypage/verify-region");
  };

  const handleInvite = () => {
    navigate("/mypage/friends/add");
  };

  const handleMeeting = () => {
    navigate("/board");
  };

  const handleFirstPost = () => {
    if (hasAuthoredPost) return;
    navigate("/board/write");
  };

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          무료 포인트
        </span>
      </header>

      {/* 헤더 카드 */}
      <section className="mx-4 mt-2 rounded-holo-card bg-holo-gradient-soft p-4 text-white">
        <p className="text-[12px] opacity-90">오늘 모을 수 있는 포인트</p>
        <p className="mt-1 text-[28px] font-bold">최대 {MAX_DAILY_POINTS}P</p>
        <p className="mt-1 text-[12px] opacity-90">
          미션을 완료하고 포인트를 받아가세요!
        </p>
      </section>

      {/* 매일 가능 */}
      <section className="mt-4 px-4">
        <SectionTitle title="매일 가능" hint="자정에 초기화돼요" />
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          {/* 매일 접속 — 클릭 시 +5P */}
          <MissionRow
            m={DAILY[0]}
            done={dailyDone.login >= 1}
            label={dailyDone.login >= 1 ? "완료" : "받기"}
            onClick={claimLogin}
          />
          {/* 광고 시청 — 5회 까지 */}
          <MissionRow
            m={DAILY[1]}
            progress={{ done: dailyDone.ad, cap: DAILY_CAP.ad }}
            done={dailyDone.ad >= DAILY_CAP.ad}
            label={dailyDone.ad >= DAILY_CAP.ad ? "완료" : "시청"}
            onClick={handleAd}
          />
          {/* 글쓰기 — 6회 까지 (board-write-screen 에서 자동 적립) */}
          <MissionRow
            m={DAILY[2]}
            progress={{ done: dailyDone.post, cap: DAILY_CAP.post }}
            done={dailyDone.post >= DAILY_CAP.post}
            label="쓰기"
            onClick={() => navigate("/board/write")}
          />
          {/* 댓글 달기 — 10회 까지 (board-detail-screen 에서 자동 적립) */}
          <MissionRow
            m={DAILY[3]}
            progress={{ done: dailyDone.comment, cap: DAILY_CAP.comment }}
            done={dailyDone.comment >= DAILY_CAP.comment}
            label="작성"
            onClick={() => navigate("/board")}
          />
        </ul>
      </section>

      {/* 일회성 */}
      <section className="mt-4 px-4">
        <SectionTitle title="일회성 적립" hint="딱 한 번만 받을 수 있어요" />
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          {/* 동네 인증 / 첫 글 작성 — 완료 시 둘 다 동일하게 "완료" 회색 비활성 버튼으로 표시 */}
          <MissionRow
            m={ONETIME[0]}
            done={isRegionVerified}
            label={isRegionVerified ? "완료" : "인증"}
            onClick={handleVerify}
          />
          <MissionRow
            m={ONETIME[1]}
            done={hasAuthoredPost}
            label={hasAuthoredPost ? "완료" : "쓰기"}
            onClick={handleFirstPost}
          />
        </ul>
      </section>

      {/* 활동 적립 */}
      <section className="mt-4 px-4 pb-4">
        <SectionTitle title="활동 적립" hint="할 때마다 계속 적립" />
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          <MissionRow m={ONGOING[0]} label="초대" onClick={handleInvite} />
          <MissionRow m={ONGOING[1]} label="모임" onClick={handleMeeting} />
          <MissionRow m={ONGOING[2]} label="모임" onClick={handleMeeting} />
        </ul>

        <p className="mt-3 text-[11px] leading-5 text-holo-ink-3">
          · 광고/설문 보상은 부정 시청이 감지되면 지급되지 않을 수 있어요.
          <br />· 적립된 포인트는 즉시 보유 포인트에 반영돼요.
        </p>
      </section>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-6">
          <div className="rounded-full bg-holo-ink/90 px-4 py-2 text-[13px] text-white">
            {toast}
          </div>
        </div>
      )}

      {/* Ad Modal */}
      {showAd && (
        <div className="fixed inset-0 z-40 flex flex-col bg-black/90 text-white">
          <div className="flex items-center justify-between px-4 py-3 text-[12px] text-white/70">
            <span>광고 시청 중</span>
            <span>{String(showAd.remaining).padStart(2, "0")}초</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-white/10 text-[64px]">
              🎬
            </div>
            <p className="text-[18px] font-semibold">샘플 광고</p>
            <p className="text-[13px] text-white/70">
              광고가 끝나면 5P가 적립돼요.
            </p>
            <div className="mt-4 h-1 w-full max-w-[240px] overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-holo-purple-mid transition-[width]"
                style={{
                  width: `${((30 - showAd.remaining) / 30) * 100}%`,
                }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAd(null)}
            className="mb-6 self-center rounded-full border border-white/30 px-6 py-2 text-[13px] text-white/70"
          >
            건너뛰기 (보상 없음)
          </button>
        </div>
      )}
    </main>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between px-1">
      <span className="text-[13px] font-semibold text-holo-ink">{title}</span>
      {hint && <span className="text-[11px] text-holo-ink-3">{hint}</span>}
    </div>
  );
}

function MissionRow({
  m,
  progress,
  done,
  label,
  onClick,
}: {
  m: Mission;
  progress?: { done: number; cap: number };
  done?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-holo-lilac-card-2 text-[20px]">
        {m.emoji}
      </span>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-holo-ink">{m.label}</span>
          <span className="rounded-full bg-holo-lilac-card px-2 py-0.5 text-[11px] font-semibold text-holo-purple-mid">
            +{m.reward}P
          </span>
        </div>
        <span className="text-[12px] text-holo-ink-3">
          {m.hint}
          {progress && (
            <>
              {" · "}
              <span
                className={
                  progress.done >= progress.cap
                    ? "text-holo-purple-mid"
                    : "text-holo-ink-2"
                }
              >
                {progress.done}/{progress.cap}
              </span>
            </>
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={done}
        className={`h-8 shrink-0 rounded-full px-3 text-[12px] font-semibold transition ${
          done
            ? "bg-holo-line-3 text-holo-ink-3"
            : "bg-holo-purple-mid text-white active:scale-[0.98]"
        }`}
      >
        {label}
      </button>
    </li>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
