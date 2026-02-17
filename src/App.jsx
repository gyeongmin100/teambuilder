import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Play, 
  CheckCircle2, 
  ChevronRight, 
  LayoutDashboard,
  Settings,
  HelpCircle,
  Download
} from 'lucide-react';
import { TermsOfService, RefundPolicy, PrivacyPolicy } from './LegalPages';

const translations = {
  ko: {
    title: "TeamBuilder AI",
    subtitle: "AI 기반 지능형 팀 자동 배정 솔루션",
    desc: "구글폼 응답이나 자기소개를 입력하면 GPT가 분석하여 최적의 팀을 구성해 드립니다.",
    startBtn: "지금 시작하기",
    addParticipant: "참여자 추가",
    namePlaceholder: "이름",
    introPlaceholder: "자기소개 (역할, 스타일, 강점 등 자유롭게)",
    assignBtn: "팀 배정 시작하기",
    configTitle: "배정 설정",
    teamSize: "팀당 인원",
    resultTitle: "배정 결과",
    backBtn: "다시 하기",
    loading: "AI가 팀을 분석하고 배정 중입니다...",
    emptyParticipants: "참여자를 추가해 주세요."
  },
  en: {
    title: "TeamBuilder AI",
    subtitle: "AI-Powered Intelligent Team Assigner",
    desc: "GPT analyzes intros and builds the best teams for your project automatically.",
    startBtn: "Get Started",
    addParticipant: "Add Participant",
    namePlaceholder: "Name",
    introPlaceholder: "Intro (Role, Style, Strengths, etc.)",
    assignBtn: "Start Assignment",
    configTitle: "Configuration",
    teamSize: "Team Size",
    resultTitle: "Assignment Result",
    backBtn: "Restart",
    loading: "AI is analyzing and assigning teams...",
    emptyParticipants: "Please add participants first."
  }
};

function App() {
  const [lang, setLang] = useState('ko');
  const [step, setStep] = useState('landing'); // landing, input, loading, result
  const [legalView, setLegalView] = useState(null); // terms, privacy, refund
  const [participants, setParticipants] = useState([
    { id: 1, name: '', intro: '' }
  ]);
  const [config, setConfig] = useState({ teamSize: 4, goal: 'role_balance' });
  const [teams, setTeams] = useState([]);
  const t = translations[lang];

  if (legalView === 'terms') return <TermsOfService lang={lang} onBack={() => setLegalView(null)} />;
  if (legalView === 'privacy') return <PrivacyPolicy lang={lang} onBack={() => setLegalView(null)} />;
  if (legalView === 'refund') return <RefundPolicy lang={lang} onBack={() => setLegalView(null)} />;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      const checkoutId = urlParams.get('checkout_id');
      const savedData = localStorage.getItem('pendingAssignment');
      if (savedData) {
        try {
          const { participants, config } = JSON.parse(savedData);
          setParticipants(participants);
          setConfig(config);
          performAssignment(participants, config, checkoutId);
          localStorage.removeItem('pendingAssignment');
        } catch (e) {
          console.error("Data recovery failed", e);
        }
      }
    }
  }, []);

  const addParticipant = () => {
    setParticipants([...participants, { id: Date.now(), name: '', intro: '' }]);
  };

  const loadSample = () => {
    setParticipants([
      { id: 1, name: "김철수", intro: "리더십이 있고 기획을 좋아합니다. 파이썬 능숙함." },
      { id: 2, name: "이영희", intro: "디자인과 발표 전문입니다. 협업을 중요하게 생각함." },
      { id: 3, name: "박민수", intro: "데이터 분석 및 코딩 담당. 꼼꼼한 성격입니다." },
      { id: 4, name: "최지우", intro: "아이디어가 많고 실행력이 좋습니다. 분위기 메이커." },
      { id: 5, name: "정다은", intro: "문서 작성과 리서치를 잘합니다. 시간 약속 철저." },
      { id: 6, name: "홍길동", intro: "백엔드 개발 가능. 논리적인 분석을 좋아합니다." }
    ]);
  };

  const removeParticipant = (id) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const updateParticipant = (id, field, value) => {
    setParticipants(participants.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const startAssign = async () => {
    if (participants.some(p => !p.name)) {
      alert(t.emptyParticipants);
      return;
    }

    localStorage.setItem('pendingAssignment', JSON.stringify({ participants, config }));

    setStep('loading');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants, config })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url; 
      } else {
        performAssignment(participants, config);
      }
    } catch (error) {
      console.error("Checkout Error:", error);
      performAssignment(participants, config); 
    }
  };

  const performAssignment = async (pList, pConfig, checkoutId) => {
    setStep('loading');
    try {
      const response = await fetch('/api/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: pList, config: pConfig, checkout_id: checkoutId })
      });
      const data = await response.json();
      if (data.teams) {
        setTeams(data.teams);
        setStep('result');
      } else {
        throw new Error(data.error || 'Failed to assign');
      }
    } catch (error) {
      alert("Error: " + error.message);
      setStep('input');
    }
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,Team,Name,Role,Style,Intro\n";
    teams.forEach(team => {
      team.members.forEach(m => {
        csvContent += `${team.id},${m.name},${m.role},"${m.style}","${m.intro}"\n`;
      });
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `teambuilder_result_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8">
      <nav className="max-w-6xl mx-auto flex justify-between items-center mb-12">
        <div className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          <Users className="text-blue-400" /> {t.title}
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
            className="px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-800 transition"
          >
            {lang === 'ko' ? 'English' : '한국어'}
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-20"
            >
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight">
                {t.subtitle}
              </h1>
              <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                {t.desc}
              </p>
              <button 
                onClick={() => setStep('input')}
                className="group flex items-center gap-2 mx-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xl font-bold transition-all transform hover:scale-105"
              >
                {t.startBtn} <ChevronRight className="group-hover:translate-x-1 transition" />
              </button>
            </motion.div>
          )}

          {step === 'input' && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="bg-slate-800 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-700">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <UserPlus className="text-blue-400" /> 참여자 정보 입력
                  </h2>
                  <div className="flex items-center gap-4">
                    <button onClick={loadSample} className="text-xs text-blue-400 hover:underline">
                      샘플 데이터 불러오기
                    </button>
                    <label className="text-sm text-slate-400">{t.teamSize}</label>
                    <input 
                      type="number" min="2" max="10"
                      value={config.teamSize}
                      onChange={(e) => setConfig({...config, teamSize: parseInt(e.target.value)})}
                      className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1"
                    />
                  </div>
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {participants.map((p, idx) => (
                    <div key={p.id} className="flex gap-3 group animate-in slide-in-from-left duration-300">
                      <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 text-sm font-bold mt-1">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          placeholder={t.namePlaceholder}
                          value={p.name}
                          onChange={(e) => updateParticipant(p.id, 'name', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                        <textarea 
                          placeholder={t.introPlaceholder}
                          value={p.intro}
                          onChange={(e) => updateParticipant(p.id, 'intro', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition h-20 resize-none"
                        />
                      </div>
                      <button 
                        onClick={() => removeParticipant(p.id)}
                        className="flex-none text-slate-500 hover:text-red-400 p-2 h-fit"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex gap-4">
                  <button onClick={addParticipant} className="flex-1 py-4 border-2 border-dashed border-slate-600 rounded-2xl hover:border-blue-400 hover:bg-slate-800/50 transition-all text-slate-400 hover:text-blue-400 font-bold">
                    + {t.addParticipant}
                  </button>
                  <button onClick={startAssign} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white font-bold shadow-lg shadow-blue-900/20 transition-all">
                    {t.assignBtn}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div key="loading" className="text-center py-20">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-xl text-slate-400 animate-pulse">{t.loading}</p>
            </motion.div>
          )}

          {step === 'result' && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <LayoutDashboard className="text-emerald-400" /> {t.resultTitle}
                </h2>
                <div className="flex gap-4">
                  <button onClick={exportToCSV} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 rounded-xl hover:bg-emerald-500 transition font-bold">
                    <Download size={18} /> CSV 내보내기
                  </button>
                  <button onClick={() => setStep('input')} className="px-6 py-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition">
                    {t.backBtn}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map((team) => (
                  <div key={team.id} className="bg-slate-800 rounded-3xl p-6 border border-slate-700 hover:border-blue-500/50 transition">
                    <h3 className="text-xl font-bold mb-4 flex items-center justify-between">
                      Team {team.id}
                      <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg">Optimized</span>
                    </h3>
                    <div className="space-y-3 mb-4">
                      {team.members.map((m, idx) => (
                        <div key={idx} className="bg-slate-900/50 p-3 rounded-2xl border border-slate-700/50">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold">{m.name}</span>
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-md">{m.role}</span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">{m.style}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-slate-500 italic bg-slate-900/30 p-3 rounded-xl border border-dashed border-slate-700">
                      " {team.analysis} "
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm pb-12">
        <div className="flex justify-center gap-6 mb-4">
          <button onClick={() => setLegalView('terms')} className="hover:text-slate-300">이용약관</button>
          <button onClick={() => setLegalView('privacy')} className="hover:text-slate-300">개인정보처리방침</button>
          <button onClick={() => setLegalView('refund')} className="hover:text-slate-300">환불정책</button>
        </div>
        <p>&copy; 2026 TeamBuilder AI. All rights reserved. Powered by GPT-4o.</p>
      </footer>
    </div>
  );
}

export default App;
