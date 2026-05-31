import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  canEarnRegionVerifyPoints,
  canReVerifyRegion,
  nextRegionVerifyAt,
  setRegionVerified,
  setVerifiedRegion,
} from "@/shared/stores/verification-store";
import {
  findNearestDongs,
  searchDongs,
  type KoreanDong,
} from "@/shared/data/korean-dongs";
import { addPoints } from "@/features/myroom/myroom-store";
import { ConfirmModal } from "@/shared/components/confirm-modal";

type Phase = "permission" | "detecting" | "confirm" | "success" | "error" | "locked";

type DetectedDong = KoreanDong & { distanceM: number };

export function VerifyRegionScreen() {
  const navigate = useNavigate();
  // 마지막 인증이 90일 이내면 재인증을 막고 "locked" 안내 화면부터 시작한다.
  const [phase, setPhase] = useState<Phase>(() =>
    canReVerifyRegion() ? "permission" : "locked",
  );
  const [picked, setPicked] = useState<string>("");
  const [nearest, setNearest] = useState<DetectedDong[]>([]);
  // 이전엔 GPS accuracy(오차범위)를 노출했지만 브라우저 환경에 따라 50km 같은
  // 비현실적인 값이 나와 의미가 없어 제거. 대신 동네 인증의 가치를 안내하는
  // 문구를 보여준다.
  const [errorMessage, setErrorMessage] = useState<string>("");
  // 이번 confirm() 호출에서 +10P 적립이 실제로 발생했는지 — 성공 모달 표시 분기에 사용.
  // 갱신 주기(90일) 이내 재인증이면 false 가 되어 "+10P" 대신 "이미 적립됨" 안내를 보여준다.
  const [pointsGranted, setPointsGranted] = useState(false);
  // GPS 자동 감지 외 — 사용자가 직접 동네를 검색해서 인증할 수 있도록 검색어 보관.
  // 데이터셋에 없는 지역은 결과가 비고, 안내 메시지를 노출한다.
  const [query, setQuery] = useState("");
  const searchResults = searchDongs(query, 30);

  // 실제 GPS 좌표 요청 → 가장 가까운 동 3곳 계산
  function detectLocation() {
    setPhase("detecting");
    setErrorMessage("");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErrorMessage("이 기기에서는 위치 서비스를 사용할 수 없어요.");
      setPhase("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dongs = findNearestDongs(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          3,
        );
        setNearest(dongs);
        setPicked(dongs[0]?.label ?? "");
        setPhase("confirm");
      },
      (err) => {
        // 권한 거부 / 위치 정보 사용 불가 / 타임아웃 등
        const messages: Record<number, string> = {
          1: "위치 권한이 거부됐어요. 브라우저 설정에서 위치 권한을 허용해 주세요.",
          2: "위치를 확인할 수 없어요. GPS 신호를 받을 수 있는 곳에서 다시 시도해 주세요.",
          3: "위치 확인이 시간을 초과했어요. 잠시 후 다시 시도해 주세요.",
        };
        setErrorMessage(messages[err.code] ?? "위치 정보를 가져오지 못했어요.");
        setPhase("error");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }

  const grant = () => detectLocation();
  const confirm = () => {
    if (!picked) return;
    // 90일 이내 재인증 차단 — 화면을 열어둔 채 시간 경과 없이 우회하는 경우 방지.
    if (!canReVerifyRegion()) {
      setPhase("locked");
      return;
    }
    // 적립 자격 판정은 setRegionVerified() 호출 전에 해야 한다.
    // 호출 후엔 lastRegionVerifiedAt 이 now 로 갱신되어 항상 false 가 되기 때문.
    const eligible = canEarnRegionVerifyPoints();
    setRegionVerified(true);
    setVerifiedRegion(picked);
    if (eligible) {
      addPoints(10, { title: "동네 인증" });
    }
    setPointsGranted(eligible);
    setPhase("success");
  };
  const finish = () => navigate(-1);

  const pickedLabel = picked || nearest[0]?.label || "위치 미확인";

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-holo-line-3 px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          동네 인증
        </span>
      </header>

      {phase === "permission" && (
        <section className="flex flex-1 flex-col items-center px-6 pt-6 text-center">
          <div className="mt-2 flex h-32 w-32 items-center justify-center rounded-full bg-holo-lilac-card-2">
            <PinIcon size={56} />
          </div>
          <h1 className="mt-6 text-[18px] font-bold leading-snug text-holo-ink">
            위치 권한이 필요해요
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-holo-ink-3">
            홀로는 위치 정보를 사용해
            <br />
            현재 머무는 동네를 확인해요.
            <br />
            이 정보는 동네 인증과 주변 모임 추천에만 사용돼요.
          </p>

          <ul className="mt-6 flex w-full flex-col gap-2 text-left text-[12px] text-holo-ink-2">
            <Bullet>대략적인 행정동까지만 사용해요 (정확한 좌표 X)</Bullet>
            <Bullet>인증은 3개월에 한 번 갱신해주시면 돼요</Bullet>
            <Bullet>인증 완료 시 +10P가 지급돼요</Bullet>
          </ul>

          <div className="mt-auto w-full pb-4 pt-6">
            <button
              type="button"
              onClick={grant}
              className="h-[60px] w-full rounded-holo-pill bg-holo-ink text-[16px] font-semibold text-white active:scale-[0.99]"
            >
              위치 권한 허용
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-2 h-10 w-full text-[13px] text-holo-ink-3"
            >
              나중에 할게요
            </button>
          </div>
        </section>
      )}

      {phase === "locked" && (
        <section className="flex flex-1 flex-col items-center px-6 pt-6 text-center">
          <div className="mt-2 flex h-32 w-32 items-center justify-center rounded-full bg-holo-lilac-card-2">
            <PinIcon size={56} />
          </div>
          <h1 className="mt-6 text-[18px] font-bold leading-snug text-holo-ink">
            이미 동네 인증을 마쳤어요
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-holo-ink-3">
            동네 인증은 3개월에 한 번만 갱신할 수 있어요.
            <br />
            다음 인증은{" "}
            <span className="font-semibold text-holo-purple-mid">
              {lockedNextDateLabel()}
            </span>{" "}
            부터 가능해요.
          </p>

          <div className="mt-auto w-full pb-4 pt-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-[60px] w-full rounded-holo-pill bg-holo-ink text-[16px] font-semibold text-white active:scale-[0.99]"
            >
              확인
            </button>
          </div>
        </section>
      )}

      {phase === "detecting" && (
        <section className="flex flex-1 flex-col items-center px-6 pt-10 text-center">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <span className="absolute h-40 w-40 animate-ping rounded-full bg-holo-purple-mid/20" />
            <span className="absolute h-28 w-28 animate-pulse rounded-full bg-holo-purple-mid/30" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-holo-purple-mid">
              <PinIcon size={36} fill="white" stroke="white" />
            </div>
          </div>
          <h1 className="mt-8 text-[18px] font-bold text-holo-ink">
            동네를 확인하고 있어요...
          </h1>
          <p className="mt-2 text-[13px] text-holo-ink-3">
            잠시만 기다려주세요.
          </p>
        </section>
      )}

      {phase === "error" && (
        <section className="flex flex-1 flex-col items-center px-6 pt-10 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-holo-line-3 text-[40px]">
            ⚠️
          </div>
          <h1 className="mt-6 text-[18px] font-bold text-holo-ink">
            위치를 확인하지 못했어요
          </h1>
          <p className="mt-2 px-2 text-[13px] leading-6 text-holo-ink-3">
            {errorMessage}
          </p>
          <div className="mt-auto w-full pb-4 pt-6">
            <button
              type="button"
              onClick={detectLocation}
              className="h-[60px] w-full rounded-holo-pill bg-holo-ink text-[16px] font-semibold text-white active:scale-[0.99]"
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-2 h-10 w-full text-[13px] text-holo-ink-3"
            >
              나중에 할게요
            </button>
          </div>
        </section>
      )}

      {phase === "confirm" && (
        <section className="flex flex-1 flex-col px-4 pt-2">
          <div className="mt-2 rounded-holo-card bg-holo-hero p-6 text-center">
            <p className="text-[12px] text-holo-purple-mid">감지된 위치</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-[20px] font-bold text-holo-ink">
              <PinIcon size={20} /> {pickedLabel}
            </p>
            <p className="mt-1 whitespace-nowrap text-[12px] text-holo-ink-3">
              현재 머무는 동네 이웃을 만나보세요
            </p>
          </div>

          <p className="mt-5 text-[13px] font-semibold text-holo-ink">
            여기가 내 동네가 맞나요?
          </p>
          <p className="mt-1 text-[12px] text-holo-ink-3">
            정확하지 않다면 아래에서 다시 선택할 수 있어요.
          </p>

          <ul className="mt-3 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
            {nearest.map((a, i) => {
              const active = picked === a.label;
              return (
                <li key={a.label}>
                  <button
                    type="button"
                    onClick={() => setPicked(a.label)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] text-holo-ink">
                        {a.label}
                      </span>
                      {i === 0 && (
                        <span className="rounded-full bg-holo-lilac-card px-2 py-0.5 text-[11px] font-semibold text-holo-purple-mid">
                          가장 가까움
                        </span>
                      )}
                      <span className="text-[11px] text-holo-ink-3">
                        {a.distanceM < 1000
                          ? `${Math.round(a.distanceM)}m`
                          : `${(a.distanceM / 1000).toFixed(1)}km`}
                      </span>
                    </div>
                    <Radio selected={active} />
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={detectLocation}
            className="mt-3 self-end text-[12px] text-holo-purple-mid underline"
          >
            다시 감지하기
          </button>

          {/* ── 다른 지역에서 인증하기 ─────────────────────────────
              GPS 가 잡지 못한 지역(여행/이주 등)을 사용자가 직접 검색해 인증.
              검색 결과 선택 시 picked 가 갱신되어 위쪽 라디오는 자동으로 해제된다. */}
          <div className="mt-6 border-t border-holo-line-3 pt-5">
            <p className="text-[13px] font-semibold text-holo-ink">
              다른 지역에서 인증하기
            </p>
            <p className="mt-1 text-[12px] text-holo-ink-3">
              현재 위치가 아닌 다른 동네를 검색해서 인증할 수 있어요.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-holo-input border border-holo-line-2 bg-white px-3 py-2.5">
              <SearchIcon />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="시·구·동 이름으로 검색"
                className="flex-1 bg-transparent text-[14px] text-holo-ink outline-none placeholder:text-holo-ink-3"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="검색어 지우기"
                  className="text-[12px] text-holo-ink-3"
                >
                  ✕
                </button>
              )}
            </div>

            {query && searchResults.length > 0 && (
              <ul className="mt-2 flex max-h-[260px] flex-col divide-y divide-holo-line-3 overflow-y-auto rounded-holo-input bg-white shadow-holo-card">
                {searchResults.map((d) => {
                  const active = picked === d.label;
                  return (
                    <li key={d.label}>
                      <button
                        type="button"
                        onClick={() => setPicked(d.label)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="text-[14px] text-holo-ink">
                          {d.label}
                        </span>
                        <Radio selected={active} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {query && searchResults.length === 0 && (
              <p className="mt-2 rounded-holo-input bg-holo-surface-2 px-4 py-3 text-[12px] text-holo-ink-3">
                ‘{query}’ 와 일치하는 동네가 없어요. 시·구 이름을 함께 입력해
                보세요. (예: 부산 해운대, 제주 노형)
              </p>
            )}
          </div>

          <p className="mt-4 text-[11px] leading-5 text-holo-ink-3">
            · 거짓으로 인증하면 서비스 이용이 제한될 수 있어요.
            <br />· 등록한 동네는 3개월 뒤 다시 인증해주세요.
          </p>

          <div className="mt-auto pb-4 pt-6">
            <button
              type="button"
              onClick={confirm}
              disabled={!picked}
              className="h-[60px] w-full rounded-holo-pill bg-holo-ink text-[16px] font-semibold text-white active:scale-[0.99] disabled:opacity-50"
            >
              이 동네로 인증하기
            </button>
          </div>
        </section>
      )}

      <ConfirmModal
        open={phase === "success"}
        message="동네 인증 완료!"
        description={
          <>
            <span className="text-holo-purple-mid">{pickedLabel}</span>
            <br />
            {pointsGranted ? (
              <span className="mt-1 inline-block text-[16px] font-bold text-holo-purple-mid">
                +10P
              </span>
            ) : (
              <span>이미 적립된 동네 인증입니다.</span>
            )}
            <br />
            <span className="text-[11px]">
              인증은 {nextRenewDate()} 에 다시 해주세요.
            </span>
          </>
        }
        singleAction
        onConfirm={finish}
      />

      {/* 미사용 변수 워닝 방지 */}
    </main>
  );
}

function nextRenewDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** 마지막 인증 기준 다음 재인증 가능일(=마지막+90일) 라벨. 이력 없으면 빈 문자열. */
function lockedNextDateLabel() {
  const ts = nextRegionVerifyAt();
  if (ts === null) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-holo-purple-mid" />
      <span>{children}</span>
    </li>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
        selected ? "border-holo-purple-mid" : "border-holo-line"
      }`}
    >
      {selected && <span className="h-2.5 w-2.5 rounded-full bg-holo-purple-mid" />}
    </span>
  );
}

function PinIcon({
  size = 16,
  fill = "#7448DD",
  stroke = "#7448DD",
}: {
  size?: number;
  fill?: string;
  stroke?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth="1"
      aria-hidden
    >
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="9" r="2.5" fill="white" />
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

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#979797"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
