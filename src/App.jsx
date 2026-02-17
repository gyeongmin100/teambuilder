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
    hero: "무의미한 랜덤 팀 배정,\n이제 마침표를 찍으세요",
    subHero: "운에 맡긴 팀워크는 반드시 무너집니다. 팀원 개개인의 성향을 정밀 분석하여 갈등은 지우고 시너지만 남긴 '필승의 팀'을 구축하세요.",
    topBanner: "🔥 데이터로 증명하는 가장 과학적인 팀 빌딩 솔루션",
    startBtn: "지금 바로 팀 빌딩 시작",
    noLogin: "별도의 가입 없이 즉시 이용 가능",
    feature1Title: "근거 있는 공정한 배정",
    feature1Desc: "단순히 섞는 것이 아닙니다. 성향 데이터 분석을 통해 모두가 인정할 수밖에 없는 완벽한 배정 근거를 제시합니다.",
    feature2Title: "결과로 증명하는 팀 시너지",
    feature2Desc: "리더와 조력자, 분석가의 황금 비율을 찾아 팀의 퍼포먼스를 폭발적으로 끌어올립니다.",
    inputTitle: "참여자 명단 작성",
    uploadBtn: "엑셀 / CSV 업로드",
    googleFormTip: "구글폼 팁: 응답 시트의 데이터를 복사(Ctrl + C)하여 이름 칸에 붙여넣으세요.",
    addBtn: "다음 참여자 추가",
    teamSizeLabel: "팀당 목표 인원",
    assignBtn: "AI 분석 및 필승의 팀 배정",
    loadingTitle: "팀원 성향과 시너지를 분석 중입니다",
    loadingDesc: "최적의 조합을 찾는 데 약 10초가 소요됩니다.",
    resultTitle: "분석 완료! 최고의 시너지 팀",
    resultDesc: "각 팀의 성향 밸런스와 생산성을 극대화하여 배정했습니다.",
    exportBtn: "엑셀 파일(CSV)로 내려받기",
    retryBtn: "데이터 수정 후 다시 배정하기",
    terms: "이용약관",
    privacy: "개인정보처리방침",
    refund: "환불정책",
    footerMsg: "Build winning teams, drive real results.",
    emptyAlert: "최소 2명 이상의 이름을 입력해 주세요.",
    namePlaceholder: "이름",
    introPlaceholder: "자기소개 또는 협업 스타일"
  },
  en: {
    title: "TeamBuilder AI",
    hero: "Stop Guessing.\nStart Building Winning Teams.",
    subHero: "Luck-based teamwork eventually fails. Eliminate conflict and maximize synergy by building teams based on precise individual trait analysis.",
    topBanner: "🔥 The most scientific team building solution based on data",
    startBtn: "Build Your Winning Team Now",
    noLogin: "Instant access without sign-up",
    feature1Title: "Data-Driven Fair Assignment",
    feature1Desc: "Go beyond simple shuffling. Provide undeniable evidence for assignments through deep trait analysis.",
    feature2Title: "Proven Team Synergy",
    feature2Desc: "Find the golden ratio of leaders, doers, and analysts to skyrocket your team's performance.",
    inputTitle: "Participant List",
    uploadBtn: "Upload Excel / CSV",
    googleFormTip: "Google Form Tip: Copy (Ctrl + C) response data and paste it into the name field.",
    addBtn: "Add Participant",
    teamSizeLabel: "Target Members Per Team",
    assignBtn: "Start AI Analysis & Assignment",
    loadingTitle: "Analyzing Synergy & Traits...",
    loadingDesc: "Finding the optimal combo in about 10 seconds.",
    resultTitle: "Analysis Complete! High-Synergy Teams",
    resultDesc: "Maximized team productivity and personality balance.",
    exportBtn: "Download as Excel (CSV)",
    retryBtn: "Edit Data and Re-assign",
    terms: "Terms",
    privacy: "Privacy",
    refund: "Refund",
    footerMsg: "Build winning teams, drive real results.",
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
      alert(lang === 'ko' ? "분석 중 오류가 발생했습니다. 다시 시도해 주세요." : "An error occurred. Please try again.");
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
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 break-keep">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white text-[11px] py-2 text-center font-bold tracking-[0.1em] uppercase">
        {t.topBanner}
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex justify-between items-center">
          <div 
            onClick={() => setStep('landing')}
            className="flex items-center gap-2 text-xl font-black text-blue-600 cursor-pointer hover:opacity-80 transition-all active:scale-95"
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
            <span className="text-slate-200 mx-1.5 opacity-50">|</span>
            <button 
              onClick={() => setLang('en')}
              className={`px-2 py-1 transition-colors ${lang === 'en' ? 'text-blue-600' : 'hover:text-slate-600'}`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12 md:py-24 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-10">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-blue-600 text-white rounded-[1.5rem] shadow-2xl shadow-blue-200">
                  <Users size={32} />
                </div>
              </div>
              <div className="space-y-5">
                <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] whitespace-pre-line">
                  {t.hero}
                </h1>
                <p className="text-[19px] text-slate-500 leading-relaxed font-semibold max-w-[95%] mx-auto">
                  {t.subHero}
                </p>
              </div>

              <div className="flex flex-col items-center gap-4 pt-10">
                <button 
                  onClick={() => setStep('input')}
                  className="w-full sm:w-80 py-6 bg-blue-600 text-white rounded-2xl text-[21px] font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-2"
                >
                  <Zap size={22} fill="currentColor" /> {t.startBtn}
                </button>
                <p className="text-xs text-slate-400 font-bold tracking-tight">{t.noLogin}</p>
              </div>

              <div className="grid grid-cols-1 gap-5 pt-16 text-left w-full">
                {[
                  { icon: ShieldCheck, title: t.feature1Title, desc: t.feature1Desc },
                  { icon: Award, title: t.feature2Title, desc: t.feature2Desc }
                ].map((f, i) => (
                  <div key={i} className="flex gap-6 p-7 bg-slate-50 rounded-[2.5rem] border border-slate-100 transition-all hover:shadow-sm">
                    <div className="shrink-0 text-blue-600 pt-1"><f.icon size={28} /></div>
                    <div className="space-y-1.5">
                      <h3 className="font-black text-slate-900 text-[19px] leading-snug">{f.title}</h3>
                      <p className="text-[15px] text-slate-500 leading-relaxed font-medium">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'input' && (
            <motion.div key="input" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full space-y-8">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="bg-blue-600 h-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.06)] border border-slate-50">
                <div className="flex flex-col gap-6 mb-10">
                  <div className="flex justify-between items-end">
                    <h2 className="text-2xl font-black tracking-tight">{t.inputTitle}</h2>
                    <label className="cursor-pointer flex items-center gap-2 text-[13px] font-bold text-blue-600 hover:text-blue-700 transition-colors px-4 py-2 bg-blue-50 rounded-xl">
                      <Upload size={14} /> {t.uploadBtn}
                      <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                  
                  <div className="flex gap-3 p-5 bg-amber-50 text-amber-900 rounded-2xl border border-amber-100 items-start shadow-sm">
                    <Info size={20} className="shrink-0 text-amber-600 mt-0.5" />
                    <p className="text-[14px] leading-relaxed font-semibold opacity-90">
                      {t.googleFormTip}
                    </p>
                  </div>
                </div>

                <div className="space-y-5 max-h-[45vh] overflow-y-auto pr-3 custom-scrollbar">
                  {participants.map((p, idx) => (
                    <div key={p.id} className="flex gap-4 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex-none flex items-center justify-center w-8 h-12 text-slate-300 font-black italic text-sm pt-1">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-2.5">
                        <input 
                          placeholder={t.namePlaceholder}
                          value={p.name}
                          onChange={(e) => updateParticipant(p.id, 'name', e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition text-[15px] font-bold placeholder:text-slate-300 shadow-sm"
                        />
                        <textarea 
                          placeholder={t.introPlaceholder}
                          value={p.intro}
                          onChange={(e) => updateParticipant(p.id, 'intro', e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-blue-500 outline-none transition text-[14px] font-medium h-20 resize-none placeholder:text-slate-300 shadow-sm"
                        />
                      </div>
                      <button onClick={() => removeParticipant(p.id)} className="flex-none text-slate-200 hover:text-red-500 transition-colors p-2 h-fit mt-2">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-10 space-y-5">
                  <button onClick={addParticipant} className="w-full py-4 border-2 border-dashed border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-blue-200 transition-all text-slate-400 hover:text-blue-500 font-bold text-[15px]">
                    + {t.addBtn}
                  </button>
                  
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-sm font-black text-slate-600 uppercase tracking-tight">{t.teamSizeLabel}</span>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setConfig(c => ({...c, teamSize: Math.max(2, c.teamSize-1)}))} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl font-bold hover:bg-slate-100 shadow-sm transition-colors text-lg">-</button>
                      <span className="w-6 text-center font-black text-xl">{config.teamSize}</span>
                      <button onClick={() => setConfig(c => ({...c, teamSize: Math.min(10, c.teamSize+1)}))} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl font-bold hover:bg-slate-100 shadow-sm transition-colors text-lg">+</button>
                    </div>
                  </div>

                  <button 
                    onClick={startAssign}
                    className="w-full py-6 bg-slate-900 text-white rounded-2xl text-[19px] font-black shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all transform hover:-translate-y-1 active:translate-y-0"
                  >
                    {t.assignBtn}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div key="loading" className="text-center py-24 space-y-10">
              <div className="relative w-28 h-28 mx-auto">
                <div className="absolute inset-0 border-[8px] border-slate-50 rounded-full"></div>
                <div className="absolute inset-0 border-[8px] border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.loadingTitle}</h3>
                <p className="text-slate-400 font-bold animate-pulse text-lg">{t.loadingDesc}</p>
              </div>
            </motion.div>
          )}

          {step === 'result' && (
            <motion.div key="result" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-10">
              <div className="text-center space-y-5">
                <div className="inline-flex p-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem] shadow-inner mb-2">
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="text-3xl font-black tracking-tight">{t.resultTitle}</h2>
                <p className="text-lg text-slate-500 font-semibold">{t.resultDesc}</p>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {teams.map((t) => (
                  <div key={t.id} className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.04)] border border-slate-100 hover:border-blue-100 transition-colors">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black flex items-center gap-3">
                        <span className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl text-base italic shadow-lg shadow-blue-100">#0{t.id}</span>
                        <span className="tracking-tighter uppercase">Team</span>
                      </h3>
                      <span className="text-[11px] font-black uppercase tracking-[0.15em] px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">Optimal Balance</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                      {t.members.map((m, i) => (
                        <div key={i} className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex flex-col gap-2 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-slate-900 text-base">{m.name}</span>
                            <span className="text-[11px] font-black px-2.5 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg uppercase tracking-tight">{m.role}</span>
                          </div>
                          <p className="text-[12px] text-slate-400 font-bold leading-snug line-clamp-1 italic">{m.style}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-6 bg-slate-900 rounded-[1.5rem] flex gap-4 shadow-xl">
                      <div className="text-blue-400 shrink-0 pt-1"><Zap size={18} fill="currentColor" /></div>
                      <p className="text-[13.5px] text-slate-200 leading-relaxed italic font-semibold opacity-90">
                        {t.analysis}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4 pt-8">
                <button onClick={exportCSV} className="w-full py-6 bg-emerald-600 text-white rounded-2xl text-[19px] font-black shadow-2xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                  <Download size={24} /> {t.exportBtn}
                </button>
                <button onClick={() => setStep('input')} className="w-full py-4 text-slate-400 hover:text-slate-600 font-black text-[15px] transition-colors">
                  {t.retryBtn}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-xl mx-auto px-6 py-20 border-t border-slate-50 text-center space-y-8">
        <div className="flex justify-center gap-8 text-[13px] font-black text-slate-400">
          <button onClick={() => setLegalView('terms')} className="hover:text-blue-600 transition-colors uppercase tracking-widest">{t.terms}</button>
          <button onClick={() => setLegalView('privacy')} className="hover:text-blue-600 transition-colors uppercase tracking-widest">{t.privacy}</button>
          <button onClick={() => setLegalView('refund')} className="hover:text-blue-600 transition-colors uppercase tracking-widest">{t.refund}</button>
        </div>
        <p className="text-[11px] text-slate-300 font-bold uppercase tracking-[0.25em]">&copy; 2026 TeamBuilder AI. {t.footerMsg}</p>
      </footer>
    </div>
  );
}

export default App;
