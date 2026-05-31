import { useNavigate } from "react-router-dom";

export function PrivacyPolicyScreen() {
  const navigate = useNavigate();
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-holo-line-3 px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          개인정보 처리방침
        </span>
      </header>

      <article className="flex flex-col gap-4 px-4 pb-6 pt-2 text-[13px] leading-6 text-holo-ink-2">
        <p className="text-[12px] text-holo-ink-3">시행일: 2026.05.01 (v1.3)</p>

        <Section title="제1조 (수집하는 개인정보 항목)">
          HOLO(이하 "회사")는 회원가입, 서비스 이용, 고객문의 응대 과정에서
          아래의 개인정보를 수집합니다.
          {"\n"}· 필수: 이메일, 비밀번호, 닉네임, 휴대폰 번호, 통신사
          {"\n"}· 선택: 위치 정보(동네 인증), 관심사 태그, 프로필 이미지
          {"\n"}· 자동 수집: 접속 IP, 기기 정보, 쿠키, 서비스 이용 기록
        </Section>

        <Section title="제2조 (개인정보의 수집 및 이용 목적)">
          회원 식별, 부정 이용 방지, 서비스 제공·개선, 본인 인증, 동네 기반
          모임 매칭, 알림 발송, 고객 문의 처리, 통계 분석 목적에 한해
          이용합니다.
        </Section>

        <Section title="제3조 (개인정보의 보유 및 이용 기간)">
          원칙적으로 회원 탈퇴 즉시 파기합니다. 단, 관계 법령에 따라 일정 기간
          보관할 수 있습니다.
          {"\n"}· 계약·청약철회 기록: 5년
          {"\n"}· 부정 이용 기록: 1년
          {"\n"}· 로그인 기록: 3개월
        </Section>

        <Section title="제4조 (개인정보의 제3자 제공)">
          회사는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다.
          단, 법령의 규정 또는 수사기관의 요청이 있는 경우는 예외입니다.
        </Section>

        <Section title="제5조 (개인정보 처리 위탁)">
          서비스 운영을 위해 아래 업체에 일부 업무를 위탁하고 있습니다.
          {"\n"}· Supabase Inc. — 클라우드 인프라 및 데이터베이스
          {"\n"}· NHN Cloud — SMS 본인인증
          {"\n"}· Sentry, GA4, PostHog — 이용 분석 및 오류 추적(가명 처리)
        </Section>

        <Section title="제6조 (이용자의 권리와 행사 방법)">
          이용자는 언제든지 본인의 개인정보를 조회·수정·삭제·처리정지할 수
          있습니다. 마이페이지 → 개인정보 → "내 데이터 다운로드 요청" 메뉴를
          이용하시거나 help@holo.app 으로 문의해주세요.
        </Section>

        <Section title="제7조 (개인정보의 안전성 확보 조치)">
          비밀번호 일방향 암호화, 전송 구간 SSL/TLS 적용, 접근 권한 최소화,
          정기적 보안 점검 및 침해 사고 대응 계획을 운영합니다.
        </Section>

        <Section title="제8조 (개인정보 보호책임자)">
          이름: 김홀로 / 직책: 개인정보보호책임자{"\n"}
          연락처: privacy@holo.app
        </Section>

        <Section title="제9조 (고지 의무)">
          본 처리방침이 변경되는 경우 시행 7일 전부터 앱 내 공지를 통해 알려드립니다.
          중요한 사항은 30일 전 고지하며, 푸시 알림 또는 이메일로도 안내합니다.
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
