import { useNavigate } from "react-router-dom";

export function TermsOfServiceScreen() {
  const navigate = useNavigate();
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-holo-line-3 px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          서비스 이용약관
        </span>
      </header>

      <article className="flex flex-col gap-4 px-4 pb-6 pt-2 text-[13px] leading-6 text-holo-ink-2">
        <p className="text-[12px] text-holo-ink-3">시행일: 2026.05.01 (v1.2)</p>

        <Section title="제1조 (목적)">
          본 약관은 HOLO(이하 "회사")가 제공하는 위치 기반 1인 가구 커뮤니티
          서비스(이하 "서비스")의 이용 조건과 절차, 회사와 회원 간의 권리·의무를
          규정함을 목적으로 합니다.
        </Section>

        <Section title="제2조 (용어의 정의)">
          · "회원"이라 함은 본 약관에 동의하고 서비스 이용 자격을 부여받은 자를
          말합니다.{"\n"}
          · "콘텐츠"라 함은 회원이 작성한 글·댓글·이미지·채팅 메시지 등 일체를
          말합니다.{"\n"}
          · "포인트"라 함은 서비스 내에서 활동을 통해 적립·사용하는 가상의
          재화를 말합니다.
        </Section>

        <Section title="제3조 (약관의 게시와 개정)">
          본 약관은 서비스 화면 또는 회사 웹사이트에 게시하며, 회사는 관련 법령을
          위반하지 않는 범위에서 약관을 개정할 수 있습니다. 회원에게 불리한
          개정의 경우 30일 전부터 공지합니다.
        </Section>

        <Section title="제4조 (회원가입)">
          서비스 이용을 원하는 자는 회사가 정한 양식에 따라 정보를 입력하고,
          본 약관에 동의함으로써 회원가입을 신청합니다. 만 14세 미만은
          회원가입이 제한됩니다.
        </Section>

        <Section title="제5조 (회원의 의무)">
          회원은 다음 행위를 해서는 안 됩니다.{"\n"}
          · 타인의 정보 도용{"\n"}
          · 회사 또는 제3자의 명예 훼손, 영업 방해{"\n"}
          · 음란물·폭력적 콘텐츠 게시{"\n"}
          · 상업적 광고·도배·자동화된 비정상 이용{"\n"}
          · 동네 인증을 허위로 우회하는 행위
        </Section>

        <Section title="제6조 (서비스의 제공 및 변경)">
          회사는 모임 모집, 채팅, 마이룸 꾸미기, 출석 이벤트 등의 서비스를
          제공합니다. 운영상·기술상 필요할 경우 서비스 일부 또는 전부를 변경
          또는 종료할 수 있으며, 사전에 공지합니다.
        </Section>

        <Section title="제7조 (포인트 정책)">
          포인트는 출석·게시·모임 참여 등의 활동으로 적립되며, 마이룸 가구
          구매·뱃지 교환 등에 사용할 수 있습니다. 포인트는 현금으로 환전할 수
          없으며, 회원 탈퇴 시 소멸됩니다.
        </Section>

        <Section title="제8조 (이용 제한 및 회원 자격 정지)">
          회사는 회원이 본 약관 또는 관련 법령을 위반한 경우 사전 통지 없이
          경고, 일시 정지, 영구 정지 등의 조치를 할 수 있습니다.
        </Section>

        <Section title="제9조 (책임 제한)">
          천재지변, 통신망 장애 등 회사의 합리적 통제 범위를 벗어난 사유로 인한
          서비스 중단에 대해서는 책임을 지지 않습니다. 회원 간 분쟁의 경우
          당사자 간 해결을 원칙으로 합니다.
        </Section>

        <Section title="제10조 (분쟁의 해결)">
          본 약관에 명시되지 않은 사항은 관련 법령 및 상관례에 따르며, 분쟁이
          발생할 경우 회사 본점 소재지 관할 법원을 1심 관할로 합니다.
        </Section>

        <p className="text-[11px] text-holo-ink-3">
          본 화면의 내용은 데모용 예시이며, 실제 출시 버전에서 법무 검토 후 확정됩니다.
        </p>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-[14px] font-semibold text-holo-ink">{title}</h2>
      <p className="whitespace-pre-line">{children}</p>
    </section>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
