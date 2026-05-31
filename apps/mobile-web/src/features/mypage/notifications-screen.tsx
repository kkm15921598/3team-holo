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

  const offGroup = master ? "" : "opacity-50 pointer-events-none";

  return (
    <main className="flex flex-1 flex-col bg-white pb-6">
      <header className="flex h-12 shrink-0 items-center border-b border-holo-line-3 px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">알림설정</span>
      </header>

      {/* 전체 알림 — 마스터 토글. 연한 라일락 면으로만 강조(카드/그림자 없이). */}
      <ul className="flex flex-col bg-holo-lilac-card-2/40">
        <ToggleRow
          label="전체 알림"
          hint={master ? "푸시 알림이 켜져 있어요" : "모든 알림이 꺼져 있어요"}
          value={master}
          onChange={set("master")}
          emphasize
        />
      </ul>

      <div className="h-2 shrink-0 bg-holo-surface-2" />

      {/* 활동 알림 */}
      <div className={offGroup}>
        <p className="px-4 pb-1 pt-4 text-[13px] font-medium text-holo-ink-3">활동 알림</p>
        <ul className="flex flex-col divide-y divide-holo-line-3">
          <ToggleRow label="댓글 알림" hint="내 글에 새로운 댓글이 달릴 때" value={comment} onChange={set("comment")} />
          <ToggleRow label="좋아요 알림" hint="내 글·댓글에 좋아요가 눌릴 때" value={like} onChange={set("like")} />
          <ToggleRow label="친구 요청 알림" value={friend} onChange={set("friend")} />
          <ToggleRow label="채팅 알림" hint="새 메시지가 도착할 때" value={chat} onChange={set("chat")} />
          <ToggleRow label="모임 알림" hint="모집 마감·새 멤버 합류 등" value={meeting} onChange={set("meeting")} />
        </ul>
      </div>

      <div className="h-2 shrink-0 bg-holo-surface-2" />

      {/* 이벤트 / 마케팅 */}
      <div className={offGroup}>
        <p className="px-4 pb-1 pt-4 text-[13px] font-medium text-holo-ink-3">이벤트 / 마케팅</p>
        <ul className="flex flex-col divide-y divide-holo-line-3">
          <ToggleRow label="이벤트 알림" hint="출석체크·포인트 이벤트 안내" value={event} onChange={set("event")} />
          <ToggleRow
            label="마케팅 알림"
            hint="관심사 기반 추천 소식"
            value={marketing}
            onChange={set("marketing")}
          />
        </ul>
      </div>

      <div className="h-2 shrink-0 bg-holo-surface-2" />

      {/* 방해 금지 시간 */}
      <div className={offGroup}>
        <p className="px-4 pb-1 pt-4 text-[13px] font-medium text-holo-ink-3">방해 금지 시간</p>
        <ul className="flex flex-col divide-y divide-holo-line-3">
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
                className="flex min-h-[56px] w-full items-center justify-between px-4 text-left active:bg-holo-surface-2"
              >
                <span className="text-[15px] text-holo-ink">시간 설정</span>
                <span className="flex items-center gap-1 text-[13px] text-holo-purple-mid">
                  {quietLabel}
                  <ChevronRightIcon />
                </span>
              </button>
            </li>
          )}
        </ul>
      </div>
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
    <li className="flex min-h-[56px] items-center justify-between px-4 py-2">
      <div className="flex flex-col">
        <span className={`text-[15px] ${emphasize ? "font-semibold" : ""} text-holo-ink`}>
          {label}
        </span>
        {hint && <span className="mt-0.5 text-[12px] text-holo-ink-3">{hint}</span>}
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
