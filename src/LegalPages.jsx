import React from 'react';
import { ChevronLeft } from 'lucide-react';

const LegalLayout = ({ title, children, onBack }) => (
  <section className="min-h-screen py-12 px-4 bg-slate-900 text-slate-200 animate-in fade-in duration-500">
    <div className="max-w-3xl mx-auto bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 p-8 md:p-12">
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-700">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-700 rounded-full transition-colors"
        >
          <ChevronLeft className="text-slate-400" />
        </button>
        <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
      </div>
      <div className="prose prose-invert max-w-none text-slate-300 space-y-6">
        {children}
      </div>
    </div>
  </section>
);

export const TermsOfService = ({ onBack, lang = 'ko' }) => (
  <LegalLayout title={lang === 'ko' ? "이용약관" : "Terms of Service"} onBack={onBack}>
    {lang === 'ko' ? (
      <>
        <h3 className="text-xl font-semibold text-white">제1조 (목적)</h3>
        <p>본 약관은 TeamBuilder AI(이하 "서비스")가 제공하는 AI 기반 팀 배정 및 관련 서비스의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.</p>
        <h3 className="text-xl font-semibold text-white">제2조 (서비스의 제공)</h3>
        <p>서비스는 사용자가 입력한 참여자 정보와 자기소개 데이터를 AI 알고리즘으로 분석하여 최적의 팀 구성안을 제공합니다. 제공되는 결과는 AI의 분석 예측치이며, 실제 팀 운영 결과와는 차이가 있을 수 있습니다.</p>
        <h3 className="text-xl font-semibold text-white">제3조 (요금 및 결제)</h3>
        <p>1. 서비스는 유료로 제공될 수 있으며, 결제는 Polar 등 회사가 지정한 결제 대행사를 통해 이루어집니다.<br/>2. 결제가 완료된 후 AI 분석이 시작되며 결과 보고서가 생성됩니다.</p>
      </>
    ) : (
      <>
        <h3 className="text-xl font-semibold text-white">Article 1 (Purpose)</h3>
        <p>These terms aim to regulate the use of AI-based team assignment services provided by TeamBuilder AI.</p>
        <h3 className="text-xl font-semibold text-white">Article 2 (Service Provision)</h3>
        <p>The service provides optimal team configurations by analyzing participant information using AI. Results are predictions and may differ from actual outcomes.</p>
      </>
    )}
  </LegalLayout>
);

export const RefundPolicy = ({ onBack, lang = 'ko' }) => (
  <LegalLayout title={lang === 'ko' ? "환불 정책" : "Refund Policy"} onBack={onBack}>
    {lang === 'ko' ? (
      <>
        <h3 className="text-xl font-semibold text-white">제1조 (환불 원칙)</h3>
        <p>본 서비스는 결제 즉시 AI 분석이 실행되고 결과가 생성되는 "디지털 콘텐츠" 특성상, <strong>결제 후 환불이 원칙적으로 불가능</strong>합니다.</p>
        <h3 className="text-xl font-semibold text-white">제2조 (예외적 환불)</h3>
        <p>단, 시스템 오류로 인해 24시간 이내에 결과를 확인하지 못한 경우나 중복 결제의 경우 고객센터를 통해 환불이 가능합니다.</p>
      </>
    ) : (
      <>
        <h3 className="text-xl font-semibold text-white">Article 1 (Refund Principle)</h3>
        <p>Due to the nature of digital content where AI analysis starts immediately, <strong>refunds are generally not available</strong> after payment.</p>
      </>
    )}
  </LegalLayout>
);

export const PrivacyPolicy = ({ onBack, lang = 'ko' }) => (
  <LegalLayout title={lang === 'ko' ? "개인정보 처리방침" : "Privacy Policy"} onBack={onBack}>
    {lang === 'ko' ? (
      <>
        <h3 className="text-xl font-semibold text-white">제1조 (수집 항목)</h3>
        <p>서비스 제공을 위해 참여자 이름, 자기소개 글, 결제 정보를 수집합니다.</p>
        <h3 className="text-xl font-semibold text-white">제2조 (이용 목적)</h3>
        <p>수집된 정보는 오직 <strong>AI 팀 배정 분석 및 결과 생성</strong> 목적으로만 사용됩니다.</p>
        <h3 className="text-xl font-semibold text-white">제3조 (파기)</h3>
        <p>입력된 텍스트 데이터는 분석 완료 후 서버에서 즉시 파기되거나 익명화 처리됩니다.</p>
      </>
    ) : (
      <>
        <h3 className="text-xl font-semibold text-white">Article 1 (Collection)</h3>
        <p>We collect participant names, intros, and payment info for service delivery.</p>
      </>
    )}
  </LegalLayout>
);
