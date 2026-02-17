import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
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
  Download,
  Upload,
  FileText,
  Copy,
  ExternalLink,
  Info
} from 'lucide-react';
import { TermsOfService, RefundPolicy, PrivacyPolicy } from './LegalPages';

const translations = {
  ko: {
    title: "TeamBuilder AI",
    subtitle: "AI 기반 지능형 팀 자동 배정",
    desc: "자기소개 텍스트, CSV 파일, 구글폼 데이터를 GPT가 분석하여 최적의 팀을 구성합니다.",
    startBtn: "무료로 시작하기",
    addParticipant: "참여자 직접 추가",
    uploadCSV: "CSV/엑셀 업로드",
    googleForm: "구글폼 연계 방법",
    namePlaceholder: "이름",
    introPlaceholder: "자기소개 (역할, 스타일, 강점 등)",
    assignBtn: "최적의 팀 배정 시작",
    configTitle: "배정 옵션",
    teamSize: "팀당 인원",
    resultTitle: "배정 결과 리포트",
    backBtn: "처음으로",
    loading: "AI가 참여자 성향을 분석하여 최적의 조합을 찾는 중입니다...",
    emptyParticipants: "최소 2명 이상의 참여자가 필요합니다.",
    sampleBtn: "예시 데이터 불러오기"
  }
};

function App() {
  const [lang, setLang] = useState('ko');
  const [step, setStep] = useState('landing'); 
  const [legalView, setLegalView] = useState(null);
  const [participants, setParticipants] = useState([
    { id: 1, name: '', intro: '' }
  ]);
  const [config, setConfig] = useState({ teamSize: 4, goal: 'role_balance' });
  const [teams, setTeams] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const t = translations[lang];

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
        } catch (e) { console.error(e); }
      }
    }
  }, []);

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
            intro: row.자기소개 || row.intro || row.Intro || row.Description || ''
          })).filter(p => p.name);
          setParticipants([...participants.filter(p => p.name), ...newParticipants]);
        }
      });
    }
  };

  const addParticipant = () => {
    setParticipants([...participants, { id: Date.now(), name: '', intro: '' }]);
  };

  const loadSample = () => {
    setParticipants([
      { id: 1, name: "김철수", intro: "리더십이 있고 기획을 좋아합니다. 파이썬 능숙함." },
      { id: 2, name: "이영희", intro: "디자인과 발표 전문입니다. 협업을 중요하게 생각함." },
      { id: 3, name: "박민수", intro: "데이터 분석 및 코딩 담당. 꼼꼼한 성격입니다." },
      { id: 4, name: "최지우", intro: "아이디어가 많고 실행력이 좋습니다. 분위기 메이커." }
    ]);
  };

  const startAssign = async () => {
    const validParticipants = participants.filter(p => p.name);
    if (validParticipants.length < 2) {
      alert(t.emptyParticipants);
      return;
    }
    setStep('loading');
    performAssignment(validParticipants, config);
  };

  const performAssignment = async (pList, pConfig, checkoutId) => {
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
    let csvContent = "Team,Name,Role,Style,Intro\n";
    teams.forEach(team => {
      team.members.forEach(m => {
        csvContent += `${team.id},${m.name},${m.role},"${m.style}","${m.intro}"\n`;
      });
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `teambuilder_result.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xl font-bold text-blue-600">
            <Users className="size-6" /> TeamBuilder AI
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')} className="text-sm font-medium text-slate-600 hover:text-blue-600 px-3 py-1 rounded-full border border-slate-200">
              {lang === 'ko' ? 'EN' : 'KO'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-bold mb-4">
                <CheckCircle2 className="size-4" /> 100% GPT-4o 기반 지능형 분석
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                복잡한 팀 빌딩,<br/> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">AI가 10초 만에</span> 끝내드립니다.
              </h1>
              <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                {t.desc}
              </p>
              <div className="pt-8">
                <button onClick={() => setStep('input')} className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl text-xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95">
                  {t.startBtn} <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
                {[
                  { icon: FileText, title: "엑셀/CSV 업로드", desc: "기존 참여자 명단을 한 번에 불러오세요." },
                  { icon: Copy, title: "구글폼 연계", desc: "설문 응답 결과를 복사해서 붙여넣기만 하세요." },
                  { icon: LayoutDashboard, title: "시각화 리포트", desc: "팀별 성향 분석과 배정 근거를 제공합니다." }
                ].map((feature, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <feature.icon className="size-8 text-blue-600 mb-4" />
                    <h3 className="font-bold text-slate-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'input' && (
            <motion.div key="input" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl shadow-slate-200/50 border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <UserPlus className="text-blue-600" /> 참여자 데이터 준비
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition">
                      <Upload size={16} /> {t.uploadCSV}
                      <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <button onClick={loadSample} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-sm font-bold transition">
                      {t.sampleBtn}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 mb-8 flex gap-3 items-start">
                  <Info className="size-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 leading-relaxed">
                    <strong>구글폼 사용 팁:</strong> 구글폼 응답 시트의 이름과 자기소개 열을 복사하여 아래 표에 붙여넣거나, 시트를 CSV로 다운로드하여 업로드하세요.
                  </div>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {participants.map((p, idx) => (
                    <div key={p.id} className="flex gap-3 group animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-400 text-xs font-bold mt-1">
                        {idx + 1}
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input 
                          placeholder={t.namePlaceholder}
                          value={p.name}
                          onChange={(e) => updateParticipant(p.id, 'name', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition shadow-sm"
                        />
                        <input 
                          placeholder={t.introPlaceholder}
                          value={p.intro}
                          onChange={(e) => updateParticipant(p.id, 'intro', e.target.value)}
                          className="w-full md:col-span-3 bg-white border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition shadow-sm"
                        />
                      </div>
                      <button onClick={() => removeParticipant(p.id)} className="flex-none text-slate-300 hover:text-red-500 p-2 h-fit transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button onClick={addParticipant} className="py-4 border-2 border-dashed border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all text-slate-400 hover:text-blue-600 font-bold">
                    + 참여자 추가
                  </button>
                  <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-200">
                    <span className="text-sm font-bold text-slate-600">{t.teamSize}</span>
                    <input 
                      type="number" min="2" max="10"
                      value={config.teamSize}
                      onChange={(e) => setConfig({...config, teamSize: parseInt(e.target.value)})}
                      className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-2 text-center font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    />
                  </div>
                </div>

                <div className="mt-12">
                  <button onClick={startAssign} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all transform hover:-translate-y-1 active:translate-y-0">
                    {t.assignBtn}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div key="loading" className="text-center py-32 space-y-8">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 border-8 border-blue-100 rounded-full"></div>
                <div className="absolute inset-0 border-8 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">최적의 팀을 설계 중입니다</h3>
                <p className="text-slate-500 max-w-sm mx-auto">{t.loading}</p>
              </div>
            </motion.div>
          )}

          {step === 'result' && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-black flex items-center gap-3 tracking-tight">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <LayoutDashboard size={24} />
                  </div> {t.resultTitle}
                </h2>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={exportToCSV} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-bold shadow-lg shadow-emerald-100">
                    <Download size={18} /> {lang === 'ko' ? 'CSV 저장' : 'Export CSV'}
                  </button>
                  <button onClick={() => setStep('input')} className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition font-bold">
                    {t.backBtn}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map((team) => (
                  <div key={team.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <span className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg text-sm italic">T{team.id}</span>
                        Team {team.id}
                      </h3>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-blue-50 text-blue-600 rounded-md">Balanced</span>
                    </div>
                    <div className="space-y-3 mb-6">
                      {team.members.map((m, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="font-bold text-slate-900">{m.name}</span>
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-full">{m.role}</span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">{m.style}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-slate-900 rounded-2xl">
                      <div className="flex gap-2 items-center mb-2">
                        <Info size={14} className="text-blue-400" />
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">AI Insight</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed italic">
                        "{team.analysis}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto mt-20 px-4 py-12 border-t border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 font-bold text-slate-400">
            <Users size={20} /> TeamBuilder AI
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-slate-500">
            <button onClick={() => setLegalView('terms')} className="hover:text-blue-600 transition">이용약관</button>
            <button onClick={() => setLegalView('privacy')} className="hover:text-blue-600 transition">개인정보처리방침</button>
            <button onClick={() => setLegalView('refund')} className="hover:text-blue-600 transition">환불정책</button>
          </div>
          <p className="text-sm text-slate-400">&copy; 2026 TeamBuilder AI. Built with GPT-4o.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
