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
  Award,
  FileText,
  Copy,
  Layout
} from 'lucide-react';
import { TermsOfService, RefundPolicy, PrivacyPolicy } from './LegalPages';

const translations = {
  ko: {
    title: "TeamBuilder AI",
    topBanner: "🔥 데이터 분석 기반의 가장 공정한 팀 빌딩 솔루션",
    hero: "운에 맡기는 팀 배정은 이제 그만",
    subHero: "랜덤 배정이 만든 팀 갈등과 불만, 이제 팀원 각자의 특성을 반영한 맞춤형 배정으로 해결하세요.",
    startBtn: "지금 바로 팀 짜기",
    noLogin: "별도의 가입 없이 즉시 이용 가능",
    feature1Title: "엑셀 / CSV 업로드",
    feature1Desc: "기존 참여자 명단을 한 번에 불러와서 빠르게 배정할 수 있습니다.",
    feature2Title: "구글폼 데이터 연계",
    feature2Desc: "설문 응답 결과를 복사해서 붙여넣기만 하면 분석이 시작됩니다.",
    feature3Title: "시각화 분석 리포트",
    feature3Desc: "팀별 성향 분석과 배정 근거를 포함한 리포트를 제공합니다.",
    inputTitle: "참여자 명단 작성",
    uploadBtn: "엑셀 / CSV 업로드",
    googleFormTip: "구글폼 팁: 응답 시트의 데이터를 복사(Ctrl + C)하여 이름 칸에 붙여넣으세요.",
    addBtn: "다음 참여자 추가",
    teamSizeLabel: "팀당 목표 인원",
    assignBtn: "데이터 분석 및 팀 배정 시작",
    loadingTitle: "팀원들의 데이터를 정밀 분석 중입니다",
    loadingDesc: "약 10초 정도 소요됩니다.",
    resultTitle: "분석 완료! 최적의 팀 구성안",
    resultDesc: "각 팀의 성향 밸런스를 최우선으로 고려하여 배정했습니다.",
    exportBtn: "엑셀 파일(CSV)로 내려받기",
    retryBtn: "데이터 수정 후 다시 배정하기",
    terms: "이용약관",
    privacy: "개인정보처리방침",
    refund: "환불정책",
    footerMsg: "High-Performance Team Dynamics.",
    emptyAlert: "최소 2명 이상의 이름을 입력해 주세요.",
    namePlaceholder: "이름",
    introPlaceholder: "자기소개 또는 협업 스타일"
  },
  en: {
    title: "TeamBuilder AI",
    topBanner: "🔥 The fairest team building solution based on data analysis",
    hero: "Stop relying on luck for team building",
    subHero: "Solve the conflicts and dissatisfaction of random assignments with custom teams that reflect each member's unique traits.",
    startBtn: "Start Building Teams",
    noLogin: "Instant access without sign-up",
    feature1Title: "Excel / CSV Upload",
    feature1Desc: "Load your existing participant list all at once for fast assignment.",
    feature2Title: "Google Form Sync",
    feature2Desc: "Just copy and paste your survey responses to start the analysis.",
    feature3Title: "Visual Analysis Report",
    feature3Desc: "Provides reports including personality analysis and assignment logic.",
    inputTitle: "Participant List",
    uploadBtn: "Upload Excel / CSV",
    googleFormTip: "Google Form Tip: Copy (Ctrl + C) response data and paste it into the name field.",
    addBtn: "Add Participant",
    teamSizeLabel: "Target Members Per Team",
    assignBtn: "Start AI Analysis & Assignment",
    loadingTitle: "Analyzing Participant Data...",
    loadingDesc: "This will take about 10 seconds.",
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
      alert(lang === 'ko' ? "분석 중 오류가 발생했습니다." : "An error occurred.");
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 break-keep">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white text-[11px] py-2 text-center font-bold tracking-widest uppercase">
        {t.topBanner}
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
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

      <main className="max-w-5xl mx-auto px-4 py-12 md:py-20">
        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="text-center space-y-12">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-4">
                  <CheckCircle2 className="size-4" /> 100% 데이터 기반 지능형 분석
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                  {t.hero}
                </h1>
                <p className="text-lg md:text-xl text-slate-500 max-w-3xl mx-auto leading-relaxed font-medium">
                  {t.subHero}
                </p>
                <div className="pt-6">
                  <button 
                    onClick={() => setStep('input')}
                    className="group relative inline-flex items-center justify-center gap-2 px-10 py-5 bg-blue-600 text-white rounded-2xl text-xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
                  >
                    {t.startBtn} <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <p className="mt-4 text-xs text-slate-400 font-bold tracking-tight">{t.noLogin}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left">
                {[
                  { icon: FileText, title: t.feature1Title, desc: t.feature1Desc },
                  { icon: Copy, title: t.feature2Title, desc: t.feature2Desc },
                  { icon: LayoutDashboard, title: t.feature3Title, desc: t.feature3Desc }
                ].map((f, i) => (
                  <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-6">
                      <f.icon className="size-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg mb-2">{f.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">{f.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'input' && (
            <motion.div key="input" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto space-y-8">
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="bg-blue-600 h-full" />
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-slate-200/50 border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <h2 className="text-2xl font-black tracking-tight">{t.inputTitle}</h2>
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition">
                    <Upload size={16} /> {t.uploadBtn}
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 mb-8 flex gap-3 items-start">
                  <Info className="size-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 leading-relaxed font-semibold">
                    {t.googleFormTip}
                  </p>
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {participants.map((p, idx) => (
                    <div key={p.id} className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex-none flex items-center justify-center w-8 h-10 text-slate-300 font-black italic text-xs">
                        {idx + 1}
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input 
                          placeholder={t.namePlaceholder}
                          value={p.name}
                          onChange={(e) => updateParticipant(p.id, 'name', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition shadow-sm font-bold text-sm"
                        />
                        <input 
                          placeholder={t.introPlaceholder}
                          value={p.intro}
                          onChange={(e) => updateParticipant(p.id, 'intro', e.target.value)}
                          className="w-full md:col-span-3 bg-white border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition shadow-sm text-sm"
                        />
                      </div>
                      <button onClick={() => removeParticipant(p.id)} className="flex-none text-slate-300 hover:text-red-500 p-2 h-fit transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button onClick={addParticipant} className="py-4 border-2 border-dashed border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-slate-50 transition-all text-slate-400 hover:text-blue-600 font-bold text-sm">
                    + {t.addBtn}
                  </button>
                  <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-200">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">{t.teamSizeLabel}</span>
                    <input 
                      type="number" min="2" max="10"
                      value={config.teamSize}
                      onChange={(e) => setConfig({...config, teamSize: parseInt(e.target.value)})}
                      className="w-16 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-center font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    />
                  </div>
                </div>

                <div className="mt-10">
                  <button 
                    onClick={startAssign}
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl text-xl font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all transform hover:-translate-y-1 active:translate-y-0"
                  >
                    {t.assignBtn}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div key="loading" className="text-center py-32 space-y-10">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-8 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-8 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
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
                <div className="inline-flex p-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem] mb-2">
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="text-3xl font-black tracking-tight">{t.resultTitle}</h2>
                <p className="text-lg text-slate-500 font-semibold">{t.resultDesc}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map((t) => (
                  <div key={t.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black flex items-center gap-2">
                        <span className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg text-xs italic">T{t.id}</span>
                        Team {t.id}
                      </h3>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">Balanced</span>
                    </div>
                    <div className="space-y-3 mb-6">
                      {t.members.map((m, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-slate-900 text-sm">{m.name}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 bg-white border border-slate-200 text-slate-500 rounded-md uppercase">{m.role}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-bold leading-snug line-clamp-1 italic">{m.style}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-5 bg-slate-900 rounded-2xl flex gap-3 shadow-lg">
                      <div className="text-blue-400 shrink-0 pt-1"><Zap size={16} fill="currentColor" /></div>
                      <p className="text-[12px] text-slate-300 leading-relaxed italic font-semibold opacity-90">
                        {t.analysis}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-8">
                <button onClick={exportCSV} className="flex-1 py-5 bg-emerald-600 text-white rounded-2xl text-lg font-black shadow-2xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                  <Download size={20} /> {t.exportBtn}
                </button>
                <button onClick={() => setStep('input')} className="flex-1 py-5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-lg font-black hover:bg-slate-50 transition-all">
                  {t.retryBtn}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-20 border-t border-slate-200 text-center space-y-8">
        <div className="flex justify-center gap-8 text-[13px] font-black text-slate-400 uppercase tracking-widest">
          <button onClick={() => setLegalView('terms')} className="hover:text-blue-600 transition-colors">{t.terms}</button>
          <button onClick={() => setLegalView('privacy')} className="hover:text-blue-600 transition-colors">{t.privacy}</button>
          <button onClick={() => setLegalView('refund')} className="hover:text-blue-600 transition-colors">{t.refund}</button>
        </div>
        <p className="text-[11px] text-slate-300 font-bold uppercase tracking-[0.25em]">&copy; 2026 TeamBuilder AI. {t.footerMsg}</p>
      </footer>
    </div>
  );
}

export default App;
