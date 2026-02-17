import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import { 
  Users, 
  Trash2, 
  ChevronRight, 
  LayoutDashboard,
  Download,
  Upload,
  Info,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Award
} from 'lucide-react';
import { TermsOfService, RefundPolicy, PrivacyPolicy } from './LegalPages';

const translations = {
  ko: {
    title: "TeamBuilder AI",
    hero: "팀 짜느라 더 이상 밤새지 마세요.",
    subHero: "성향 분석 알고리즘이 10초 만에 갈등 없는 완벽한 팀을 구성합니다.",
    topBanner: "🔥 데이터 분석 기반의 가장 공정한 팀 빌딩 솔루션",
    startBtn: "지금 바로 팀 짜기",
    noLogin: "별도의 가입 없이 즉시 이용 가능",
    feature1Title: "불만 없는 공정한 배정",
    feature1Desc: "주관을 배제한 성향 데이터 분석으로 모두가 납득하는 결과를 만듭니다.",
    feature2Title: "전문가 수준의 팀 다이내믹",
    feature2Desc: "리더와 실행가, 분석가의 황금 비율을 찾아 팀의 생산성을 극대화합니다.",
    inputTitle: "참여자 명단 작성",
    uploadBtn: "엑셀/CSV 업로드",
    googleFormTip: "구글폼 팁: 응답 시트의 데이터를 복사(Ctrl+C)하여 이름 칸에 붙여넣으세요.",
    addBtn: "다음 참여자 추가",
    teamSizeLabel: "팀당 목표 인원",
    assignBtn: "데이터 분석 및 팀 배정 시작",
    loadingTitle: "팀원들의 데이터를 정밀 분석 중입니다",
    loadingDesc: "약 10초 정도 소요됩니다...",
    resultTitle: "분석 완료! 최적의 팀 구성안",
    resultDesc: "각 팀의 성향 밸런스를 최우선으로 배정했습니다.",
    exportBtn: "엑셀 파일(CSV)로 내려받기",
    retryBtn: "데이터 수정하고 다시 배정하기",
    terms: "이용약관",
    privacy: "개인정보처리방침",
    refund: "환불정책",
    footerMsg: "High-Performance Team Dynamics.",
    emptyAlert: "최소 2명 이상의 이름을 입력해주세요.",
    namePlaceholder: "이름",
    introPlaceholder: "자기소개 또는 협업 스타일"
  },
  en: {
    title: "TeamBuilder AI",
    hero: "Stop spending hours building teams.",
    subHero: "AI algorithm builds the perfect conflict-free team in just 10 seconds.",
    topBanner: "🔥 The fairest team building solution based on data analysis",
    startBtn: "Start Building Teams",
    noLogin: "Instant access without sign-up",
    feature1Title: "Fair & Bias-Free Assignment",
    feature1Desc: "Create results everyone accepts by analyzing personality data without subjectivity.",
    feature2Title: "Expert-Level Team Dynamics",
    feature2Desc: "Find the golden ratio of leaders, doers, and analysts to maximize productivity.",
    inputTitle: "Participant List",
    uploadBtn: "Upload Excel/CSV",
    googleFormTip: "Google Form Tip: Copy (Ctrl+C) response data and paste it into the name field.",
    addBtn: "Add Participant",
    teamSizeLabel: "Target Members Per Team",
    assignBtn: "Start AI Analysis & Assignment",
    loadingTitle: "Analyzing Participant Data...",
    loadingDesc: "This will take about 10 seconds...",
    resultTitle: "Analysis Complete! Optimal Teams",
    resultDesc: "Prioritized team dynamics and personality balance.",
    exportBtn: "Download as Excel (CSV)",
    retryBtn: "Edit Data and Re-assign",
    terms: "Terms",
    privacy: "Privacy",
    refund: "Refund",
    footerMsg: "High-Performance Team Dynamics.",
    emptyAlert: "Please enter at least 2 names.",
    namePlaceholder: "Name",
    introPlaceholder: "Self-intro or collaboration style"
  }
};

function App() {
  const [lang, setLang] = useState('ko');
  const [step, setStep] = useState('landing'); 
  const [legalView, setLegalView] = useState(null);
  const [participants, setParticipants] = useState([{ id: 1, name: '', intro: '' }]);
  const [config, setConfig] = useState({ teamSize: 4 });
  const [teams, setTeams] = useState([]);
  const t = translations[lang];

  const progress = Math.min(100, (participants.filter(p => p.name).length / 10) * 100);

  if (legalView === 'terms') return <TermsOfService lang={lang} onBack={() => setLegalView(null)} />;
  if (legalView === 'privacy') return <PrivacyPolicy lang={lang} onBack={() => setLegalView(null)} />;
  if (legalView === 'refund') return <RefundPolicy lang={lang} onBack={() => setLegalView(null)} />;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const newParticipants = results.data.map((row, index) => ({
            id: Date.now() + index,
            name: row.이름 || row.name || row.Name || '',
            intro: row.자기소개 || row.intro || row.Intro || ''
          })).filter(p => p.name);
          setParticipants(prev => [...prev.filter(p => p.name), ...newParticipants]);
        }
      });
    }
  };

  const addParticipant = () => setParticipants([...participants, { id: Date.now(), name: '', intro: '' }]);
  const removeParticipant = (id) => setParticipants(participants.filter(p => p.id !== id));
  const updateParticipant = (id, field, value) => {
    setParticipants(participants.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const startAssign = async () => {
    const validOnes = participants.filter(p => p.name);
    if (validOnes.length < 2) {
      alert(t.emptyAlert);
      return;
    }
    setStep('loading');
    performAssignment(validOnes, config);
  };

  const performAssignment = async (pList, pConfig) => {
    try {
      const response = await fetch('/api/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: pList, config: pConfig })
      });
      const data = await response.json();
      if (data.teams) {
        setTeams(data.teams);
        setStep('result');
      } else { throw new Error(data.error); }
    } catch (error) {
      alert(lang === 'ko' ? "오류가 발생했습니다." : "An error occurred.");
      setStep('input');
    }
  };

  const exportCSV = () => {
    let csv = "\uFEFFTeam,Name,Role,Insight\n";
    teams.forEach(t => t.members.forEach(m => csv += `${t.id},${m.name},${m.role},"${m.style}"\n`));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `TeamBuilder_Result.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      <div className="bg-slate-900 text-white text-[11px] py-1.5 text-center font-medium tracking-wider uppercase">
        {t.topBanner}
      </div>

      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex justify-between items-center">
          <div 
            onClick={() => setStep('landing')}
            className="flex items-center gap-2 text-xl font-black text-blue-600 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Users className="size-6" fill="currentColor" /> {t.title}
          </div>
          <div className="flex items-center text-[13px] font-bold text-slate-400">
            <button 
              onClick={() => setLang('ko')}
              className={`px-2 py-1 transition-colors ${lang === 'ko' ? 'text-blue-600' : 'hover:text-slate-600'}`}
            >
              KR
            </button>
            <span className="text-slate-200">|</span>
            <button 
              onClick={() => setLang('en')}
              className={`px-2 py-1 transition-colors ${lang === 'en' ? 'text-blue-600' : 'hover:text-slate-600'}`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-8">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-200">
                  <Users size={32} />
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                  {t.hero}
                </h1>
                <p className="text-lg text-slate-500 leading-relaxed font-medium">
                  {t.subHero}
                </p>
              </div>

              <div className="flex flex-col items-center gap-4 pt-6">
                <button 
                  onClick={() => setStep('input')}
                  className="w-full sm:w-80 py-5 bg-blue-600 text-white rounded-2xl text-xl font-bold shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  <Zap size={20} fill="currentColor" /> {t.startBtn}
                </button>
                <p className="text-xs text-slate-400 font-medium">{t.noLogin}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-12 text-left">
                {[
                  { icon: ShieldCheck, title: t.feature1Title, desc: t.feature1Desc },
                  { icon: Award, title: t.feature2Title, desc: t.feature2Desc }
                ].map((f, i) => (
                  <div key={i} className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="shrink-0 text-blue-600"><f.icon size={24} /></div>
                    <div>
                      <h3 className="font-bold text-slate-900">{f.title}</h3>
                      <p className="text-sm text-slate-500 leading-snug mt-1">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'input' && (
            <motion.div key="input" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full space-y-8">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="bg-blue-600 h-full" />
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
                <div className="flex flex-col gap-6 mb-10">
                  <div className="flex justify-between items-end">
                    <h2 className="text-2xl font-black tracking-tight">{t.inputTitle}</h2>
                    <label className="cursor-pointer flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors px-3 py-1.5 bg-blue-50 rounded-lg">
                      <Upload size={14} /> {t.uploadBtn}
                      <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                  
                  <div className="flex gap-2 p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 items-start">
                    <Info size={18} className="shrink-0 mt-0.5" />
                    <p className="text-[13px] leading-relaxed font-medium">
                      {t.googleFormTip}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-3 custom-scrollbar">
                  {participants.map((p, idx) => (
                    <div key={p.id} className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex-none flex items-center justify-center w-8 h-10 text-slate-300 font-black italic text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          placeholder={t.namePlaceholder}
                          value={p.name}
                          onChange={(e) => updateParticipant(p.id, 'name', e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition text-sm font-bold placeholder:text-slate-300"
                        />
                        <textarea 
                          placeholder={t.introPlaceholder}
                          value={p.intro}
                          onChange={(e) => updateParticipant(p.id, 'intro', e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition text-sm font-medium h-16 resize-none placeholder:text-slate-300"
                        />
                      </div>
                      <button onClick={() => removeParticipant(p.id)} className="flex-none text-slate-200 hover:text-red-400 transition-colors p-2 h-fit mt-1">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 space-y-4">
                  <button onClick={addParticipant} className="w-full py-4 border-2 border-dashed border-slate-100 rounded-2xl hover:bg-slate-50 transition-all text-slate-400 hover:text-slate-600 font-bold text-sm">
                    + {t.addBtn}
                  </button>
                  
                  <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl">
                    <span className="text-sm font-black text-slate-600 uppercase tracking-tighter">{t.teamSizeLabel}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setConfig(c => ({...c, teamSize: Math.max(2, c.teamSize-1)}))} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg font-bold hover:bg-slate-100">-</button>
                      <span className="w-6 text-center font-black text-lg">{config.teamSize}</span>
                      <button onClick={() => setConfig(c => ({...c, teamSize: Math.min(10, c.teamSize+1)}))} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg font-bold hover:bg-slate-100">+</button>
                    </div>
                  </div>

                  <button 
                    onClick={startAssign}
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl text-lg font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all transform hover:-translate-y-1 active:translate-y-0"
                  >
                    {t.assignBtn}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div key="loading" className="text-center py-24 space-y-10">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-[6px] border-slate-50 rounded-full"></div>
                <div className="absolute inset-0 border-[6px] border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.loadingTitle}</h3>
                <p className="text-slate-400 font-medium animate-pulse">{t.loadingDesc}</p>
              </div>
            </motion.div>
          )}

          {step === 'result' && (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-8">
              <div className="text-center space-y-4">
                <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-2xl mb-2">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-3xl font-black tracking-tight">{t.resultTitle}</h2>
                <p className="text-slate-500 font-medium">{t.resultDesc}</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {teams.map((t) => (
                  <div key={t.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black flex items-center gap-2">
                        <span className="text-blue-600">#0{t.id}</span> TEAM
                      </h3>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">Balanced</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                      {t.members.map((m, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-slate-900">{m.name}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 bg-white border border-slate-200 text-slate-500 rounded-md uppercase">{m.role}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium leading-tight line-clamp-1">{m.style}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-5 bg-slate-900 rounded-2xl flex gap-3">
                      <div className="text-blue-400 shrink-0"><Zap size={16} fill="currentColor" /></div>
                      <p className="text-[12px] text-slate-300 leading-relaxed italic font-medium">
                        {t.analysis}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 pt-8">
                <button onClick={exportCSV} className="w-full py-5 bg-emerald-600 text-white rounded-2xl text-lg font-black shadow-2xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                  <Download size={20} /> {t.exportBtn}
                </button>
                <button onClick={() => setStep('input')} className="w-full py-4 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors">
                  {t.retryBtn}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-xl mx-auto px-6 py-16 border-t border-slate-100 text-center space-y-6">
        <div className="flex justify-center gap-6 text-xs font-bold text-slate-400">
          <button onClick={() => setLegalView('terms')} className="hover:text-blue-600">{t.terms}</button>
          <button onClick={() => setLegalView('privacy')} className="hover:text-blue-600">{t.privacy}</button>
          <button onClick={() => setLegalView('refund')} className="hover:text-blue-600">{t.refund}</button>
        </div>
        <p className="text-[10px] text-slate-300 font-medium uppercase tracking-[0.2em]">&copy; 2026 TeamBuilder AI. {t.footerMsg}</p>
      </footer>
    </div>
  );
}

export default App;
