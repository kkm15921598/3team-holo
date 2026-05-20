import { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * 고객지원(문의하기) 페이지.
 *  - 상단에 1:1 문의 / 자주 묻는 질문 2개 탭
 *  - 1:1 문의: 새 문의 작성 폼 + 내 문의 내역(상태: 답변 대기 / 답변 완료)
 *  - 자주 묻는 질문: 카테고리 필터 + 펼침/접힘 아코디언 형식
 *
 * mock 환경 — 문의 전송은 토스트로만 시뮬레이션, 실 서버 연동은 향후 추가.
 */

type TabKey = "inquiry" | "qa";

type InquiryCategory = "계정" | "모임/게시판" | "채팅" | "포인트" | "신고/차단" | "기타";
const INQUIRY_CATEGORIES: readonly InquiryCategory[] = [
  "계정",
  "모임/게시판",
  "채팅",
  "포인트",
  "신고/차단",
  "기타",
] as const;

type InquiryStatus = "답변 대기" | "답변 완료";
type Inquiry = {
  id: string;
  category: InquiryCategory;
  title: string;
  content: string;
  status: InquiryStatus;
  createdAt: string; // YYYY.MM.DD
  reply?: string;
};

// FAQ 데이터 — 카테고리별로 묶음.
type QaItem = {
  id: string;
  category: InquiryCategory;
  question: string;
  answer: string;
};

const QA_ITEMS: QaItem[] = [
  {
    id: "qa-acc-1",
    category: "계정",
    question: "닉네임은 어떻게 변경하나요?",
    answer:
      "마이페이지 → 프로필 편집 → 닉네임 영역에서 새 닉네임을 입력하고 중복 확인을 거쳐 완료를 누르면 변경됩니다. 한글과 공백 포함 최대 10자까지 사용 가능해요.",
  },
  {
    id: "qa-acc-2",
    category: "계정",
    question: "비밀번호를 잊어버렸어요.",
    answer:
      "로그인 화면 하단의 \"비밀번호 찾기\" 를 눌러주세요. 가입 시 입력한 휴대폰 번호로 인증번호를 받아 본인 확인을 거치면 새 비밀번호를 설정할 수 있어요.",
  },
  {
    id: "qa-acc-3",
    category: "계정",
    question: "프로필 이미지(캐릭터) 를 바꾸고 싶어요.",
    answer:
      "마이페이지 → 프로필 편집 → 프로필 이미지 섹션에서 원하는 캐릭터를 선택하고 완료를 누르면 즉시 반영돼요.",
  },
  {
    id: "qa-meet-1",
    category: "모임/게시판",
    question: "모임에 참여하려면 어떻게 하나요?",
    answer:
      "게시판에서 관심 있는 모집 글을 연 뒤 \"함께하기\" 버튼을 누르면 모임에 참여돼요. 자동으로 모임 전용 채팅방에도 참가되니 일정과 장소 정보를 확인하세요.",
  },
  {
    id: "qa-meet-2",
    category: "모임/게시판",
    question: "참여한 모임을 취소할 수 있나요?",
    answer:
      "모임 글 상세에서 \"함께하기\" 버튼을 다시 누르면 취소 확인 후 모임에서 나옵니다. 채팅방에서도 자동으로 퇴장 처리돼요.",
  },
  {
    id: "qa-meet-3",
    category: "모임/게시판",
    question: "내가 만든 모임의 인원을 변경할 수 있나요?",
    answer:
      "게시글 우상단 ⋮ 메뉴 → \"수정\" 으로 들어가 인원 수를 조정할 수 있어요. 단, 이미 정원을 채운 경우엔 줄일 수 없습니다.",
  },
  {
    id: "qa-chat-1",
    category: "채팅",
    question: "채팅방에서 사진을 보낼 수 있나요?",
    answer:
      "입력창 좌측 + 버튼을 누르면 카메라 / 사진 첨부 메뉴가 뜹니다. 갤러리에서 선택하거나 즉석에서 촬영해서 보낼 수 있어요. 5MB 이하 이미지만 첨부 가능합니다.",
  },
  {
    id: "qa-chat-2",
    category: "채팅",
    question: "채팅방을 나가면 모임에서도 빠지나요?",
    answer:
      "네, 모임 채팅방을 나가면 해당 모임에서도 자동으로 참여가 취소돼요. 다시 참여하시려면 게시판에서 \"함께하기\" 를 다시 눌러주세요.",
  },
  {
    id: "qa-point-1",
    category: "포인트",
    question: "포인트는 어떻게 얻을 수 있나요?",
    answer:
      "글 작성(+5P), 댓글 작성(+1P), 모임 참여(+10P), 동네 인증(+10P), 출석 체크(+5P~) 등 활동을 통해 적립할 수 있어요. 각 항목마다 일일 적립 한도가 있어요.",
  },
  {
    id: "qa-point-2",
    category: "포인트",
    question: "포인트는 어디에 사용하나요?",
    answer:
      "마이룸 꾸미기에서 가구·아이템 구매에 사용할 수 있어요. 향후 더 다양한 사용처가 추가될 예정입니다.",
  },
  {
    id: "qa-report-1",
    category: "신고/차단",
    question: "부적절한 사용자나 글을 어떻게 신고하나요?",
    answer:
      "게시글 우상단 ⋮ 메뉴 또는 프로필 페이지에서 \"신고\" 버튼을 누르면 됩니다. 운영팀이 검토 후 조치해드려요.",
  },
  {
    id: "qa-report-2",
    category: "신고/차단",
    question: "특정 사용자를 차단하면 어떻게 되나요?",
    answer:
      "차단한 사용자의 게시글·댓글·메시지가 더 이상 노출되지 않습니다. 마이페이지 → 개인정보 → 차단 목록에서 언제든 해제할 수 있어요.",
  },
  {
    id: "qa-etc-1",
    category: "기타",
    question: "탈퇴는 어떻게 하나요?",
    answer:
      "마이페이지 → 계정관리 → 회원 탈퇴 메뉴에서 진행할 수 있어요. 탈퇴 시 모든 데이터가 삭제되며 복구되지 않으니 신중히 결정해주세요.",
  },
  {
    id: "qa-etc-2",
    category: "기타",
    question: "이용 가능 연령은 어떻게 되나요?",
    answer: "HOLO 는 만 19세 이상부터 이용 가능합니다. 가입 시 본인 인증으로 자동 확인돼요.",
  },
];

export function HelpScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("inquiry");

  return (
    <main className="flex flex-1 flex-col bg-holo-surface-2">
      <header className="flex h-12 shrink-0 items-center bg-white px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">문의하기</span>
      </header>

      {/* 탭 — 1:1 문의 / 자주 묻는 질문 */}
      <div className="flex shrink-0 gap-2 bg-white px-4 pb-3 pt-2">
        <TabButton active={tab === "inquiry"} onClick={() => setTab("inquiry")}>
          1:1 문의
        </TabButton>
        <TabButton active={tab === "qa"} onClick={() => setTab("qa")}>
          자주 묻는 질문
        </TabButton>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tab === "inquiry" ? <InquiryTab /> : <QaTab />}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 flex-1 rounded-full text-[14px] font-semibold transition ${
        active
          ? "bg-holo-purple-mid text-white shadow-[0_2px_6px_rgba(116,72,221,0.25)]"
          : "border border-holo-line text-holo-ink-3 active:bg-holo-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// 1:1 문의 탭
// ────────────────────────────────────────────────────────────
function InquiryTab() {
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  };

  const handleSubmit = (data: Omit<Inquiry, "id" | "status" | "createdAt">) => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const newItem: Inquiry = {
      ...data,
      id: `iq-${Date.now()}`,
      status: "답변 대기",
      createdAt: `${yy}.${mm}.${dd}`,
    };
    setInquiries((prev) => [newItem, ...prev]);
    setShowForm(false);
    showToast("문의가 접수되었어요. 영업일 기준 1~3일 이내 답변드릴게요.");
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 안내 박스 */}
      <section className="rounded-holo-input bg-holo-lilac-soft/40 p-4">
        <p className="text-[13px] font-semibold text-holo-purple-mid">
          1:1 문의는 영업일 기준 1~3일 안에 답변드려요.
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-holo-ink-3">
          긴급한 신고 / 안전 문제는 게시글의 ⋮ 메뉴를 통해 직접 신고해주세요.
        </p>
      </section>

      {/* 새 문의 작성 버튼 */}
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="flex items-center justify-center gap-2 rounded-full bg-holo-purple-mid py-3 text-[14px] font-semibold text-white active:opacity-90"
      >
        <PlusIcon /> 새 문의 작성
      </button>

      {/* 내 문의 내역 */}
      <section className="mt-2">
        <p className="px-1 text-[14px] font-semibold text-holo-ink">
          내 문의 내역 ({inquiries.length})
        </p>
        {inquiries.length === 0 ? (
          <div className="mt-3 rounded-holo-input bg-white py-10 text-center shadow-holo-card">
            <p className="text-[13px] text-holo-ink-3">
              아직 문의 내역이 없어요.
            </p>
          </div>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {inquiries.map((iq) => {
              const open = openId === iq.id;
              return (
                <li
                  key={iq.id}
                  className="overflow-hidden rounded-holo-input bg-white shadow-holo-card"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : iq.id)}
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left active:bg-holo-surface-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-[6px] bg-holo-lilac-soft px-1.5 py-0.5 text-[11px] font-medium text-holo-purple-mid">
                        {iq.category}
                      </span>
                      <StatusBadge status={iq.status} />
                      <span className="ml-auto text-[11px] text-holo-ink-3">
                        {iq.createdAt}
                      </span>
                    </div>
                    <p className="mt-1 text-[14px] font-medium text-holo-ink">
                      {iq.title}
                    </p>
                  </button>
                  {open && (
                    <div className="border-t border-holo-line-3 bg-holo-surface-2/40 px-4 py-3">
                      <p className="text-[11px] font-semibold text-holo-ink-3">
                        문의 내용
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-holo-ink-2">
                        {iq.content}
                      </p>
                      {iq.reply && (
                        <>
                          <p className="mt-3 text-[11px] font-semibold text-holo-purple-mid">
                            운영팀 답변
                          </p>
                          <p className="mt-1 text-[13px] leading-relaxed text-holo-ink">
                            {iq.reply}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {showForm && (
        <InquiryForm onClose={() => setShowForm(false)} onSubmit={handleSubmit} />
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6">
          <div className="rounded-full bg-black/80 px-4 py-2 text-[13px] text-white">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: InquiryStatus }) {
  const styles =
    status === "답변 완료"
      ? "bg-holo-purple-mid/10 text-holo-purple-mid"
      : "bg-holo-line-2 text-holo-ink-3";
  return (
    <span
      className={`rounded-[6px] px-1.5 py-0.5 text-[11px] font-medium ${styles}`}
    >
      {status}
    </span>
  );
}

function InquiryForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: Omit<Inquiry, "id" | "status" | "createdAt">) => void;
}) {
  const [category, setCategory] = useState<InquiryCategory>("기타");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const canSubmit = title.trim().length > 0 && content.trim().length > 0;

  return (
    <div className="fixed left-1/2 top-0 z-[1100] flex h-[100dvh] w-full max-w-[360px] -translate-x-1/2 flex-col bg-black/40">
      <div className="mt-auto flex h-[85%] flex-col overflow-hidden rounded-t-2xl bg-white">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-holo-line px-4">
          <button
            type="button"
            onClick={onClose}
            className="text-[14px] text-holo-ink-2"
          >
            취소
          </button>
          <span className="text-[14px] font-semibold text-holo-ink">
            새 문의 작성
          </span>
          <button
            type="button"
            onClick={() => canSubmit && onSubmit({ category, title: title.trim(), content: content.trim() })}
            disabled={!canSubmit}
            className="text-[14px] font-semibold text-holo-purple-mid disabled:opacity-40"
          >
            보내기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="text-[13px] font-semibold text-holo-ink">문의 유형</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INQUIRY_CATEGORIES.map((c) => {
              const on = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3 py-1.5 text-[13px] ${
                    on
                      ? "border-2 border-holo-purple-mid bg-holo-lilac-soft/40 font-semibold text-holo-purple-mid"
                      : "border-holo-line text-holo-ink-2"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-[13px] font-semibold text-holo-ink">제목</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 40))}
            maxLength={40}
            placeholder="문의 제목을 입력해 주세요"
            className="mt-2 h-[44px] w-full rounded-holo-input border border-holo-line px-4 text-[14px] outline-none placeholder:text-holo-ink-3 focus:border-2 focus:border-holo-purple-mid"
          />
          <p className="mt-1 text-right text-[11px] text-holo-ink-3">
            {title.length}/40
          </p>

          <p className="mt-3 text-[13px] font-semibold text-holo-ink">내용</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 1000))}
            maxLength={1000}
            placeholder="문의하실 내용을 자세히 작성해주세요. (오류 발생 시 일시·기기·OS 도 함께 알려주시면 빠른 답변에 도움이 돼요.)"
            rows={8}
            className="mt-2 w-full rounded-holo-input border border-holo-line px-4 py-3 text-[14px] leading-relaxed outline-none placeholder:text-holo-ink-3 focus:border-2 focus:border-holo-purple-mid"
          />
          <p className="mt-1 text-right text-[11px] text-holo-ink-3">
            {content.length}/1000
          </p>

          <p className="mt-4 rounded-holo-input bg-holo-surface-2 p-3 text-[11px] leading-relaxed text-holo-ink-3">
            제출하신 문의 내용과 닉네임·계정 정보는 답변을 위한 용도로만 사용되며,
            처리 완료 후 안전하게 보관됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 자주 묻는 질문 탭
// ────────────────────────────────────────────────────────────
function QaTab() {
  const [activeCat, setActiveCat] = useState<InquiryCategory | "전체">("전체");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = QA_ITEMS.filter(
    (q) => activeCat === "전체" || q.category === activeCat,
  );

  return (
    <div className="flex flex-col gap-3">
      {/* 카테고리 칩 */}
      <div className="no-scrollbar -mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 py-1 [&::-webkit-scrollbar]:hidden">
        <CategoryChip
          active={activeCat === "전체"}
          onClick={() => setActiveCat("전체")}
        >
          전체
        </CategoryChip>
        {INQUIRY_CATEGORIES.map((c) => (
          <CategoryChip
            key={c}
            active={activeCat === c}
            onClick={() => setActiveCat(c)}
          >
            {c}
          </CategoryChip>
        ))}
      </div>

      {/* FAQ 리스트 — 클릭 시 답변 펼침 */}
      <ul className="flex flex-col gap-2">
        {filtered.map((q) => {
          const open = openId === q.id;
          return (
            <li
              key={q.id}
              className="overflow-hidden rounded-holo-input bg-white shadow-holo-card"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : q.id)}
                className="flex w-full items-start gap-2 px-4 py-3.5 text-left active:bg-holo-surface-2"
              >
                <span className="mt-0.5 text-[14px] font-bold text-holo-purple-mid">
                  Q.
                </span>
                <span className="flex-1 text-[14px] font-medium text-holo-ink">
                  {q.question}
                </span>
                <ChevronIcon open={open} />
              </button>
              {open && (
                <div className="flex items-start gap-2 border-t border-holo-line-3 bg-holo-surface-2/40 px-4 py-3.5">
                  <span className="mt-0.5 text-[14px] font-bold text-holo-ink-3">
                    A.
                  </span>
                  <p className="flex-1 text-[13px] leading-relaxed text-holo-ink-2">
                    {q.answer}
                  </p>
                </div>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="rounded-holo-input bg-white py-10 text-center shadow-holo-card">
            <p className="text-[13px] text-holo-ink-3">
              이 카테고리에는 질문이 없어요.
            </p>
          </li>
        )}
      </ul>

      {/* 문제 해결 안 됐을 때 안내 */}
      <section className="mt-2 rounded-holo-input bg-holo-lilac-soft/40 p-4 text-center">
        <p className="text-[13px] font-semibold text-holo-ink">
          원하는 답변을 찾지 못하셨나요?
        </p>
        <p className="mt-1 text-[12px] text-holo-ink-3">
          1:1 문의 탭에서 직접 문의해주세요.
        </p>
      </section>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] ${
        active
          ? "border-2 border-holo-purple-mid font-semibold text-holo-purple-mid"
          : "border border-holo-line text-holo-ink-2"
      }`}
    >
      {children}
    </button>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#A8A8A8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`mt-1 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
