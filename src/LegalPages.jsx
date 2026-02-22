import React from 'react';
import { ChevronLeft } from 'lucide-react';

const LegalLayout = ({ title, children, onBack, lang = 'ko', onSwitchLang }) => (
  <section className="min-h-screen py-12 px-4 bg-slate-900 text-slate-200">
    <div className="max-w-3xl mx-auto bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 p-8 md:p-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full transition-colors" aria-label="go-back">
            <ChevronLeft className="text-slate-300" />
          </button>
          <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
        </div>
        <div className="inline-flex rounded-lg border border-slate-600 overflow-hidden text-sm">
          <button
            onClick={() => onSwitchLang?.('ko')}
            className={`px-3 py-1.5 ${lang === 'ko' ? 'bg-white text-slate-900 font-semibold' : 'bg-slate-800 text-slate-300'}`}
          >
            KO
          </button>
          <button
            onClick={() => onSwitchLang?.('en')}
            className={`px-3 py-1.5 ${lang === 'en' ? 'bg-white text-slate-900 font-semibold' : 'bg-slate-800 text-slate-300'}`}
          >
            EN
          </button>
        </div>
      </div>
      <div className="prose prose-invert max-w-none text-slate-300 space-y-5 leading-7">
        {children}
      </div>
    </div>
  </section>
);

export const TermsOfService = ({ onBack, lang = 'ko', onSwitchLang }) => (
  <LegalLayout title={lang === 'ko' ? '이용약관' : 'Terms of Service'} onBack={onBack} lang={lang} onSwitchLang={onSwitchLang}>
    {lang === 'ko' ? (
      <>
        <h3 className="text-xl font-semibold text-white">제1조 (목적)</h3>
        <p>본 약관은 TeamBuilder AI(이하 "서비스")의 이용 조건, 결제, 책임 범위를 규정합니다.</p>

        <h3 className="text-xl font-semibold text-white">제2조 (서비스 내용)</h3>
        <p>서비스는 참가자 데이터를 기반으로 팀 구성 제안을 생성합니다. 결과는 의사결정 보조 도구이며, 최종 운영 책임은 사용자에게 있습니다.</p>

        <h3 className="text-xl font-semibold text-white">제3조 (계정 및 접근 권한)</h3>
        <p>Google 로그인은 폼/응답 조회 권한을 위해 사용됩니다. 계정 공유 및 무단 접근 시 발생한 손해는 사용자 책임입니다.</p>

        <h3 className="text-xl font-semibold text-white">제4조 (결제 및 제공 시점)</h3>
        <p>결제는 외부 결제 대행사를 통해 처리됩니다. 결제 완료 확인 후 분석이 시작되며, 결과 리포트가 생성됩니다.</p>

        <h3 className="text-xl font-semibold text-white">제5조 (면책)</h3>
        <p>AI 결과의 정확도는 입력 데이터 품질과 제약 조건의 명확성에 영향을 받습니다. 서비스는 결과 활용에 따른 직접/간접 손해를 보증하지 않습니다.</p>
      </>
    ) : (
      <>
        <h3 className="text-xl font-semibold text-white">Article 1 (Purpose)</h3>
        <p>These Terms define the conditions of use, payment flow, and liability scope of TeamBuilder AI.</p>

        <h3 className="text-xl font-semibold text-white">Article 2 (Service Scope)</h3>
        <p>The Service generates team assignment suggestions from participant data. Results are decision support, not guaranteed final outcomes.</p>

        <h3 className="text-xl font-semibold text-white">Article 3 (Account & Access)</h3>
        <p>Google sign-in is used for form/response access. Users are responsible for account misuse or unauthorized sharing.</p>

        <h3 className="text-xl font-semibold text-white">Article 4 (Payment & Delivery)</h3>
        <p>Payments are processed by a third-party provider. Analysis starts after payment verification and then a report is generated.</p>

        <h3 className="text-xl font-semibold text-white">Article 5 (Disclaimer)</h3>
        <p>Output quality depends on input quality and constraint clarity. The Service does not warrant outcomes from user operations.</p>
      </>
    )}
  </LegalLayout>
);

export const RefundPolicy = ({ onBack, lang = 'ko', onSwitchLang }) => (
  <LegalLayout title={lang === 'ko' ? '환불정책' : 'Refund Policy'} onBack={onBack} lang={lang} onSwitchLang={onSwitchLang}>
    {lang === 'ko' ? (
      <>
        <h3 className="text-xl font-semibold text-white">제1조 (기본 원칙)</h3>
        <p>결제 즉시 분석 리소스가 할당되는 디지털 서비스 특성상, 일반적으로 결제 완료 후 환불은 제한됩니다.</p>

        <h3 className="text-xl font-semibold text-white">제2조 (예외 환불)</h3>
        <p>아래 경우에는 예외적으로 환불 또는 재처리를 검토합니다.</p>
        <ul>
          <li>중복 결제</li>
          <li>결제 완료 후 시스템 오류로 결과가 생성되지 않은 경우</li>
          <li>운영사 확인이 가능한 명백한 기술 장애</li>
        </ul>

        <h3 className="text-xl font-semibold text-white">제3조 (요청 기한)</h3>
        <p>환불 요청은 결제 시점 기준 24시간 이내 접수해야 하며, 결제 식별자와 장애 증빙을 함께 제출해야 합니다.</p>
      </>
    ) : (
      <>
        <h3 className="text-xl font-semibold text-white">Article 1 (General Rule)</h3>
        <p>Because compute resources are allocated immediately after payment, refunds are generally restricted for completed transactions.</p>

        <h3 className="text-xl font-semibold text-white">Article 2 (Exception Cases)</h3>
        <p>Refund or reprocessing may be reviewed for:</p>
        <ul>
          <li>Duplicate payments</li>
          <li>No report generated due to verifiable system errors</li>
          <li>Confirmed operational incidents attributable to the service</li>
        </ul>

        <h3 className="text-xl font-semibold text-white">Article 3 (Request Window)</h3>
        <p>Requests must be submitted within 24 hours of payment with payment identifier and evidence.</p>
      </>
    )}
  </LegalLayout>
);

export const PrivacyPolicy = ({ onBack, lang = 'ko', onSwitchLang }) => (
  <LegalLayout title={lang === 'ko' ? '개인정보처리방침' : 'Privacy Policy'} onBack={onBack} lang={lang} onSwitchLang={onSwitchLang}>
    {lang === 'ko' ? (
      <>
        <h3 className="text-xl font-semibold text-white">제1조 (수집 항목)</h3>
        <p>서비스는 분석 수행에 필요한 범위에서 참가자 식별 정보, 응답 데이터, 결제 관련 식별자를 처리할 수 있습니다.</p>

        <h3 className="text-xl font-semibold text-white">제2조 (처리 목적)</h3>
        <p>수집 데이터는 팀 배정 분석, 결제 검증, 결과 리포트 생성 및 장애 대응에만 사용됩니다.</p>

        <h3 className="text-xl font-semibold text-white">제3조 (보관 및 파기)</h3>
        <p>분석 결과와 임시 데이터는 서비스 운영 정책에 따라 최소 기간만 보관 후 파기합니다. 브라우저 임시 저장 데이터는 사용자가 삭제할 수 있습니다.</p>

        <h3 className="text-xl font-semibold text-white">제4조 (제3자 제공)</h3>
        <p>결제 및 인증 처리를 위해 필요한 범위에서 결제사/인증사에 데이터가 전달될 수 있으며, 그 외 목적의 임의 제공은 하지 않습니다.</p>
      </>
    ) : (
      <>
        <h3 className="text-xl font-semibold text-white">Article 1 (Data We Process)</h3>
        <p>We may process participant identifiers, response data, and payment-related identifiers necessary for analysis and billing verification.</p>

        <h3 className="text-xl font-semibold text-white">Article 2 (Purpose)</h3>
        <p>Data is used only for team-assignment analysis, payment verification, report generation, and service reliability operations.</p>

        <h3 className="text-xl font-semibold text-white">Article 3 (Retention & Deletion)</h3>
        <p>Data is retained only as long as necessary for operations and then deleted according to policy. Browser-side temporary cache can be cleared by the user.</p>

        <h3 className="text-xl font-semibold text-white">Article 4 (Third-Party Processors)</h3>
        <p>Required data may be shared with payment/authentication processors strictly for service delivery and compliance.</p>
      </>
    )}
  </LegalLayout>
);
