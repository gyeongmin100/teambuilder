import React from 'react';
import { ChevronLeft } from 'lucide-react';

const LAST_UPDATED = '2026-02-22';
const CONTACT_NOTICE_KO = '법률/개인정보/환불 관련 문의 채널은 서비스 내 고객지원 경로로 안내됩니다.';
const CONTACT_NOTICE_EN = 'For legal, privacy, and refund inquiries, use the in-service support channel.';

const LegalLayout = ({ title, children, onBack, lang = 'ko', onSwitchLang }) => (
  <section className="min-h-screen bg-[#f5f6f1] px-4 py-10 text-[#1a1f2e]">
    <div className="mx-auto max-w-3xl rounded-3xl border border-[#d9deea] bg-white p-8 shadow-[0_18px_40px_rgba(18,24,40,0.08)] md:p-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e7ec] pb-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d9deea] bg-white hover:bg-[#f8fafc]"
            aria-label="go-back"
          >
            <ChevronLeft className="h-5 w-5 text-[#344054]" />
          </button>
          <h2 className="text-2xl font-black tracking-tight">{title}</h2>
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-[#d9deea] text-sm">
          <button
            type="button"
            onClick={() => onSwitchLang?.('ko')}
            className={`px-3 py-1.5 ${lang === 'ko' ? 'bg-[#1a2138] text-white' : 'bg-white text-[#667085]'}`}
          >
            한국어
          </button>
          <button
            type="button"
            onClick={() => onSwitchLang?.('en')}
            className={`px-3 py-1.5 ${lang === 'en' ? 'bg-[#1a2138] text-white' : 'bg-white text-[#667085]'}`}
          >
            English
          </button>
        </div>
      </div>
      <div className="space-y-5 text-sm leading-7 text-[#344054]">{children}</div>
    </div>
  </section>
);

export const TermsOfService = ({ onBack, lang = 'ko', onSwitchLang }) => (
  <LegalLayout title={lang === 'ko' ? '이용약관' : 'Terms of Service'} onBack={onBack} lang={lang} onSwitchLang={onSwitchLang}>
    {lang === 'ko' ? (
      <>
        <p className="text-[#667085]">최종 업데이트: {LAST_UPDATED}</p>
        <h3 className="text-xl font-bold text-[#101828]">1. 적용 범위</h3>
        <p>본 약관은 TeamBuilder 웹 서비스의 데이터 입력, 팀 자동 배정, 결과 리포트 제공 기능에 적용됩니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">2. 계정과 접근</h3>
        <p>사용자는 본인 계정의 보안 유지 책임이 있으며, 무단 접근 또는 계정 공유로 발생한 문제에 책임을 집니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">3. 서비스 성격</h3>
        <p>서비스 출력은 의사결정 보조용이며 최종 운영 결정과 결과 책임은 사용자 또는 조직에 있습니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">4. 금지 행위</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>불법 데이터 업로드 및 제3자 권리 침해</li>
          <li>서비스 우회, 악성 트래픽, 리버스 엔지니어링 시도</li>
          <li>결제 악용 및 결과물의 불법 유통</li>
        </ul>
        <h3 className="text-xl font-bold text-[#101828]">5. 결제 및 제공 시점</h3>
        <p>유료 기능은 외부 결제 제공자를 통해 처리되며 결제 확인 후 분석 작업이 시작됩니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">6. 책임 제한</h3>
        <p>관련 법령이 허용하는 범위에서 간접적 또는 특별 손해에 대한 책임은 제한됩니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">7. 준거법 및 관할</h3>
        <p>본 약관은 대한민국 법령을 준거법으로 하며 분쟁은 관할 법원에 제기됩니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">8. 문의</h3>
        <p>{CONTACT_NOTICE_KO}</p>
      </>
    ) : (
      <>
        <p className="text-[#667085]">Last Updated: {LAST_UPDATED}</p>
        <h3 className="text-xl font-bold text-[#101828]">1. Scope</h3>
        <p>These Terms govern TeamBuilder web services for data input, automated team assignment, and report delivery.</p>
        <h3 className="text-xl font-bold text-[#101828]">2. Accounts and Access</h3>
        <p>You are responsible for your account security and any misuse from account sharing or unauthorized access.</p>
        <h3 className="text-xl font-bold text-[#101828]">3. Service Nature</h3>
        <p>Outputs are decision-support recommendations. Final operational decisions remain with you.</p>
        <h3 className="text-xl font-bold text-[#101828]">4. Prohibited Conduct</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>Illegal data uploads or third-party rights violations</li>
          <li>Bypass attempts, abuse traffic, or reverse engineering</li>
          <li>Payment abuse or unlawful redistribution of outputs</li>
        </ul>
        <h3 className="text-xl font-bold text-[#101828]">5. Payments and Delivery</h3>
        <p>Paid features are processed by third-party payment providers and analysis starts after payment confirmation.</p>
        <h3 className="text-xl font-bold text-[#101828]">6. Limitation of Liability</h3>
        <p>To the extent permitted by law, liability for indirect or special damages is limited.</p>
        <h3 className="text-xl font-bold text-[#101828]">7. Governing Law and Venue</h3>
        <p>These Terms are governed by the laws of the Republic of Korea and disputes are handled by competent courts.</p>
        <h3 className="text-xl font-bold text-[#101828]">8. Contact</h3>
        <p>{CONTACT_NOTICE_EN}</p>
      </>
    )}
  </LegalLayout>
);

export const RefundPolicy = ({ onBack, lang = 'ko', onSwitchLang }) => (
  <LegalLayout title={lang === 'ko' ? '환불정책' : 'Refund Policy'} onBack={onBack} lang={lang} onSwitchLang={onSwitchLang}>
    {lang === 'ko' ? (
      <>
        <p className="text-[#667085]">최종 업데이트: {LAST_UPDATED}</p>
        <h3 className="text-xl font-bold text-[#101828]">1. 기본 원칙</h3>
        <p>결제 직후 분석 자원이 할당되므로 단순 변심 환불은 제한됩니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">2. 환불 가능 사유</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>중복 결제</li>
          <li>결제 완료 후 시스템 장애로 결과 생성 실패</li>
          <li>운영 측 중대한 결함으로 서비스 목적 달성 불가</li>
        </ul>
        <h3 className="text-xl font-bold text-[#101828]">3. 환불 불가 사유</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>사용자 입력 데이터 오류/누락</li>
          <li>추천 결과에 대한 주관적 불만</li>
          <li>정책 위반으로 인한 이용 제한</li>
        </ul>
        <h3 className="text-xl font-bold text-[#101828]">4. 신청 기한</h3>
        <p>결제 시점 기준 7일 이내 결제 식별자와 증빙을 제출해야 합니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">5. 처리 기간</h3>
        <p>영업일 5일 내 1차 결과를 안내하며 최종 환급 시점은 결제사 정책을 따릅니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">6. 문의</h3>
        <p>{CONTACT_NOTICE_KO}</p>
      </>
    ) : (
      <>
        <p className="text-[#667085]">Last Updated: {LAST_UPDATED}</p>
        <h3 className="text-xl font-bold text-[#101828]">1. General Rule</h3>
        <p>Because compute resources are allocated immediately after payment, change-of-mind refunds are restricted.</p>
        <h3 className="text-xl font-bold text-[#101828]">2. Eligible Cases</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>Duplicate charges</li>
          <li>Confirmed system failure after successful payment</li>
          <li>Material operator-attributable defects</li>
        </ul>
        <h3 className="text-xl font-bold text-[#101828]">3. Non-Refundable Cases</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>User data errors or omissions</li>
          <li>Subjective dissatisfaction with recommendations</li>
          <li>Access restriction due to policy violations</li>
        </ul>
        <h3 className="text-xl font-bold text-[#101828]">4. Request Window</h3>
        <p>Requests must be filed within 7 days of payment with transaction identifiers and evidence.</p>
        <h3 className="text-xl font-bold text-[#101828]">5. Processing Timeline</h3>
        <p>An initial decision is provided within 5 business days; settlement timing depends on payment providers.</p>
        <h3 className="text-xl font-bold text-[#101828]">6. Contact</h3>
        <p>{CONTACT_NOTICE_EN}</p>
      </>
    )}
  </LegalLayout>
);

export const PrivacyPolicy = ({ onBack, lang = 'ko', onSwitchLang }) => (
  <LegalLayout title={lang === 'ko' ? '개인정보처리방침' : 'Privacy Policy'} onBack={onBack} lang={lang} onSwitchLang={onSwitchLang}>
    {lang === 'ko' ? (
      <>
        <p className="text-[#667085]">최종 업데이트: {LAST_UPDATED}</p>
        <h3 className="text-xl font-bold text-[#101828]">1. 처리 원칙</h3>
        <p>최소 수집, 목적 제한, 보관 기간 제한 원칙에 따라 개인정보를 처리합니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">2. 처리 항목</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>계정 정보: 이메일, 인증 식별자</li>
          <li>입력 데이터: 참가자 식별자, 응답 필드, 사용자 입력 텍스트</li>
          <li>결제 정보: 결제 상태 및 거래 참조값</li>
          <li>기술 로그: 접속 시각, 오류 로그, 브라우저/기기 메타데이터</li>
        </ul>
        <h3 className="text-xl font-bold text-[#101828]">3. 처리 목적</h3>
        <p>인증, 팀 배정 연산, 결제 검증, 리포트 제공, 보안 모니터링 및 고객지원에 사용됩니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">4. 보관 및 파기</h3>
        <p>법령상 보관 의무 또는 운영상 최소 필요 기간 보관 후 안전하게 파기합니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">5. 제3자 처리</h3>
        <p>결제, 인증, 클라우드 인프라 제공 범위 내에서 필요한 처리만 수행합니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">6. 이용자 권리</h3>
        <p>법령상 예외를 제외하고 열람, 정정, 삭제, 처리 제한을 요청할 수 있습니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">7. 보안 조치</h3>
        <p>접근 통제, 최소 권한, 전송 구간 보호, 로그 모니터링 등 합리적 보안 조치를 적용합니다.</p>
        <h3 className="text-xl font-bold text-[#101828]">8. 문의</h3>
        <p>{CONTACT_NOTICE_KO}</p>
      </>
    ) : (
      <>
        <p className="text-[#667085]">Last Updated: {LAST_UPDATED}</p>
        <h3 className="text-xl font-bold text-[#101828]">1. Processing Principles</h3>
        <p>We process personal data under data minimization, purpose limitation, and storage limitation principles.</p>
        <h3 className="text-xl font-bold text-[#101828]">2. Data Categories</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>Account data: email and authentication identifiers</li>
          <li>Input data: participant identifiers, response fields, user-entered text</li>
          <li>Payment data: status and transaction references</li>
          <li>Technical logs: access timestamps, error traces, browser/device metadata</li>
        </ul>
        <h3 className="text-xl font-bold text-[#101828]">3. Purposes</h3>
        <p>Authentication, assignment computation, payment verification, report delivery, security monitoring, and support.</p>
        <h3 className="text-xl font-bold text-[#101828]">4. Retention and Deletion</h3>
        <p>Data is retained for legally required periods or operational minimum necessity and then securely deleted.</p>
        <h3 className="text-xl font-bold text-[#101828]">5. Third-Party Processing</h3>
        <p>Data may be processed by payment, auth, and cloud providers only as needed to provide the service.</p>
        <h3 className="text-xl font-bold text-[#101828]">6. Your Rights</h3>
        <p>You may request access, correction, deletion, and restriction of processing, subject to legal exceptions.</p>
        <h3 className="text-xl font-bold text-[#101828]">7. Security Controls</h3>
        <p>We implement reasonable controls including access restriction, least privilege, transport protection, and monitoring.</p>
        <h3 className="text-xl font-bold text-[#101828]">8. Contact</h3>
        <p>{CONTACT_NOTICE_EN}</p>
      </>
    )}
  </LegalLayout>
);
