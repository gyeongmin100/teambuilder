import React from 'react';
import { ChevronLeft } from 'lucide-react';

const LAST_UPDATED = '2026-02-22';
const CONTACT_NOTICE_KO = '법률/개인정보/환불 문의 연락처는 현재 미등록 상태이며, 운영 공지에서 확정 후 공개됩니다.';
const CONTACT_NOTICE_EN = 'Legal/privacy/refund contact details are not yet registered and will be published via official service notice.';

const LegalLayout = ({ title, children, onBack, lang = 'ko', onSwitchLang }) => (
  <section className="min-h-screen py-12 px-4 bg-slate-900 text-slate-200">
    <div className="max-w-3xl mx-auto bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 p-8 md:p-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={onBack} type="button" className="p-2 hover:bg-slate-700 rounded-full transition-colors" aria-label="go-back">
            <ChevronLeft className="text-slate-300" />
          </button>
          <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
        </div>
        <div className="inline-flex rounded-lg border border-slate-600 overflow-hidden text-sm">
          <button
            onClick={() => onSwitchLang?.('ko')}
            type="button"
            className={`px-3 py-1.5 ${lang === 'ko' ? 'bg-white text-slate-900 font-semibold' : 'bg-slate-800 text-slate-300'}`}
          >
            한글
          </button>
          <button
            onClick={() => onSwitchLang?.('en')}
            type="button"
            className={`px-3 py-1.5 ${lang === 'en' ? 'bg-white text-slate-900 font-semibold' : 'bg-slate-800 text-slate-300'}`}
          >
            English
          </button>
        </div>
      </div>
      <div className="space-y-5 leading-7 text-sm md:text-[15px] text-slate-300">{children}</div>
    </div>
  </section>
);

export const TermsOfService = ({ onBack, lang = 'ko', onSwitchLang }) => (
  <LegalLayout title={lang === 'ko' ? '이용약관' : 'Terms of Service'} onBack={onBack} lang={lang} onSwitchLang={onSwitchLang}>
    {lang === 'ko' ? (
      <>
        <p className="text-slate-400">최종 업데이트: {LAST_UPDATED}</p>
        <h3 className="text-xl font-semibold text-white">1. 적용 범위</h3>
        <p>본 약관은 TeamBuilder 서비스의 웹 접근, 데이터 입력, 자동 팀 배정, 결과 리포트 기능 이용에 적용됩니다.</p>
        <h3 className="text-xl font-semibold text-white">2. 계정과 접근</h3>
        <p>사용자는 계정 보안을 유지해야 하며 계정 공유, 무단 접근, 권한 오남용에 대한 책임은 사용자에게 있습니다.</p>
        <h3 className="text-xl font-semibold text-white">3. 서비스 성격</h3>
        <p>서비스 결과는 의사결정 보조 도구입니다. 최종 팀 편성 판단과 운영 책임은 사용자 또는 사용자 조직에 있습니다.</p>
        <h3 className="text-xl font-semibold text-white">4. 금지행위</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>법령 위반 데이터 업로드 또는 제3자 권리 침해</li>
          <li>시스템 안정성을 해치는 우회, 남용, 역공학</li>
          <li>허위 결제, 결제 악용, 결과물 불법 유통</li>
        </ul>
        <h3 className="text-xl font-semibold text-white">5. 결제와 제공 시점</h3>
        <p>유료 기능은 외부 결제대행사를 통해 결제되며, 결제 확인 후 분석이 시작됩니다.</p>
        <h3 className="text-xl font-semibold text-white">6. 책임 제한</h3>
        <p>관련 법령이 허용하는 범위 내에서 간접손해, 특별손해, 영업손실에 대한 책임을 제한합니다.</p>
        <h3 className="text-xl font-semibold text-white">7. 준거법 및 분쟁</h3>
        <p>본 약관은 대한민국 법령을 준거법으로 하며 분쟁은 관련 법령상 관할 법원에 제기합니다.</p>
        <h3 className="text-xl font-semibold text-white">8. 문의 채널</h3>
        <p>{CONTACT_NOTICE_KO}</p>
      </>
    ) : (
      <>
        <p className="text-slate-400">Last Updated: {LAST_UPDATED}</p>
        <h3 className="text-xl font-semibold text-white">1. Scope</h3>
        <p>These Terms apply to TeamBuilder services including web access, data input, automated team assignment, and report generation.</p>
        <h3 className="text-xl font-semibold text-white">2. Accounts and Access</h3>
        <p>You are responsible for account security, including misuse, account sharing, and unauthorized access.</p>
        <h3 className="text-xl font-semibold text-white">3. Service Nature</h3>
        <p>Outputs are decision-support recommendations. Final assignment and operational responsibility remain with you.</p>
        <h3 className="text-xl font-semibold text-white">4. Prohibited Conduct</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Illegal data uploads and third-party rights violations</li>
          <li>Abuse, bypass attempts, reverse engineering, and harmful traffic</li>
          <li>Payment fraud or unlawful redistribution of outputs</li>
        </ul>
        <h3 className="text-xl font-semibold text-white">5. Payments and Delivery</h3>
        <p>Paid features are processed by third-party payment providers and analysis starts after payment confirmation.</p>
        <h3 className="text-xl font-semibold text-white">6. Limitation of Liability</h3>
        <p>To the maximum extent permitted by law, liability for indirect, special, or consequential damages is limited.</p>
        <h3 className="text-xl font-semibold text-white">7. Governing Law and Venue</h3>
        <p>These Terms are governed by the laws of the Republic of Korea and disputes are subject to competent courts.</p>
        <h3 className="text-xl font-semibold text-white">8. Contact Channel</h3>
        <p>{CONTACT_NOTICE_EN}</p>
      </>
    )}
  </LegalLayout>
);

export const RefundPolicy = ({ onBack, lang = 'ko', onSwitchLang }) => (
  <LegalLayout title={lang === 'ko' ? '환불정책' : 'Refund Policy'} onBack={onBack} lang={lang} onSwitchLang={onSwitchLang}>
    {lang === 'ko' ? (
      <>
        <p className="text-slate-400">최종 업데이트: {LAST_UPDATED}</p>
        <h3 className="text-xl font-semibold text-white">1. 기본 원칙</h3>
        <p>디지털 서비스 특성상 결제 직후 분석 리소스가 할당되므로 단순 변심 환불은 제한됩니다.</p>
        <h3 className="text-xl font-semibold text-white">2. 환불 가능 사유</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>중복 결제</li>
          <li>결제 완료 후 서비스 장애로 결과 생성 실패</li>
          <li>운영자 귀책의 중대한 결함으로 서비스 목적 달성 불가</li>
        </ul>
        <h3 className="text-xl font-semibold text-white">3. 환불 불가 사유</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>사용자 입력 데이터 오류 또는 누락</li>
          <li>결과에 대한 주관적 불만족</li>
          <li>약관/정책 위반으로 제한된 건</li>
        </ul>
        <h3 className="text-xl font-semibold text-white">4. 요청 기한 및 절차</h3>
        <p>결제 시각 기준 7일 이내 결제 식별자와 증빙 자료를 포함해 요청해야 합니다.</p>
        <h3 className="text-xl font-semibold text-white">5. 처리 기간</h3>
        <p>영업일 기준 5일 내 1차 판단을 안내하며, 환급 반영 시점은 결제수단사 정책을 따릅니다.</p>
        <h3 className="text-xl font-semibold text-white">6. 문의 채널</h3>
        <p>{CONTACT_NOTICE_KO}</p>
      </>
    ) : (
      <>
        <p className="text-slate-400">Last Updated: {LAST_UPDATED}</p>
        <h3 className="text-xl font-semibold text-white">1. General Rule</h3>
        <p>Because compute resources are allocated immediately after payment, change-of-mind refunds are generally restricted.</p>
        <h3 className="text-xl font-semibold text-white">2. Eligible Cases</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Duplicate charges</li>
          <li>Confirmed system failure preventing report generation</li>
          <li>Material operator-attributable defects</li>
        </ul>
        <h3 className="text-xl font-semibold text-white">3. Non-Refundable Cases</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>User data errors or omissions</li>
          <li>Subjective dissatisfaction with recommendations</li>
          <li>Restricted usage due to policy violations</li>
        </ul>
        <h3 className="text-xl font-semibold text-white">4. Window and Procedure</h3>
        <p>Requests must be submitted within 7 days of payment with payment identifier and supporting evidence.</p>
        <h3 className="text-xl font-semibold text-white">5. Processing Timeline</h3>
        <p>An initial decision is provided within 5 business days. Final settlement timing depends on payment providers.</p>
        <h3 className="text-xl font-semibold text-white">6. Contact Channel</h3>
        <p>{CONTACT_NOTICE_EN}</p>
      </>
    )}
  </LegalLayout>
);

export const PrivacyPolicy = ({ onBack, lang = 'ko', onSwitchLang }) => (
  <LegalLayout title={lang === 'ko' ? '개인정보처리방침' : 'Privacy Policy'} onBack={onBack} lang={lang} onSwitchLang={onSwitchLang}>
    {lang === 'ko' ? (
      <>
        <p className="text-slate-400">최종 업데이트: {LAST_UPDATED}</p>
        <h3 className="text-xl font-semibold text-white">1. 처리 원칙</h3>
        <p>최소수집, 목적제한, 보관기간 제한 원칙에 따라 개인정보를 처리합니다.</p>
        <h3 className="text-xl font-semibold text-white">2. 처리 항목</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>계정 정보: 이메일, 인증 식별자</li>
          <li>연동/업로드 데이터: 참가자 식별값, 응답 항목, 사용자 입력 텍스트</li>
          <li>결제 식별값: 결제 상태 및 거래 참조값</li>
          <li>기술 로그: 접속 시간, 오류 로그, 브라우저/기기 정보</li>
        </ul>
        <h3 className="text-xl font-semibold text-white">3. 처리 목적</h3>
        <p>인증, 팀 배정 연산, 결제 검증, 리포트 제공, 보안 모니터링, 장애 대응 및 고객지원.</p>
        <h3 className="text-xl font-semibold text-white">4. 보관 및 파기</h3>
        <p>법령상 의무 또는 운영상 최소 필요 기간 보관 후 지체 없이 삭제합니다.</p>
        <h3 className="text-xl font-semibold text-white">5. 제3자 처리 및 이전</h3>
        <p>결제/인증/클라우드 인프라 제공사에 서비스 수행 목적 범위에서만 처리위탁 또는 이전이 발생할 수 있습니다.</p>
        <h3 className="text-xl font-semibold text-white">6. 이용자 권리</h3>
        <p>열람, 정정, 삭제, 처리정지 요청이 가능하며 법령상 예외가 없는 한 합리적 기간 내 처리합니다.</p>
        <h3 className="text-xl font-semibold text-white">7. 보안 조치</h3>
        <p>접근통제, 권한 최소화, 전송구간 보호, 로그 모니터링 등 합리적인 보안 통제를 운영합니다.</p>
        <h3 className="text-xl font-semibold text-white">8. 문의 채널</h3>
        <p>{CONTACT_NOTICE_KO}</p>
      </>
    ) : (
      <>
        <p className="text-slate-400">Last Updated: {LAST_UPDATED}</p>
        <h3 className="text-xl font-semibold text-white">1. Processing Principles</h3>
        <p>We process personal data under data-minimization, purpose-limitation, and storage-limitation principles.</p>
        <h3 className="text-xl font-semibold text-white">2. Data Categories</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Account data: email and authentication identifiers</li>
          <li>Connected/uploaded data: participant identifiers, response fields, user-entered text</li>
          <li>Payment identifiers: payment status and transaction references</li>
          <li>Technical logs: access timestamps, error traces, browser/device metadata</li>
        </ul>
        <h3 className="text-xl font-semibold text-white">3. Purposes</h3>
        <p>Authentication, team-assignment computation, payment verification, report delivery, security monitoring, incident response, and support.</p>
        <h3 className="text-xl font-semibold text-white">4. Retention and Deletion</h3>
        <p>Data is retained for legally required periods or minimum operational necessity, then securely deleted.</p>
        <h3 className="text-xl font-semibold text-white">5. Third-Party Processing and Transfers</h3>
        <p>Data may be processed by payment, authentication, and cloud providers only as necessary to deliver the service.</p>
        <h3 className="text-xl font-semibold text-white">6. Your Rights</h3>
        <p>You may request access, correction, deletion, and restriction of processing, subject to applicable legal exceptions.</p>
        <h3 className="text-xl font-semibold text-white">7. Security Controls</h3>
        <p>We implement reasonable controls including access restrictions, least privilege, transport protection, and monitoring.</p>
        <h3 className="text-xl font-semibold text-white">8. Contact Channel</h3>
        <p>{CONTACT_NOTICE_EN}</p>
      </>
    )}
  </LegalLayout>
);
