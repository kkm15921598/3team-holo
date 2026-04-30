import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useSignup } from "@/features/auth/signup-context";

type Slug = "age" | "tos" | "privacy" | "marketing";

type Doc = {
  title: string;
  required: boolean;
  field: "agreedAge" | "agreedTos" | "agreedPrivacy" | "agreedMarketing";
  body: string;
};

const DOCS: Record<Slug, Doc> = {
  age: {
    title: "만 14세 이상 확인",
    required: true,
    field: "agreedAge",
    body: `HOLO는 만 14세 이상의 개인 사용자에게 서비스를 제공합니다.

만 14세 미만의 아동이 가입한 사실이 확인되면 즉시 탈퇴 조치되며, 보유 중인 개인정보는 지체 없이 파기됩니다.

본 항목은 정보통신망법 및 개인정보 보호법에 따른 필수 동의 항목입니다.`,
  },
  tos: {
    title: "서비스 이용약관",
    required: true,
    field: "agreedTos",
    body: `제1조 (목적)
이 약관은 HOLO(이하 "회사")가 제공하는 동네 커뮤니티 서비스의 이용 조건과 절차, 회사와 회원 간 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 게시판/지도/채팅/마이룸 등 일체의 기능을 말합니다.
2. "회원"이란 본 약관에 동의하고 회사와 이용계약을 체결한 자를 말합니다.

제3조 (계정과 책임)
회원은 본인의 계정 정보를 안전하게 관리할 책임이 있으며, 부정 사용으로 인한 손해는 회사가 책임지지 않습니다.

제4조 (금지 행위)
타인 사칭, 허위 정보 게시, 욕설/혐오 표현, 무단 광고 등은 금지되며 위반 시 서비스 이용이 제한될 수 있습니다.

(샘플 약관입니다. 정식 출시 전 법무 검토를 거친 본문으로 교체됩니다.)`,
  },
  privacy: {
    title: "개인정보 처리방침",
    required: true,
    field: "agreedPrivacy",
    body: `1. 수집 항목
- 필수: 이름, 생년월일, 휴대폰 번호, 동네 정보, 닉네임
- 선택: 한 줄 소개, 마이룸 꾸미기 데이터

2. 수집 목적
- 회원 식별, 동네 기반 매칭, 안전한 커뮤니티 운영, 부정 사용 방지

3. 보유 기간
- 회원 탈퇴 시 즉시 파기. 단, 관계 법령에 따라 일정 기간 보관해야 하는 정보는 해당 기간 동안만 분리 보관 후 파기.

4. 제3자 제공
- 원칙적으로 제공하지 않으며, 법령에 근거하거나 사용자가 사전 동의한 경우에만 제공합니다.

(샘플 본문입니다. 정식 출시 전 법무 검토 후 교체됩니다.)`,
  },
  marketing: {
    title: "마케팅 정보 수신 동의",
    required: false,
    field: "agreedMarketing",
    body: `HOLO에서 제공하는 이벤트, 프로모션, 새로운 기능 안내 등 마케팅 정보를 푸시 알림 또는 이메일로 받는 것에 동의합니다.

본 항목은 선택 사항으로, 동의하지 않아도 회원 가입 및 서비스 이용에 제한이 없습니다.

수신 동의 후에도 마이페이지 > 설정 > 알림에서 언제든 변경 가능합니다.`,
  },
};

export function TermsDetailScreen() {
  const { slug } = useParams<{ slug: string }>();
  const { state, patch } = useSignup();
  const navigate = useNavigate();

  if (!slug || !(slug in DOCS)) {
    return <Navigate to="/signup/terms" replace />;
  }

  const doc = DOCS[slug as Slug];
  const alreadyAgreed = state[doc.field];

  const handleAgree = () => {
    patch({ [doc.field]: true } as Partial<typeof state>);
    navigate("/signup/terms", { replace: true });
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-gray-100 px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
          className="absolute left-2 flex h-10 w-10 items-center justify-center text-gray-700 active:scale-95"
        >
          <BackIcon />
        </button>
        <h1 className="text-base font-semibold text-gray-900">{doc.title}</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <span className="text-[11px] font-medium text-holo-purple-deep">
          [{doc.required ? "필수" : "선택"}]
        </span>
        <pre className="mt-3 whitespace-pre-wrap font-paperlogy text-sm leading-7 text-gray-700">
          {doc.body}
        </pre>
      </main>

      <div className="border-t border-gray-100 bg-white p-4">
        <button
          type="button"
          onClick={handleAgree}
          className="h-12 w-full rounded-full bg-holo-gradient text-sm font-semibold text-white shadow-md active:scale-[0.99]"
        >
          {alreadyAgreed ? "확인" : "동의하고 계속"}
        </button>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
