import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { sendFriendRequest, type SendRequestResult } from "./friends-store";
import { useProfile } from "@/shared/hooks/use-profile";
import { supabase } from "@/shared/lib/supabaseClient";

type TabKey = "id" | "qr" | "scan";

export function FriendsAddScreen() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** 현재 선택된 탭 — id 입력 / 내 QR 보기 / QR 촬영 */
  const [tab, setTab] = useState<TabKey>("id");
  /** QR 코드 촬영 모달 열림 여부 — 카메라 권한을 받아 라이브 뷰파인더를 띄운다. */
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // 표시되는 내 닉네임은 현재 로그인 계정의 프로필을 따른다 — ME 는 데모용 고정값.
  const profile = useProfile();

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  };

  /**
   * 입력한 ID(친구코드) 또는 닉네임으로 실제 users 계정을 조회한다.
   * 존재하면 그 계정의 "진짜 닉네임"을, 없으면 null 을 반환한다.
   * (예전엔 조회 없이 입력값을 그대로 닉네임으로 써서, 없는 계정에 유령 요청이 생겼다.)
   */
  const lookupAccount = async (query: string): Promise<string | null> => {
    const q = query.trim();
    if (!q) return null;
    // 1) 친구코드(ID) 정확 일치 우선
    let { data } = await supabase
      .from("users")
      .select("nickname")
      .eq("friend_code", q)
      .limit(1);
    // 2) 없으면 닉네임 정확 일치
    if (!data || data.length === 0) {
      ({ data } = await supabase
        .from("users")
        .select("nickname")
        .eq("nickname", q)
        .limit(1));
    }
    const nick = data?.[0]?.nickname as string | undefined;
    return nick ?? null;
  };

  /** sendFriendRequest 결과를 토스트로 안내(텍스트 입력 / QR 공통). */
  const handleSendResult = (result: SendRequestResult, label: string) => {
    switch (result) {
      case "sent":
        showToast(`${label}님에게 친구 요청을 보냈어요.`);
        setInput("");
        window.setTimeout(
          () => navigate("/mypage/friends/requests", { replace: true }),
          700,
        );
        return;
      case "already-friend":
        showToast(`${label}님은 이미 친구 목록에 있어요.`);
        return;
      case "already-sent":
        showToast(`${label}님에게 이미 친구 요청을 보냈어요.`);
        return;
      case "incoming-exists":
        showToast(`${label}님이 먼저 요청을 보냈어요. 받은 요청에서 수락해 주세요.`);
        return;
      case "max-reached":
        showToast("친구 정원(30명)이 가득 찼어요. 기존 친구를 정리해 주세요.");
        return;
      case "self":
        showToast("자기 자신에게는 친구 요청을 보낼 수 없어요.");
        return;
      default:
        showToast("친구 요청을 보낼 수 없어요.");
        return;
    }
  };

  /** QR 스캐너 모달을 열면 카메라 스트림 시작 + BarcodeDetector 로 주기적 QR 디코딩. */
  useEffect(() => {
    if (!scannerOpen) {
      // 모달 닫힐 때 stream 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraError(null);
      return;
    }
    let cancelled = false;
    let detectionTimer: number | null = null;
    setCameraError(null);

    // BarcodeDetector 는 Chrome 83+ / Edge / Android Chrome 에서 지원.
    // Safari/iOS Safari 에서는 미지원이라 별도 안내가 필요.
    // 표준 TS 타입에 없는 API 라 any 로 받아서 사용.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BarcodeDetectorCtor: any =
      typeof window !== "undefined"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (window as any).BarcodeDetector
        : undefined;

    /**
     * 카메라 프레임을 일정 간격으로 검사해 QR 코드 디코딩.
     * 코드를 찾으면 친구 요청 전송 + 모달 닫기.
     */
    const startDetectionLoop = () => {
      if (!BarcodeDetectorCtor || !videoRef.current) return;
      const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
      const tick = async () => {
        if (cancelled || !videoRef.current) return;
        try {
          const codes: Array<{ rawValue: string }> = await detector.detect(
            videoRef.current,
          );
          if (codes.length > 0) {
            const value = codes[0]?.rawValue?.trim();
            if (value) {
              handleQrDecoded(value);
              return; // 디코드 성공 시 루프 중단
            }
          }
        } catch {
          // 디코딩 실패는 정상 — 다음 tick 에서 재시도
        }
        detectionTimer = window.setTimeout(tick, 400);
      };
      // 카메라 시작 후 약간 기다렸다가 디코딩 시작 (첫 프레임이 까만 화면 방지)
      detectionTimer = window.setTimeout(tick, 600);
    };

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
        if (BarcodeDetectorCtor) {
          startDetectionLoop();
        } else {
          setCameraError(
            "이 브라우저는 QR 자동 인식을 지원하지 않아요. Chrome 으로 다시 시도해 주세요.",
          );
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "카메라 권한이 거부됐어요. 브라우저 설정에서 권한을 허용해 주세요."
            : "카메라를 사용할 수 없어요. 다른 기기에서 다시 시도해 주세요.";
        setCameraError(msg);
      });
    return () => {
      cancelled = true;
      if (detectionTimer !== null) {
        window.clearTimeout(detectionTimer);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // handleQrDecoded 는 매 렌더마다 재생성되지만, 디펜던시에 넣으면 카메라가
    // 자꾸 재시작되니 의도적으로 제외. 최신 값은 ref 없이 클로저로 접근.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen]);

  /** QR 디코딩 성공 — 페이로드에서 friendCode + nickname 모두 추출 후 친구 요청. */
  const handleQrDecoded = async (value: string) => {
    // 지원 포맷:
    //  1) `holo:friend:{code}:{encodedNickname}`  ← 앱이 생성하는 표준 형식
    //  2) `holo:friend:{code}`                    ← 닉네임 없는 구버전
    //  3) `{code}`                                ← 단순 ID
    //  4) `https://.../friend/{code}`             ← URL 형식 (호환성)
    let code = "";
    let nickname = "";
    if (value.startsWith("holo:friend:")) {
      const rest = value.slice("holo:friend:".length);
      const parts = rest.split(":");
      code = (parts[0] ?? "").trim();
      if (parts[1]) {
        try {
          nickname = decodeURIComponent(parts[1]).trim();
        } catch {
          nickname = parts[1].trim();
        }
      }
    } else {
      // 기타 포맷 — 마지막 ":" 나 "/" 뒤 토큰을 코드로 사용.
      const token = value.split(/[:/]/).filter(Boolean).pop() ?? value;
      code = token.trim();
    }
    if (!code) return;
    setScannerOpen(false);
    // 친구 요청 대상 닉네임 결정:
    //  - QR 에 닉네임이 들어 있으면 그대로 신뢰(앱이 만든 표준 QR).
    //  - 코드만 있으면 ID 로 실제 계정을 조회해 진짜 닉네임을 얻는다.
    let target = nickname;
    if (!target) {
      const found = await lookupAccount(code);
      if (!found) {
        showToast("존재하지 않는 계정이에요. QR을 다시 확인해 주세요.");
        return;
      }
      target = found;
    }
    const label = nickname ? `${nickname}(${code})` : target;
    const result = sendFriendRequest(target);
    handleSendResult(result, label);
  };

  const handleAdd = async () => {
    const query = input.trim();
    if (!query) {
      showToast("닉네임 또는 ID를 입력해 주세요.");
      return;
    }
    if (adding) return;
    setAdding(true);
    try {
      // 입력값(ID 또는 닉네임)으로 실제 계정을 먼저 조회한다.
      const realNickname = await lookupAccount(query);
      if (!realNickname) {
        showToast("존재하지 않는 ID 또는 닉네임이에요. 다시 확인해 주세요.");
        return;
      }
      const result = sendFriendRequest(realNickname);
      handleSendResult(result, realNickname);
    } catch {
      showToast("친구를 찾는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <main className="absolute inset-0 z-30 flex flex-col bg-black/50">
      <header className="flex h-12 shrink-0 items-center bg-white px-4">
        <button type="button" aria-label="닫기" onClick={() => navigate(-1)}>
          <CloseIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">친구추가</span>
      </header>

      {/* 상단 탭 — 친구ID / 내 QR / QR 촬영 3개 균등 사이즈. 클릭 시 아래 영역 변경. */}
      <div className="flex shrink-0 gap-2 bg-white px-4 pt-3 pb-3">
        <TabButton active={tab === "id"} onClick={() => setTab("id")}>
          <KeyboardIcon /> 친구 ID
        </TabButton>
        <TabButton active={tab === "qr"} onClick={() => setTab("qr")}>
          <QrIcon /> 내 QR
        </TabButton>
        <TabButton active={tab === "scan"} onClick={() => setTab("scan")}>
          <CameraIcon size={16} /> QR 촬영
        </TabButton>
      </div>

      {/* 탭별 콘텐츠 — 마이페이지와 동일한 라일락 배경 + 흰 카드 톤. */}
      <div className="flex flex-1 flex-col overflow-y-auto bg-holo-lilac-card-2 px-4 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tab === "id" && (
          <section className="rounded-holo-input bg-white p-4 shadow-holo-card">
            <p className="text-[15px] font-semibold text-holo-ink">친구 ID 입력</p>
            <p className="mt-1 text-[12px] text-holo-ink-3">
              요청을 보내면 상대가 수락한 뒤 친구가 돼요.
            </p>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              placeholder="ID 또는 닉네임을 입력하세요"
              className="mt-3 h-[44px] w-full rounded-holo-input border border-holo-line px-4 text-[14px] outline-none placeholder:text-holo-ink-3 focus:border-2 focus:border-holo-purple-mid"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="mt-3 h-[44px] w-full rounded-full bg-holo-purple-mid text-[14px] font-semibold text-white active:opacity-90 disabled:opacity-60"
            >
              {adding ? "확인 중..." : "친구 요청 보내기"}
            </button>
          </section>
        )}

        {tab === "qr" && (
          <section className="flex flex-col items-center rounded-holo-input bg-white p-5 shadow-holo-card">
            <p className="self-start text-[13px] font-semibold text-holo-purple-mid">
              내 QR 코드
            </p>
            <p className="mt-1 self-start text-[18px] font-bold text-holo-ink">
              {profile.nickname}
            </p>
            <p className="mt-0.5 self-start text-[13px] text-holo-ink-3">
              ID : {profile.friendCode}
            </p>
            <div className="mt-4 flex h-[220px] w-[220px] items-center justify-center rounded-[14px] bg-white p-2 ring-1 ring-holo-line-3">
              <HoloQrCode
                code={profile.friendCode}
                nickname={profile.nickname}
                size={200}
              />
            </div>
            <p className="mt-4 text-center text-[12px] text-holo-ink-3">
              친구에게 이 QR 코드를 보여주세요.
            </p>
          </section>
        )}

        {tab === "scan" && (
          <section className="flex flex-col items-center rounded-holo-input bg-white p-5 shadow-holo-card">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-holo-lilac-soft text-holo-purple-mid">
              <CameraIcon size={32} />
            </span>
            <p className="mt-4 text-[16px] font-semibold text-holo-ink">
              QR 코드 촬영하기
            </p>
            <p className="mt-1 text-center text-[13px] leading-relaxed text-holo-ink-3">
              친구의 QR 코드를 카메라로
              <br />
              스캔해서 빠르게 친구가 돼보세요.
            </p>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="mt-5 h-[44px] w-full rounded-full bg-holo-purple-mid text-[14px] font-semibold text-white active:opacity-90"
            >
              카메라 열기
            </button>
          </section>
        )}
      </div>

      {/* QR 스캐너 모달 */}
      {scannerOpen && (
        <div className="absolute inset-0 z-40 flex flex-col bg-black">
          <header className="flex h-12 shrink-0 items-center bg-black/60 px-4 text-white">
            <button
              type="button"
              aria-label="닫기"
              onClick={() => setScannerOpen(false)}
              className="text-white"
            >
              <CloseIcon stroke="#FFFFFF" />
            </button>
            <span className="ml-2 text-[16px] font-semibold">QR 코드 촬영</span>
          </header>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            {cameraError ? (
              <div className="px-6 text-center text-[14px] text-white/80">
                {cameraError}
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                {/* 가운데 정사각형 가이드 */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-[240px] w-[240px] rounded-[18px] ring-4 ring-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                    <Corner pos="tl" />
                    <Corner pos="tr" />
                    <Corner pos="bl" />
                    <Corner pos="br" />
                  </div>
                </div>
                <p className="absolute bottom-8 left-0 right-0 text-center text-[13px] text-white/90">
                  친구의 QR 코드를 사각형 안에 맞춰주세요
                </p>
              </>
            )}
          </div>
        </div>
      )}

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

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const cls = {
    tl: "left-0 top-0 border-l-[6px] border-t-[6px] rounded-tl-[18px]",
    tr: "right-0 top-0 border-r-[6px] border-t-[6px] rounded-tr-[18px]",
    bl: "left-0 bottom-0 border-l-[6px] border-b-[6px] rounded-bl-[18px]",
    br: "right-0 bottom-0 border-r-[6px] border-b-[6px] rounded-br-[18px]",
  }[pos];
  return (
    <span
      aria-hidden
      className={`absolute h-7 w-7 border-holo-purple-mid ${cls}`}
    />
  );
}

/** 상단 3개 균등 탭 — 활성/비활성 톤 명확히 구분. */
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
      className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition ${
        active
          ? "bg-holo-purple-mid text-white shadow-[0_2px_6px_rgba(116,72,221,0.25)]"
          : "border border-holo-line text-holo-ink-3 active:bg-holo-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

function CameraIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function KeyboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" />
    </svg>
  );
}
function QrIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
    </svg>
  );
}

function CloseIcon({ stroke = "#1A1A1A" }: { stroke?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="m6 6 12 12M6 18 18 6" />
    </svg>
  );
}
/**
 * 친구 코드 + 닉네임을 실제 스캔 가능한 표준 QR 코드(SVG) 로 렌더.
 *  - 페이로드 형식: `holo:friend:{code}:{encodedNickname}`
 *    예: `holo:friend:ajhd5:%EB%8B%AC%EC%BD%A4%ED%95%9C%20%EB%AC%B4%EC%A7%80`
 *  - 스캐너 측에서 split 으로 code 와 nickname 을 모두 추출해 토스트에 함께 노출.
 *  - 닉네임은 한글/공백/특수문자 안전 전송을 위해 encodeURIComponent.
 */
function HoloQrCode({
  code,
  nickname,
  size = 180,
}: {
  code: string;
  nickname: string;
  size?: number;
}) {
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const payload = `holo:friend:${code}:${encodeURIComponent(nickname)}`;
    QRCode.toString(payload, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 0,
      color: { dark: "#1A1A1A", light: "#FFFFFF" },
      width: size,
    })
      .then((str) => {
        if (!cancelled) setSvg(str);
      })
      .catch(() => {
        if (!cancelled) setSvg("");
      });
    return () => {
      cancelled = true;
    };
  }, [code, nickname, size]);

  return (
    <div
      role="img"
      aria-label={`친구 QR 코드: ${nickname}`}
      style={{ width: size, height: size }}
      // 라이브러리가 생성한 SVG 문자열을 그대로 삽입 — 외부 입력이 아니라 안전.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
