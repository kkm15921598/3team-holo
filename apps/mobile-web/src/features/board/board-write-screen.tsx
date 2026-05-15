import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { PostLocation } from "@/shared/mock/data";
import { LocationPicker } from "@/features/map/post-map";
import { useProfile } from "@/shared/hooks/use-profile";
import { awardXp } from "@/shared/stores/xp-store";
import { tryDailyEarn } from "@/features/myroom/myroom-store";
import { draftsStore } from "./drafts-store";
import { postsStore } from "./posts-store";

const CATEGORIES = [
  "자유게시판",
  "공동구매 / 소분하기",
  "추천해요",
  "게임파티",
  "같이 운동해요",
  "드라마 · 영화",
  "맛집 & 먹거리",
  "도와주세요!",
] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_NAME_TO_ID: Record<Category, string> = {
  "자유게시판": "free",
  "공동구매 / 소분하기": "share",
  "추천해요": "recommend",
  "게임파티": "game",
  "같이 운동해요": "sport",
  "드라마 · 영화": "media",
  "맛집 & 먹거리": "food",
  "도와주세요!": "help",
};

const CATEGORY_ID_TO_NAME: Record<string, Category> = Object.fromEntries(
  Object.entries(CATEGORY_NAME_TO_ID).map(([name, id]) => [id, name as Category]),
) as Record<string, Category>;

const MEETUP_TYPES = ["단기성 모임", "장기성 모임"] as const;
type MeetupType = (typeof MEETUP_TYPES)[number];

type OpenSection = "category" | "type" | "date" | "people" | null;

type WriteLocationState = {
  // Draft flow
  draftId?: string;
  // Edit flow (from Board3 수정하기)
  postId?: string;
  postCategory?: string;
  // Shared content
  title?: string;
  content?: string;
  meetupType?: MeetupType | null;
  eventDate?: string;
  peopleCount?: number | null;
  place?: string;
  postLocation?: PostLocation | null;
} | null;

export function BoardWriteScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const incomingState = (location.state as WriteLocationState) ?? null;
  const profile = useProfile();

  // Capture initial values once for dirty detection.
  const [initialTitle] = useState<string>(incomingState?.title ?? "");
  const [initialContent] = useState<string>(incomingState?.content ?? "");

  const [title, setTitle] = useState<string>(initialTitle);
  const [content, setContent] = useState<string>(initialContent);

  const [showExitModal, setShowExitModal] = useState(false);
  const [showEmptyAlert, setShowEmptyAlert] = useState(false);

  const [openSection, setOpenSection] = useState<OpenSection>(null);
  const initialCategory: Category =
    (incomingState?.postCategory &&
      CATEGORY_ID_TO_NAME[incomingState.postCategory]) ||
    "자유게시판";
  const [category, setCategory] = useState<Category>(initialCategory);
  const [meetupType, setMeetupType] = useState<MeetupType | null>(
    incomingState?.meetupType ?? null,
  );
  const [date, setDate] = useState<string>(
    incomingState?.eventDate ?? "2026-04-27",
  );
  const [endDate, setEndDate] = useState<string>(
    incomingState?.eventDate ?? "2026-04-27",
  );
  const [rangeMode, setRangeMode] = useState<"start" | "end">("start");
  const [calMonth, setCalMonth] = useState<Date>(
    () => parseYMD(incomingState?.eventDate ?? "2026-04-27") ?? new Date(),
  );
  const [peopleCount, setPeopleCount] = useState<number | null>(
    incomingState?.peopleCount ?? null,
  );

  // 위치(지도) 선택 상태
  const [postLocation, setPostLocation] = useState<PostLocation | null>(
    incomingState?.postLocation ?? null,
  );
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  // 모달 내부 임시 상태(취소 시 버려짐)
  const [draftPick, setDraftPick] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [draftPlaceName, setDraftPlaceName] = useState<string>("");

  const openLocationPicker = () => {
    setDraftPick(
      postLocation ? { lat: postLocation.lat, lng: postLocation.lng } : null,
    );
    setDraftPlaceName(postLocation?.placeName ?? incomingState?.place ?? "");
    setShowLocationPicker(true);
  };
  const confirmLocationPicker = () => {
    if (draftPick) {
      setPostLocation({
        lat: draftPick.lat,
        lng: draftPick.lng,
        placeName: draftPlaceName.trim() || undefined,
      });
    } else {
      setPostLocation(null);
    }
    setShowLocationPicker(false);
  };
  const clearLocation = () => {
    setPostLocation(null);
  };

  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openSection) return;
    const handler = (e: MouseEvent) => {
      if (
        controlsRef.current &&
        !controlsRef.current.contains(e.target as Node)
      ) {
        setOpenSection(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openSection]);

  const toggle = (s: Exclude<OpenSection, null>) =>
    setOpenSection((prev) => (prev === s ? null : s));

  const isLongTerm = meetupType === "장기성 모임";
  const dateLabel = isLongTerm ? `${date} ~ ${endDate}` : date;
  const peopleLabel = peopleCount !== null ? `${peopleCount}명` : "인원 수";
  // 자유게시판/추천해요는 모임이 아닌 일반 글 — 모임유형/인원수/날짜 입력을 숨긴다.
  const isSimpleCategory = category === "자유게시판" || category === "추천해요";

  const cameFromDraft = !!incomingState?.draftId;
  const cameFromEdit = !!incomingState?.postId;
  const isDirty =
    cameFromDraft ||
    cameFromEdit ||
    title !== initialTitle ||
    content !== initialContent ||
    postLocation !== (incomingState?.postLocation ?? null);

  const handleBackClick = () => {
    if (isDirty) {
      setShowExitModal(true);
    } else {
      navigate(-1);
    }
  };

  const handleSaveDraft = () => {
    draftsStore.upsert({
      id: incomingState?.draftId ?? `draft-${Date.now()}`,
      title,
      description: content,
    });
    setShowExitModal(false);
    navigate(-1);
  };

  const handleExitWithoutSaving = () => {
    setShowExitModal(false);
    navigate(-1);
  };

  // Publish: build/update a Post, then navigate to Board2.
  const handlePublish = () => {
    if (!title.trim() && !content.trim()) {
      setShowEmptyAlert(true);
      return;
    }
    if (cameFromEdit && incomingState?.postId) {
      // Edit flow — update existing post in place.
      const existing = postsStore
        .getPosts()
        .find((p) => p.id === incomingState.postId);
      if (existing) {
        postsStore.update({
          ...existing,
          category: CATEGORY_NAME_TO_ID[category],
          title: title.trim() || "(제목 없음)",
          description: content.trim() || "",
          meetupType: meetupType ?? undefined,
          eventDate: date,
          peopleCount,
          place:
            postLocation?.placeName ??
            incomingState.place ??
            existing.place,
          location: postLocation ?? existing.location,
        });
      }
    } else {
      // New post flow — prepend.
      postsStore.prepend({
        id: `post-${Date.now()}`,
        category: CATEGORY_NAME_TO_ID[category],
        status: "모집중",
        title: title.trim() || "(제목 없음)",
        description: content.trim() || "",
        distance: "0m",
        duration: "0분",
        likes: 0,
        comments: 0,
        timeAgo: "방금 전",
        authorNickname: profile.nickname,
        authorLevel: 24,
        meetupType: isSimpleCategory ? undefined : (meetupType ?? undefined),
        eventDate: isSimpleCategory ? undefined : date,
        peopleCount: isSimpleCategory ? null : peopleCount,
        place: postLocation?.placeName ?? incomingState?.place,
        location: postLocation ?? undefined,
      });
      // 새 게시글 작성 → XP 부여 (일일 cap 적용)
      awardXp("post");
      // 글쓰기 포인트 보상 — 하루 최대 6회(=30P) 까지 적립
      tryDailyEarn("post", 6, 5, {
        title: "글쓰기",
        note: title.trim() || "새 게시글",
      });
      if (incomingState?.draftId) {
        draftsStore.remove([incomingState.draftId]);
      }
    }
    navigate("/board/list");
  };

  const typePill = (
    <PillButton
      label={meetupType ?? "모임유형"}
      active={openSection === "type"}
      onClick={() => toggle("type")}
    />
  );
  const datePill = (
    <PillButton
      label={dateLabel}
      icon={<CalIcon />}
      active={openSection === "date"}
      onClick={() => toggle("date")}
    />
  );
  const peoplePill = (
    <PillButton
      label={peopleLabel}
      icon={<PersonIcon />}
      active={openSection === "people"}
      onClick={() => toggle("people")}
    />
  );

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between px-4">
        <button type="button" aria-label="뒤로" onClick={handleBackClick}>
          <BackIcon />
        </button>
        <div className="flex items-center gap-3 text-[14px]">
          <button
            type="button"
            className="text-holo-ink-2"
            onClick={() => navigate("/board/drafts")}
          >
            임시 보관함
          </button>
          <span className="h-3 w-px bg-holo-line" />
          <button
            type="button"
            className="font-semibold text-[#7448DD]"
            onClick={handlePublish}
          >
            등록하기
          </button>
        </div>
      </header>

      <section className="relative mx-4 flex flex-1 flex-col rounded-holo-card bg-white shadow-holo-card">
        <div ref={controlsRef}>
          <button
            type="button"
            onClick={() => toggle("category")}
            aria-expanded={openSection === "category"}
            className="flex h-[60px] w-full shrink-0 items-center justify-between rounded-t-holo-card bg-holo-lilac-soft px-5"
          >
            <span className="text-[16px] font-bold text-holo-purple-mid">
              {category}
            </span>
            <ChevronDownIcon
              color="#7448DD"
              className={`transition-transform ${
                openSection === "category" ? "rotate-180" : ""
              }`}
            />
          </button>

          {openSection === "category" && (
            <ul className="absolute inset-x-0 top-[60px] z-30 overflow-hidden rounded-b-[15px] border-b border-holo-line bg-white shadow-holo-card">
              {CATEGORIES.map((c) => {
                const selected = c === category;
                return (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => {
                        setCategory(c);
                        setOpenSection(null);
                      }}
                      className={`flex w-full items-center gap-2 px-5 py-3 text-left text-[14px] ${
                        selected
                          ? "font-bold text-holo-purple-mid"
                          : "text-holo-ink"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          selected ? "bg-holo-purple-mid" : "bg-holo-line"
                        }`}
                        aria-hidden
                      />
                      {c}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className={`relative z-20 ${isSimpleCategory ? "" : "pt-3"}`}>
            {!isSimpleCategory && (
              <div className="flex flex-col gap-2 px-5">
                <div className="flex flex-wrap gap-2">
                  {typePill}
                  {peoplePill}
                </div>
                <div className="flex flex-wrap gap-2">{datePill}</div>
              </div>
            )}

            {!isSimpleCategory && openSection === "type" && (
              <div className="absolute inset-x-5 top-full z-30 mt-2 overflow-hidden rounded-holo-tile border border-holo-lilac-soft bg-white shadow-holo-card">
                {MEETUP_TYPES.map((t, i) => {
                  const selected = t === meetupType;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setMeetupType(t);
                        if (t === "장기성 모임") {
                          if (endDate < date) setEndDate(date);
                          setRangeMode("start");
                        }
                        setOpenSection(null);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-[14px] ${
                        i > 0 ? "border-t border-holo-line" : ""
                      } ${
                        selected
                          ? "font-bold text-holo-purple-mid"
                          : "text-holo-ink"
                      }`}
                    >
                      {t}
                      {selected && <CheckIcon />}
                    </button>
                  );
                })}
              </div>
            )}

            {!isSimpleCategory && openSection === "date" && (
              <div className="absolute inset-x-5 top-full z-30 mt-2 overflow-hidden rounded-holo-tile border border-holo-lilac-soft bg-white shadow-holo-card">
                {isLongTerm && (
                  <div className="flex border-b border-holo-line text-[12px]">
                    <button
                      type="button"
                      onClick={() => setRangeMode("start")}
                      className={`flex flex-1 flex-col items-start px-3 py-2 ${
                        rangeMode === "start" ? "bg-holo-lilac-soft" : ""
                      }`}
                    >
                      <span className="text-holo-ink-2">시작 날짜</span>
                      <span
                        className={`text-[13px] ${
                          rangeMode === "start"
                            ? "font-bold text-holo-purple-mid"
                            : "text-holo-ink"
                        }`}
                      >
                        {date}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRangeMode("end")}
                      className={`flex flex-1 flex-col items-start border-l border-holo-line px-3 py-2 ${
                        rangeMode === "end" ? "bg-holo-lilac-soft" : ""
                      }`}
                    >
                      <span className="text-holo-ink-2">종료 날짜</span>
                      <span
                        className={`text-[13px] ${
                          rangeMode === "end"
                            ? "font-bold text-holo-purple-mid"
                            : "text-holo-ink"
                        }`}
                      >
                        {endDate}
                      </span>
                    </button>
                  </div>
                )}

                <div className="p-3">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <button
                      type="button"
                      aria-label="이전 달"
                      onClick={() => setCalMonth(addMonths(calMonth, -1))}
                      className="p-1 text-holo-ink"
                    >
                      <ChevronLeftIcon />
                    </button>
                    <span className="text-[14px] font-bold text-holo-ink">
                      {calMonth.getFullYear()}년 {calMonth.getMonth() + 1}월
                    </span>
                    <button
                      type="button"
                      aria-label="다음 달"
                      onClick={() => setCalMonth(addMonths(calMonth, 1))}
                      className="p-1 text-holo-ink"
                    >
                      <ChevronRightIcon />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 px-1 text-center text-[11px] text-holo-ink-3">
                    {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                      <span key={d} className="py-1">
                        {d}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-y-1 px-1">
                    {getMonthGrid(calMonth).map((d) => {
                      const ymd = formatYMD(d);
                      const isCurrentMonth = d.getMonth() === calMonth.getMonth();
                      const isStart = ymd === date;
                      const isEnd = isLongTerm && ymd === endDate;
                      const isSelected = isLongTerm
                        ? isStart || isEnd
                        : isStart;
                      const inRange =
                        isLongTerm && date < ymd && ymd < endDate;
                      const isToday = ymd === formatYMD(new Date());
                      return (
                        <button
                          key={ymd}
                          type="button"
                          onClick={() => {
                            if (isLongTerm) {
                              if (rangeMode === "start") {
                                setDate(ymd);
                                if (ymd > endDate) setEndDate(ymd);
                                setRangeMode("end");
                              } else {
                                if (ymd < date) {
                                  setEndDate(date);
                                  setDate(ymd);
                                } else {
                                  setEndDate(ymd);
                                }
                                setRangeMode("start");
                                setOpenSection(null);
                              }
                            } else {
                              setDate(ymd);
                              setOpenSection(null);
                            }
                            setCalMonth(
                              new Date(d.getFullYear(), d.getMonth(), 1),
                            );
                          }}
                          className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[13px] ${
                            isSelected
                              ? "bg-holo-purple-mid font-bold text-white"
                              : inRange
                                ? "bg-holo-lilac-soft text-holo-purple-mid"
                                : isCurrentMonth
                                  ? "text-holo-ink"
                                  : "text-holo-ink-3"
                          } ${
                            !isSelected && !inRange && isToday
                              ? "border border-holo-purple-mid"
                              : ""
                          }`}
                        >
                          {d.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {!isSimpleCategory && openSection === "people" && (
              <div className="absolute inset-x-5 top-full z-30 mt-2 overflow-hidden rounded-holo-tile border border-holo-lilac-soft bg-white shadow-holo-card">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[14px] text-holo-ink">인원 수</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="인원 감소"
                      onClick={() =>
                        setPeopleCount((n) => Math.max(1, (n ?? 1) - 1))
                      }
                      disabled={(peopleCount ?? 1) <= 1}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-holo-lilac-soft text-[16px] leading-none text-holo-purple-mid disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="min-w-[24px] text-center text-[14px] font-bold text-holo-ink">
                      {peopleCount ?? 1}
                    </span>
                    <button
                      type="button"
                      aria-label="인원 추가"
                      onClick={() => setPeopleCount((n) => (n ?? 0) + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-holo-lilac-soft text-[16px] leading-none text-holo-purple-mid"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력해주세요."
          className={`mx-5 border-b border-holo-line py-2 text-[16px] outline-none placeholder:text-holo-ink-3 ${
            isSimpleCategory ? "mt-3" : "mt-4"
          }`}
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="작성하고 싶으신 내용을 입력해주세요"
          className="mx-5 mt-3 min-h-[180px] flex-1 resize-none text-[14px] outline-none placeholder:text-holo-ink-3"
        />

        {!content && (
          <div className="mx-5 mb-5 mt-2 text-[11px] leading-relaxed text-holo-ink-3">
            ※ 커뮤니티 이용규칙을 꼭 지켜주세요. ※
            <br />
            정치·사회 갈등 조장, 광고·홍보, 불법·유해 콘텐츠, 욕설·혐오 표현, 타인 비방·사생활 침해, 공포·낚시성 게시물은 제한될 수 있습니다.
            <br />
            모두가 편하게 소통할 수 있도록 서로 존중하는 글을 작성해주세요
          </div>
        )}

        {/* 선택된 위치 칩 — 지도 미리보기를 함께 노출 */}
        {postLocation && (
          <div className="mx-5 mt-2 flex items-center gap-2 rounded-full border border-holo-lilac-soft bg-holo-lilac-soft/40 px-3 py-1.5 text-[12px] text-holo-purple-mid">
            <PinIcon />
            <span className="truncate">
              {postLocation.placeName ??
                `${postLocation.lat.toFixed(4)}, ${postLocation.lng.toFixed(4)}`}
            </span>
            <button
              type="button"
              aria-label="위치 제거"
              onClick={clearLocation}
              className="ml-auto text-holo-ink-3"
            >
              ✕
            </button>
          </div>
        )}

        <div className="mt-auto flex items-center gap-4 border-t border-holo-line-3 px-5 py-3 text-[14px] text-holo-ink">
          <button type="button" className="flex items-center gap-1">
            <PhotoIcon /> 사진
          </button>
          <button
            type="button"
            onClick={openLocationPicker}
            className={`flex items-center gap-1 ${
              postLocation ? "text-holo-purple-mid" : ""
            }`}
          >
            <PinIcon /> 장소
          </button>
        </div>
      </section>

      {/* Exit confirmation modal */}
      {showExitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setShowExitModal(false)}
        >
          <div
            className="w-full max-w-[300px] rounded-2xl bg-white p-5 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[14px] leading-relaxed text-holo-ink">
              아직 작성 중인 게시글이 있습니다.
              <br />
              이대로 나갈까요?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="flex-1 rounded-full border border-holo-lilac-soft px-3 py-2 text-[13px] font-medium text-holo-purple-mid"
              >
                임시보관함에 넣기
              </button>
              <button
                type="button"
                onClick={handleExitWithoutSaving}
                className="flex-1 rounded-full bg-holo-purple-mid px-3 py-2 text-[13px] font-medium text-white"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location picker modal */}
      {showLocationPicker && (
        <div
          className="fixed left-1/2 top-0 z-[1100] flex h-[100dvh] w-full max-w-[360px] -translate-x-1/2 flex-col bg-black/40"
          onClick={() => setShowLocationPicker(false)}
        >
          <div
            className="mt-auto flex h-[85%] flex-col overflow-hidden rounded-t-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-holo-line px-4">
              <button
                type="button"
                onClick={() => setShowLocationPicker(false)}
                className="text-[14px] text-holo-ink-2"
              >
                취소
              </button>
              <span className="text-[14px] font-semibold text-holo-ink">
                위치 선택
              </span>
              <button
                type="button"
                onClick={confirmLocationPicker}
                disabled={!draftPick}
                className="text-[14px] font-semibold text-holo-purple-mid disabled:opacity-40"
              >
                확인
              </button>
            </div>

            {/* 지도 영역 */}
            <div className="relative flex-1">
              <LocationPicker value={draftPick} onChange={setDraftPick} />
              <p className="pointer-events-none absolute left-1/2 top-3 z-[400] -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[12px] text-holo-ink-2 shadow">
                지도를 탭해 위치를 선택하세요
              </p>
            </div>

            {/* 장소 이름 입력 */}
            <div className="shrink-0 border-t border-holo-line px-4 py-3">
              <label className="text-[12px] text-holo-ink-3" htmlFor="place-name">
                장소 이름 (선택)
              </label>
              <input
                id="place-name"
                type="text"
                value={draftPlaceName}
                onChange={(e) => setDraftPlaceName(e.target.value)}
                placeholder="예: 미금역 1번 출구"
                className="mt-1 w-full border-b border-holo-line py-2 text-[14px] outline-none placeholder:text-holo-ink-3"
              />
              {draftPick && (
                <p className="mt-2 text-[11px] text-holo-ink-3">
                  선택한 좌표: {draftPick.lat.toFixed(5)}, {draftPick.lng.toFixed(5)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty content alert */}
      {showEmptyAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setShowEmptyAlert(false)}
        >
          <div
            className="w-full max-w-[300px] rounded-2xl bg-white p-5 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[14px] leading-relaxed text-holo-ink">
              내용이 입력되지 않았습니다.
            </p>
            <button
              type="button"
              onClick={() => setShowEmptyAlert(false)}
              className="mt-4 w-full rounded-full bg-holo-purple-mid px-3 py-2 text-[13px] font-medium text-white"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function PillButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className="flex items-center gap-1 rounded-full border border-holo-lilac-soft px-3 py-1 text-[12px] text-holo-ink"
    >
      {icon}
      {label}
      <ChevronDownIcon
        color="#A8A8A8"
        className={`transition-transform ${active ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function parseYMD(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}
function getMonthGrid(monthAnchor: Date): Date[] {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const start = new Date(year, month, 1 - startWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
  });
}

function ChevronDownIcon({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7448DD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function CalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function PhotoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
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
