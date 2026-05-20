import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Post, PostLocation } from "@/shared/mock/data";
import { LocationPicker } from "@/features/map/post-map";
import { useProfile } from "@/shared/hooks/use-profile";
import { useAccountStats } from "@/shared/stores/account-stats-store";
import { awardXp } from "@/shared/stores/xp-store";
import { tryDailyEarn } from "@/features/myroom/myroom-store";
import { pushPostCreated } from "@/shared/stores/notifications-store";
import { draftsStore } from "./drafts-store";
import { postsStore } from "./posts-store";
import { ConfirmModal } from "@/shared/components/confirm-modal";
import { ensureMeetupRoom, isMeetupPost, meetupRoomId } from "./meetup-utils";
import { joinPost } from "@/shared/stores/joined-store";
import { containsProfanity } from "@/shared/utils/profanity";

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

type OpenSection = "category" | "type" | "date" | "time" | "people" | null;

/**
 * 단기성 모임용 시작 시각 옵션 — 30분 단위, 00:00 ~ 23:30 (총 48개).
 * 시간만 빠르게 고를 수 있게 셀렉트 형태로 노출한다.
 */
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      );
    }
  }
  return out;
})();

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
  /** 단기성 모임 시작 시각 (HH:MM). */
  eventTime?: string;
  /** 장기성 모임 종료일 — 단기성에선 undefined. */
  endDate?: string;
  peopleCount?: number | null;
  place?: string;
  postLocation?: PostLocation | null;
  /** 게시글 첨부 사진 — 수정 진입 시 기존 사진 복원용. */
  photoUrls?: string[];
} | null;

export function BoardWriteScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const incomingState = (location.state as WriteLocationState) ?? null;
  const profile = useProfile();
  const stats = useAccountStats();

  // Capture initial values once for dirty detection.
  const [initialTitle] = useState<string>(incomingState?.title ?? "");
  const [initialContent] = useState<string>(incomingState?.content ?? "");

  const [title, setTitle] = useState<string>(initialTitle);
  const [content, setContent] = useState<string>(initialContent);

  const [showExitModal, setShowExitModal] = useState(false);
  /**
   * 입력 누락 안내 모달 — 비어 있으면 null, 채워져 있으면 안내 메시지.
   * 메시지를 상태에 직접 담아 어떤 필드가 빠졌는지에 따라 동적으로 노출한다.
   */
  const [emptyAlert, setEmptyAlert] = useState<string | null>(null);
  /** 모임 글 등록 직후, 채팅방 개설 안내 + 채팅방으로 이동 여부 묻는 모달. */
  const [chatRoomCreatedFor, setChatRoomCreatedFor] = useState<Post | null>(null);

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
    incomingState?.eventDate ?? "2026-05-18",
  );
  // 종료일 — 수정 진입 시 기존 endDate 가 있으면 그걸 살리고, 없으면 시작일로 초기화 (단기성으로 진입한 흐름).
  const [endDate, setEndDate] = useState<string>(
    incomingState?.endDate ?? incomingState?.eventDate ?? "2026-05-18",
  );
  // 단기성 모임 시작 시각 — 기본 19:00. 수정 진입 시 기존 값 복원.
  const [eventTime, setEventTime] = useState<string>(
    incomingState?.eventTime ?? "19:00",
  );
  const [rangeMode, setRangeMode] = useState<"start" | "end">("start");
  const [calMonth, setCalMonth] = useState<Date>(
    () => parseYMD(incomingState?.eventDate ?? "2026-05-18") ?? new Date(),
  );
  const [peopleCount, setPeopleCount] = useState<number | null>(
    incomingState?.peopleCount ?? null,
  );

  // 게시글 첨부 사진 — 갤러리에서 여러 장 선택 가능. data URL 배열로 보관해 mock 환경에서 그대로 영속화.
  const [photoUrls, setPhotoUrls] = useState<string[]>(
    incomingState?.photoUrls ?? [],
  );
  const photoInputRef = useRef<HTMLInputElement>(null);
  /** 첨부 사진은 최대 5장까지 — 5MB 초과 / 비-이미지는 컷. */
  const MAX_PHOTOS = 5;
  const handlePostPhotoFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - photoUrls.length;
    if (remaining <= 0) return;
    const accepted: File[] = [];
    for (let i = 0; i < files.length && accepted.length < remaining; i++) {
      const f = files[i];
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 5 * 1024 * 1024) continue;
      accepted.push(f);
    }
    if (accepted.length === 0) return;
    // 순서를 보존하기 위해 Promise.all 로 읽고, 다 읽은 뒤 한 번에 setPhotoUrls.
    Promise.all(
      accepted.map(
        (f) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") resolve(reader.result);
              else reject(new Error("not a string"));
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(f);
          }),
      ),
    ).then((urls) => {
      setPhotoUrls((prev) => [...prev, ...urls].slice(0, MAX_PHOTOS));
    });
  };

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

  // 카테고리 드롭다운(상단) 과 칩 드롭다운(하단) 이 별도 DOM 트리에 있어
  // 클릭이 두 영역 모두의 바깥일 때만 드롭다운을 닫는다.
  const controlsRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openSection) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideControls = controlsRef.current?.contains(target);
      const insidePills = pillsRef.current?.contains(target);
      if (!insideControls && !insidePills) {
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
    // 제목·내용 둘 다 비어 있으면 한 번에 안내, 한 쪽만 비어 있으면 빠진 항목을 콕 짚어 안내.
    if (!title.trim() && !content.trim()) {
      setEmptyAlert("제목과 내용을 모두 입력해 주세요.");
      return;
    }
    if (!title.trim()) {
      setEmptyAlert("제목을 입력해 주세요.");
      return;
    }
    if (!content.trim()) {
      setEmptyAlert("내용을 입력해 주세요.");
      return;
    }
    // 욕설/비속어 검사 — 어느 한 곳이라도 걸리면 어디서 걸렸는지 명시해 차단.
    const badTitle = containsProfanity(title);
    const badContent = containsProfanity(content);
    if (badTitle || badContent) {
      const where =
        badTitle && badContent
          ? "제목과 내용"
          : badTitle
            ? "제목"
            : "내용";
      setEmptyAlert(`${where}에 사용할 수 없는 단어가 포함돼 있어요.`);
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
          // 장기성 모임만 종료일을 함께 저장. 단기성으로 바뀐 경우엔 명시적으로 undefined 로 지워준다.
          endDate: isLongTerm ? endDate : undefined,
          // 단기성 모임만 시작 시각을 함께 저장. 장기성은 시간 개념이 없으니 undefined 로 지움.
          eventTime: !isLongTerm ? eventTime : undefined,
          peopleCount,
          place:
            postLocation?.placeName ??
            incomingState.place ??
            existing.place,
          location: postLocation ?? existing.location,
          // 첨부 사진 — 빈 배열이면 명시적으로 undefined 로 저장해 잔존 데이터 정리.
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
        });
      }
    } else {
      // New post flow — prepend.
      const newPostId = `post-${Date.now()}`;
      const newPostTitle = title.trim() || "(제목 없음)";
      const newPost: Post = {
        id: newPostId,
        category: CATEGORY_NAME_TO_ID[category],
        status: "모집중",
        title: newPostTitle,
        description: content.trim() || "",
        distance: "0m",
        duration: "0분",
        likes: 0,
        comments: 0,
        timeAgo: "방금 전",
        authorNickname: profile.nickname,
        authorLevel: stats.level,
        meetupType: isSimpleCategory ? undefined : (meetupType ?? undefined),
        eventDate: isSimpleCategory ? undefined : date,
        // 종료일은 모임 + 장기성 두 조건 다 만족할 때만 저장.
        endDate:
          !isSimpleCategory && isLongTerm ? endDate : undefined,
        // 시간은 모임 + 단기성 두 조건 다 만족할 때만 저장.
        eventTime:
          !isSimpleCategory && !isLongTerm ? eventTime : undefined,
        peopleCount: isSimpleCategory ? null : peopleCount,
        place: postLocation?.placeName ?? incomingState?.place,
        location: postLocation ?? undefined,
        // 첨부 사진이 있으면 함께 저장 — 게시글 상세에서 본문 위/아래에 노출.
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      };
      postsStore.prepend(newPost);

      // 새 게시글 등록 알림 — 알림 패널에서 바로 그 글로 이동할 수 있도록 한 줄 발행.
      pushPostCreated(newPostTitle, newPostId);
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
      // 모임 글이면 채팅방을 자동 개설 + 작성자를 호스트로 참여 처리.
      // 그 후 모달로 채팅방 이동 여부를 묻는다. (네 → 채팅방, 아니오 → 게시판)
      if (isMeetupPost(newPost)) {
        ensureMeetupRoom(newPost);
        joinPost(newPostId);
        setChatRoomCreatedFor(newPost);
        return; // 모달에서 분기 처리하므로 navigate 호출은 잠시 보류.
      }
    }
    navigate("/board/list");
  };

  const typePill = (
    <PillButton
      label={meetupType ?? "모임유형"}
      icon={<MeetupTypeIcon />}
      active={openSection === "type"}
      selected={meetupType !== null}
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
  // 시간 pill — 단기성 모임에서만 노출. 30분 단위 시각을 셀렉트 형태로 선택.
  const timePill = (
    <PillButton
      label={eventTime}
      icon={<ClockIcon />}
      active={openSection === "time"}
      onClick={() => toggle("time")}
    />
  );
  const peoplePill = (
    <PillButton
      label={peopleLabel}
      icon={<PersonIcon />}
      active={openSection === "people"}
      selected={peopleCount !== null}
      onClick={() => toggle("people")}
    />
  );

  return (
    <main className="flex flex-1 flex-col pb-6">
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

      <section className="relative mx-4 flex flex-1 flex-col overflow-hidden rounded-holo-card bg-white shadow-holo-card">
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

        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력해주세요."
          className="mx-5 mt-3 border-b border-holo-line py-2 text-[16px] outline-none placeholder:text-holo-ink-3"
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

        {/* 선택된 위치 칩 — 지도 미리보기를 함께 노출. 칩 아래에 여백 추가해 "사진/장소" 행과 분리. */}
        {postLocation && (
          <div className="mx-5 mt-2 mb-4 flex items-center gap-2 rounded-full border border-holo-lilac-soft bg-holo-lilac-soft/40 px-3 py-1.5 text-[12px] text-holo-purple-mid">
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

        {/* 첨부 사진 가로 스크롤 미리보기 — 0장이면 숨겨지고, 1장 이상이면 thumb + X 버튼 노출 */}
        {photoUrls.length > 0 && (
          <div className="no-scrollbar -mx-5 mt-2 flex shrink-0 gap-2 overflow-x-auto px-5">
            {photoUrls.map((url, i) => (
              <div
                key={`${i}-${url.slice(-12)}`}
                className="relative h-[80px] w-[80px] shrink-0 overflow-hidden rounded-[10px] border border-holo-line-2"
              >
                <img
                  src={url}
                  alt={`첨부 사진 ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  aria-label="사진 제거"
                  onClick={() =>
                    setPhotoUrls((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-[11px] text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {/* hidden 파일 input — 갤러리에서 여러 장 선택. mock 이라 base64 그대로 보관. */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handlePostPhotoFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* 첨부 미니 아이콘 — 본문 영역 우측 하단. 사진·장소를 가볍게 호출.
            위쪽 회색 보더로 본문 영역과 시각적 분리. 배경은 흰색 유지. */}
        <div className="mt-1 flex items-center justify-end gap-1 border-t border-holo-line-3 bg-white px-3 py-1.5">
          <ComposerIconButton
            icon={<PhotoIcon />}
            ariaLabel="사진 첨부"
            count={photoUrls.length > 0 ? photoUrls.length : undefined}
            active={photoUrls.length > 0}
            disabled={photoUrls.length >= MAX_PHOTOS}
            onClick={() => photoInputRef.current?.click()}
          />
          <ComposerIconButton
            icon={<PinIcon />}
            ariaLabel="장소 첨부"
            active={!!postLocation}
            onClick={openLocationPicker}
          />
        </div>

        {/* 모임 정보 — 본문 작성 후 마지막에 채우는 메타데이터 영역.
            라일락 톤 컨테이너로 묶어서 본문과 시각적으로 구분.
            드롭다운 패널은 위쪽으로 열려서 화면 밖으로 튀어나가지 않게 함. */}
        {!isSimpleCategory && (
          <div
            ref={pillsRef}
            className="relative z-20 border-t border-holo-line-3 bg-holo-lilac-card/40 px-5 pb-3 pt-3"
          >
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-holo-purple-mid">
                <MeetupSectionIcon />
              </span>
              <span className="text-[12px] font-semibold text-holo-purple-mid">
                모임 정보
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {typePill}
              {peoplePill}
              {/* 장기성 모임은 시간 입력이 없으므로 날짜 칩이 한 줄을 가득 채우도록 col-span-2. */}
              <div className={isLongTerm ? "col-span-2 flex" : "flex"}>
                {datePill}
              </div>
              {/* 단기성 모임에서만 시간 셀렉트 노출. 장기성이면 시간 칩 자체를 렌더링하지 않음. */}
              {!isLongTerm && timePill}
            </div>

            {openSection === "type" && (
              <div className="absolute inset-x-5 bottom-full z-30 mb-2 overflow-hidden rounded-holo-tile border border-holo-lilac-soft bg-white shadow-holo-card">
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

            {openSection === "date" && (
              <div className="absolute inset-x-5 bottom-full z-30 mb-2 overflow-hidden rounded-holo-tile border border-holo-lilac-soft bg-white shadow-holo-card">
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

            {/* 시간 선택 셀렉트 — 단기성 모임에서만 노출. 30분 단위 시각 리스트를 스크롤 가능한 패널로. */}
            {!isLongTerm && openSection === "time" && (
              <div className="absolute inset-x-5 bottom-full z-30 mb-2 max-h-[280px] overflow-y-auto rounded-holo-tile border border-holo-lilac-soft bg-white shadow-holo-card">
                {TIME_OPTIONS.map((t, i) => {
                  const selected = t === eventTime;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setEventTime(t);
                        setOpenSection(null);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[14px] ${
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

            {openSection === "people" && (
              <div className="absolute inset-x-5 bottom-full z-30 mb-2 overflow-hidden rounded-holo-tile border border-holo-lilac-soft bg-white shadow-holo-card">
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
        )}

      </section>

      {/* Exit confirmation modal */}
      <ConfirmModal
        open={showExitModal}
        message="아직 작성 중인 게시글이 있습니다."
        description="이대로 나갈까요?"
        cancelLabel="임시보관함에 넣기"
        confirmLabel="나가기"
        onCancel={handleSaveDraft}
        onConfirm={handleExitWithoutSaving}
      />

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
              <LocationPicker
                value={draftPick}
                onChange={setDraftPick}
                onPlaceName={(name) => {
                  // 사용자가 직접 장소명을 비웠거나 새 좌표를 찍은 경우에만 자동 채움.
                  // 기존에 입력한 이름이 있으면 덮어쓰지 않는다.
                  setDraftPlaceName((prev) => (prev.trim() ? prev : name));
                }}
              />
              <p className="pointer-events-none absolute left-1/2 top-14 z-[400] -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[12px] text-holo-ink-2 shadow">
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

      {/* 입력 검증 알림 — 빈 칸 / 비속어 두 케이스 모두 emptyAlert 메시지로 노출. */}
      <ConfirmModal
        open={emptyAlert !== null}
        message={emptyAlert ?? ""}
        description={
          emptyAlert?.includes("사용할 수 없는 단어")
            ? "다른 표현으로 수정한 뒤 다시 등록해 주세요."
            : "작성을 완료하면 등록할 수 있어요."
        }
        singleAction
        onConfirm={() => setEmptyAlert(null)}
      />

      {/* 모임 글 등록 직후 — 채팅방 자동 개설 안내 + 이동 여부 확인 */}
      <ConfirmModal
        open={chatRoomCreatedFor !== null}
        message="채팅창이 개설되었습니다."
        description="채팅방으로 이동하시겠습니까?"
        confirmLabel="네"
        cancelLabel="아니오"
        onConfirm={() => {
          const post = chatRoomCreatedFor;
          setChatRoomCreatedFor(null);
          if (post) {
            navigate(`/chat/${meetupRoomId(post.id)}`, { replace: true });
          } else {
            navigate("/board/list");
          }
        }}
        onCancel={() => {
          setChatRoomCreatedFor(null);
          navigate("/board/list");
        }}
      />
    </main>
  );
}

/**
 * 모임 정보 설정용 셀렉트 버튼.
 * 셀렉트 형태로 명확히 인지되도록 모서리 둥근 박스 + 좌측 아이콘 + 우측 chevron.
 *  - active: 드롭다운이 열려있는 상태 (보라 보더 + 보라 chevron 회전)
 *  - selected: 값이 채워진 상태 (검정 글자, 진한 보라 chevron)
 *  - placeholder: 값이 아직 비어있는 상태 (회색 글자)
 */
function PillButton({
  label,
  icon,
  active,
  selected = true,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  /** 값이 선택된 상태인지 (true=선택됨, false=placeholder 톤). */
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`flex h-[40px] flex-1 items-center justify-between gap-1.5 rounded-[12px] border bg-white px-3 text-[13px] transition ${
        active
          ? "border-holo-purple-mid text-holo-purple-mid"
          : selected
            ? "border-holo-line-2 text-holo-ink"
            : "border-holo-line-2 text-holo-ink-3"
      }`}
    >
      <span className="flex min-w-0 items-center gap-1.5 truncate">
        <span
          className={
            active
              ? "text-holo-purple-mid"
              : selected
                ? "text-holo-purple-mid"
                : "text-holo-ink-4"
          }
        >
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </span>
      <ChevronDownIcon
        color={active ? "#7448DD" : "#A8A8A8"}
        className={`shrink-0 transition-transform ${active ? "rotate-180" : ""}`}
      />
    </button>
  );
}

/**
 * 본문 우측 하단 컴포저 미니 아이콘 버튼 (Discord/Slack 스타일).
 *  - 라일락 호버 톤 + 작은 사이즈 (h-9 w-9 정도) 로 본문에 부담을 주지 않음.
 *  - count 가 있으면 우측 상단에 작은 보라 뱃지로 첨부 수를 노출.
 *  - 활성(첨부됨) / 평소 / 비활성 3단 상태.
 */
function ComposerIconButton({
  icon,
  ariaLabel,
  count,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  ariaLabel: string;
  count?: number;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full transition active:scale-[0.94] ${
        disabled
          ? "text-holo-ink-4"
          : active
            ? "bg-holo-lilac-card text-holo-purple-mid"
            : "text-holo-ink-3 hover:bg-holo-surface-2"
      }`}
    >
      {icon}
      {count !== undefined && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-holo-purple-mid px-1 text-[9px] font-bold leading-none text-white">
          {count}
        </span>
      )}
    </button>
  );
}

/** 모임 정보 섹션 헤더 옆 아이콘 — 작은 사람 + 작은 별 (모임 / 이벤트 느낌). */
function MeetupSectionIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 11h-6" />
      <path d="M19 8v6" />
    </svg>
  );
}

/** 모임 유형 셀렉트 좌측 아이콘 — 작은 캘린더·사람 묶음 느낌. */
function MeetupTypeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="9" r="3.5" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6M14 14c2.5 0 7 1.5 7 5" />
    </svg>
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
function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
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
