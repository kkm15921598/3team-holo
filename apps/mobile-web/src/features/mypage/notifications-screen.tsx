import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getQuietHours, subscribeQuietHours } from "./quiet-hours-store";
import {
  getNotificationSettings,
  setNotificationSettings,
  subscribeNotificationSettings,
} from "@/shared/stores/notification-settings-store";

export function NotificationsScreen() {
  const navigate = useNavigate();
  const goQuiet = () => navigate("/mypage/notifications/quiet");

  const [settings, setSettings] = useState(getNotificationSettings);
  useEffect(() => subscribeNotificationSettings(() => setSettings(getNotificationSettings())), []);

  const set = (key: keyof typeof settings) => (v: boolean) => {
    setNotificationSettings({ [key]: v });
  };

  const {
    master,
    comment,
    like,
    friend,
    chat,
    meeting,
    event,
    marketing,
    quietEnabled,
  } = settings;
  const [quietHours, setQuietHoursState] = useState(getQuietHours);

  useEffect(() => subscribeQuietHours(() => setQuietHoursState(getQuietHours())), []);

  const formatTime = (h: number, m: number) =>
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const quietLabel = `${formatTime(quietHours.startH, quietHours.startM)} ~ ${formatTime(quietHours.endH, quietHours.endM)}`;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">알림설정</span>
      </header>

      {/* 전체 알림 */}
      <section className="px-4 pt-2">
        <ul className="flex flex-col rounded-holo-input bg-holo-lilac-card-2 shadow-holo-card">
          <ToggleRow
            label="전체 알림"
            hint={master ? "푸시 알림이 켜져 있어요" : "모든 알림이 꺼져 있어요"}
            value={master}
            onChange={set("master")}
            emphasize
          />
        </ul>
      </section>

      {/* 활동 알림 */}
      <section className={`mt-4 px-4 ${master ? "" : "opacity-50 pointer-events-none"}`}>
        <p className="text-[12px] text-holo-ink-3">활동 알림</p>
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          <ToggleRow label="댓글 알림" hint="내 글에 새로운 댓글이 달릴 때" value={comment} onChange={set("comment")} />
          <ToggleRow label="좋아요 알림" hint="내 글·댓글에 좋아요가 눌릴 때" value={like} onChange={set("like")} />
          <ToggleRow label="친구 요청 알림" value={friend} onChange={set("friend")} />
          <ToggleRow label="채팅 알림" hint="새 메시지가 도착할 때" value={chat} onChange={set("chat")} />
          <ToggleRow label="모임 알림" hint="모집 마감·새 멤버 합류 등" value={meeting} onChange={set("meeting")} />
        </ul>
      </section>

      {/* 기타 */}
      <section className={`mt-4 px-4 ${master ? "" : "opacity-50 pointer-events-none"}`}>
        <p className="text-[12px] text-holo-ink-3">이벤트 / 마케팅</p>
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          <ToggleRow label="이벤트 알림" hint="출석체크·포인트 이벤트 안내" value={event} onChange={set("event")} />
          <ToggleRow
            label="마케팅 알림"
            hint="관심사 기반 추천 소식"
            value={marketing}
            onChange={set("marketing")}
          />
        </ul>
      </section>

      {/* 방해 금지 */}
      <section className={`mt-4 px-4 pb-4 ${master ? "" : "opacity-50 pointer-events-none"}`}>
        <p className="text-[12px] text-holo-ink-3">방해 금지 시간</p>
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          <ToggleRow
            label="방해 금지 모드"
            hint={`${quietLabel} 동안 알림이 오지 않아요`}
            value={quietEnabled}
            onChange={set("quietEnabled")}
          />
          {quietEnabled && (
            <li>
              <button
                type="button"
                onClick={goQuiet}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-[14px] text-holo-ink">시간 설정</span>
                <span className="flex items-center gap-1 text-[13px] text-holo-purple-mid">
                  {quietLabel}
                  <ChevronRightIcon />
                </span>
              </button>
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
  emphasize,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  emphasize?: boolean;
}) {
  return (
    <li className="flex items-center justify-between px-4 py-3">
      <div className="flex flex-col">
        <span className={`text-[14px] ${emphasize ? "font-semibold" : ""} text-holo-ink`}>
          {label}
        </span>
        {hint && <span className="text-[12px] text-holo-ink-3">{hint}</span>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </li>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative h-[26px] w-[44px] shrink-0 rounded-full transition ${
        value ? "bg-holo-purple-mid" : "bg-holo-line"
      }`}
    >
      <span
        className={`absolute top-[3px] h-[20px] w-[20px] rounded-full bg-white shadow transition ${
          value ? "left-[21px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7448DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
