import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProfile } from "@/shared/hooks/use-profile";
import { getAvatarUrl } from "@/features/chat/avatars";
import {
  MAX_FRIENDS,
  blockFriendById,
  removeFriendById,
  unblockFriendById,
  useBlocked,
  useFriends,
  useReceivedRequests,
  useSentRequests,
  type Friend,
} from "./friends-store";
import { ConfirmModal } from "@/shared/components/confirm-modal";
import { markReported } from "@/shared/stores/reported-users-store";
import { markBlocked } from "@/shared/stores/blocked-nicknames-store";

type Mode = "view" | "block" | "report" | "delete";

export function FriendsScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const friends = useFriends();
  const blocked = useBlocked();
  const receivedRequests = useReceivedRequests();
  const sentRequests = useSentRequests();
  const [showMenu, setShowMenu] = useState(false);
  const [mode, setMode] = useState<Mode>("view");
  const [showBlockedView, setShowBlockedView] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState<Friend | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Friend | null>(null);
  const [reportTarget, setReportTarget] = useState<Friend | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  };

  const handleBlock = () => {
    if (!confirmBlock) return;
    blockFriendById(confirmBlock.id);
    // 닉네임 단위 차단 set 에도 함께 push — 이웃 추천 등 노출 후보 필터에서 단일 출처로 쓰기 위함.
    markBlocked(confirmBlock.nickname);
    setConfirmBlock(null);
    showToast("차단되었습니다.");
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    removeFriendById(confirmDelete.id);
    setConfirmDelete(null);
    showToast("친구가 삭제되었습니다.");
  };

  const handleUnblock = (id: string) => {
    const ok = unblockFriendById(id);
    if (ok) {
      showToast("차단이 해제되었습니다.");
    } else {
      showToast("친구 정원(30명)이 가득 찼어요. 기존 친구를 정리해 주세요.");
    }
  };

  const handleSubmitReport = () => {
    if (!reportTarget || !reportReason.trim()) return;
    removeFriendById(reportTarget.id);
    // 신고된 닉네임은 영속 set 에도 남겨, 이웃 추천 등 노출 후보에서 자동으로 빠진다.
    markReported(reportTarget.nickname);
    setReportTarget(null);
    setReportReason("");
    showToast("신고가 접수되었습니다.");
  };

  const visibleFriends = friends;

  return (
    <main className="relative flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-holo-line-3 px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="뒤로"
            onClick={() => (mode === "view" ? navigate(-1) : setMode("view"))}
          >
            <BackIcon />
          </button>
          <span className="text-[16px] font-semibold text-holo-ink">
            {mode === "block"
              ? "차단하기"
              : mode === "report"
                ? "신고하기"
                : mode === "delete"
                  ? "삭제하기"
                  : "내 친구"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {mode === "view" && (
            <>
              <Link to="/mypage/friends/add" aria-label="친구 추가">
                <PlusIcon />
              </Link>
              <button type="button" aria-label="더보기" onClick={() => setShowMenu(true)}>
                <MoreIcon />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex items-center justify-between border-b border-holo-line-3 px-4 pb-3 pt-3">
        <span className="flex items-center gap-2 text-[14px] text-holo-ink">
          <PeopleIcon />
          {mode === "block"
            ? "차단할 친구를 선택해 주세요"
            : mode === "report"
              ? "신고할 친구를 선택해 주세요"
              : mode === "delete"
                ? "삭제할 친구를 선택해 주세요"
                : "친구목록"}
          {mode === "view" && (
            <span
              className={`text-[12px] ${
                friends.length >= MAX_FRIENDS
                  ? "font-semibold text-holo-error"
                  : "text-holo-ink-3"
              }`}
            >
              {friends.length}/{MAX_FRIENDS}
            </span>
          )}
        </span>
        {mode === "view" && (
          <span className="text-[12px] text-holo-ink-3">내 코드 : {profile.friendCode}</span>
        )}
      </div>

      {mode === "view" &&
        (receivedRequests.length > 0 || sentRequests.length > 0) && (
          <button
            type="button"
            onClick={() => navigate("/mypage/friends/requests")}
            className="mx-4 mt-3 flex items-center justify-between rounded-holo-card bg-holo-lilac-card-2 px-4 py-3 text-left active:opacity-80"
          >
            <span className="flex items-center gap-2">
              <span className="text-[18px]">🤝</span>
              <span className="flex flex-col">
                <span className="text-[13px] font-semibold text-holo-ink">
                  친구 요청 확인
                </span>
                <span className="text-[11px] text-holo-ink-3">
                  받은 {receivedRequests.length} · 보낸 {sentRequests.length}
                </span>
              </span>
            </span>
            <span className="text-holo-purple-mid">
              <ChevronRightIcon />
            </span>
          </button>
        )}

      {visibleFriends.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-[14px] text-holo-ink-3">
          {mode === "view" ? "" : "친구 목록이 없습니다"}
        </div>
      ) : (
        <ul className="grid flex-1 auto-rows-min grid-cols-2 gap-x-4 gap-y-[16px] overflow-y-auto px-4 pb-3 pt-3">
          {visibleFriends.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => {
                  if (mode === "block") setConfirmBlock(f);
                  else if (mode === "report") setReportTarget(f);
                  else if (mode === "delete") setConfirmDelete(f);
                  else navigate(`/profile/${encodeURIComponent(f.nickname)}`);
                }}
                className="flex w-full items-center gap-2 text-left"
              >
                <span className="relative">
                  <img
                    src={getAvatarUrl(f.nickname)}
                    alt=""
                    className="block h-12 w-12 rounded-full object-cover"
                    style={{ backgroundColor: f.avatarBg }}
                  />
                  {mode === "block" && (
                    <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-holo-error text-white">
                      <MinusIcon />
                    </span>
                  )}
                  {mode === "report" && (
                    <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-holo-purple-mid text-white">
                      <FlagMini />
                    </span>
                  )}
                  {mode === "delete" && (
                    <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-holo-error text-white">
                      <MinusIcon />
                    </span>
                  )}
                </span>
                <span className="flex-1 text-[12px] text-holo-ink">{f.nickname}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Bottom sheet: more menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="w-full max-w-[360px] rounded-t-[16px] bg-white px-4 pb-6 pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-holo-line" />
            <button
              type="button"
              onClick={() => {
                setMode("delete");
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-2 py-3 text-[14px] text-holo-ink"
            >
              <TrashIcon /> 삭제하기
            </button>
            <div className="h-px bg-holo-line-3" />
            <button
              type="button"
              onClick={() => {
                setMode("block");
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-2 py-3 text-[14px] text-holo-ink"
            >
              <BlockIcon /> 차단하기
            </button>
            <div className="h-px bg-holo-line-3" />
            <button
              type="button"
              onClick={() => {
                setMode("report");
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-2 py-3 text-[14px] text-holo-ink"
            >
              <FlagIcon /> 신고하기
            </button>
            <div className="h-px bg-holo-line-3" />
            <button
              type="button"
              onClick={() => {
                setShowBlockedView(true);
                setShowMenu(false);
              }}
              className="flex w-full items-center justify-between gap-2 py-3 text-[14px] text-holo-ink"
            >
              <span className="flex items-center gap-2">
                <BlockIcon /> 차단한 친구
              </span>
              <span className="text-[12px] text-holo-ink-3">{blocked.length}명</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      <ConfirmModal
        open={confirmDelete !== null}
        message={
          <>
            <span className="font-semibold">{confirmDelete?.nickname}</span> 님을
            <br />
            친구 목록에서 삭제할까요?
          </>
        }
        description="삭제하면 친구 목록에서 사라집니다."
        confirmLabel="삭제"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />

      {/* Confirm block */}
      <ConfirmModal
        open={confirmBlock !== null}
        message={
          <>
            <span className="font-semibold">{confirmBlock?.nickname}</span> 님을
            <br />
            차단하시겠습니까?
          </>
        }
        description="차단된 친구는 친구 목록에서 사라집니다."
        confirmLabel="차단"
        onCancel={() => setConfirmBlock(null)}
        onConfirm={handleBlock}
      />

      {/* Report modal — textarea 가 필요해 ConfirmModal 의 children 슬롯을 활용 */}
      <ConfirmModal
        open={reportTarget !== null}
        message={`${reportTarget?.nickname ?? ""} 님 신고`}
        description="신고 사유를 입력해 주세요."
        confirmLabel="신고"
        onCancel={() => {
          setReportTarget(null);
          setReportReason("");
        }}
        onConfirm={handleSubmitReport}
      >
        <textarea
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          placeholder="예: 욕설, 스팸, 부적절한 내용..."
          rows={4}
          className="w-full resize-none rounded-[10px] border border-holo-line p-3 text-[13px] outline-none placeholder:text-holo-ink-3 focus:border-holo-purple-mid"
        />
      </ConfirmModal>

      {/* Blocked friends view */}
      {showBlockedView && (
        <div className="fixed inset-0 z-40 flex flex-col bg-white">
          <header className="flex h-12 shrink-0 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="뒤로"
                onClick={() => setShowBlockedView(false)}
              >
                <BackIcon />
              </button>
              <span className="text-[16px] font-semibold text-holo-ink">차단한 친구</span>
            </div>
          </header>
          {blocked.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-[14px] text-holo-ink-3">
              차단한 친구가 없습니다
            </div>
          ) : (
            <ul className="flex flex-1 flex-col divide-y divide-holo-line-3 overflow-y-auto px-4">
              {blocked.map((f) => (
                <li key={f.id} className="flex items-center gap-3 py-3">
                  <img
                    src={getAvatarUrl(f.nickname)}
                    alt=""
                    className="block h-10 w-10 rounded-full object-cover"
                    style={{ backgroundColor: f.avatarBg }}
                  />
                  <span className="flex-1 text-[14px] text-holo-ink">{f.nickname}</span>
                  <button
                    type="button"
                    onClick={() => handleUnblock(f.id)}
                    className="rounded-full border border-holo-purple-mid px-3 py-1 text-[12px] font-semibold text-holo-purple-mid"
                  >
                    차단해제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6">
          <div className="rounded-full bg-black/80 px-4 py-2 text-[13px] text-white">
            {toast}
          </div>
        </div>
      )}
    </main>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1A1A1A" aria-hidden>
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}
function MinusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" aria-hidden>
      <path d="M5 12h14" />
    </svg>
  );
}
function FlagMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 21V4l14 4-7 3 7 4z" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1A1A1A" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    </svg>
  );
}
function BlockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.93 4.93 14.14 14.14" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 21V4l14 4-7 3 7 4z" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
    </svg>
  );
}
