import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { Users, Upload, Trash2, Download, Search, SlidersHorizontal, Settings2, Database } from 'lucide-react';
import { TermsOfService, RefundPolicy, PrivacyPolicy } from './LegalPages';
import { supabase } from './lib/supabaseClient';

const parseFormId = (urlOrId) => {
  const raw = String(urlOrId || '').trim();
  if (!raw) return null;
  const direct = raw.match(/^[a-zA-Z0-9-_]{20,}$/);
  if (direct) return raw;
  const fromPublicUrl = raw.match(/\/forms\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (fromPublicUrl) return fromPublicUrl[1];
  const fromEditorUrl = raw.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
  if (fromEditorUrl) return fromEditorUrl[1];
  return null;
};

const norm = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, '');

const normalizeQuestionMap = (form) => {
  const items = Array.isArray(form?.items) ? form.items : [];
  return items
    .map((item) => {
      const qid = item?.questionItem?.question?.questionId;
      const title = String(item?.title || '').trim();
      return qid && title ? { qid, title } : null;
    })
    .filter(Boolean);
};

const findQuestionId = (questionMap, aliases) => {
  const normalizedAliases = aliases.map(norm);
  for (const q of questionMap) {
    if (normalizedAliases.includes(norm(q.title))) return q.qid;
  }
  return null;
};

const extractAnswerValue = (answerObj) => {
  if (!answerObj) return '';

  if (answerObj.textAnswers?.answers?.length) {
    return answerObj.textAnswers.answers.map((a) => a.value).filter(Boolean).join(', ');
  }

  if (answerObj.choiceAnswers?.answers?.length) {
    return answerObj.choiceAnswers.answers.map((a) => a.value).filter(Boolean).join(', ');
  }

  if (answerObj.fileUploadAnswers?.answers?.length) {
    return answerObj.fileUploadAnswers.answers
      .map((a) => a.fileName || a.fileId || '')
      .filter(Boolean)
      .join(', ');
  }

  if (answerObj.dateAnswers?.answers?.length) {
    return answerObj.dateAnswers.answers
      .map((a) => {
        const year = a?.date?.year;
        const month = a?.date?.month;
        const day = a?.date?.day;
        if (!year || !month || !day) return '';
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      })
      .filter(Boolean)
      .join(', ');
  }

  if (answerObj.timeAnswers?.answers?.length) {
    return answerObj.timeAnswers.answers
      .map((a) => {
        const hour = a?.time?.hours;
        const minute = a?.time?.minutes;
        if (hour === undefined || minute === undefined) return '';
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      })
      .filter(Boolean)
      .join(', ');
  }

  return '';
};

const mapFormResponsesToParticipants = (form, responses) => {
  const questionMap = normalizeQuestionMap(form);
  const nameQid = findQuestionId(questionMap, ['이름', '성명', 'name', 'fullname']);
  const introQid = findQuestionId(questionMap, ['자기소개', '소개', 'intro', 'introduction']);
  const majorQid = findQuestionId(questionMap, ['학과', '전공', 'major', 'department']);
  const studentIdQid = findQuestionId(questionMap, ['학번', 'studentid', 'studentno']);

  const list = Array.isArray(responses?.responses) ? responses.responses : [];
  let mapped = 0;
  let skipped = 0;

  const participants = list
    .map((r, i) => {
      const answers = r?.answers || {};
      const features = {};

      for (const q of questionMap) {
        const value = extractAnswerValue(answers[q.qid]);
        if (value) features[q.title] = value;
      }

      const respondentEmail = String(r?.respondentEmail || '').trim();
      if (respondentEmail) features['응답자 이메일'] = respondentEmail;

      const guessedName = extractAnswerValue(answers[nameQid]) || respondentEmail || `참가자-${i + 1}`;
      const intro = extractAnswerValue(answers[introQid]);
      const major = extractAnswerValue(answers[majorQid]);
      const studentId = extractAnswerValue(answers[studentIdQid]);

      mapped += 1;
      return {
        id: Date.now() + i,
        name: guessedName,
        originalName: guessedName,
        source: 'google-form',
        features,
        intro: [
          studentId ? `학번: ${studentId}` : '',
          major ? `학과: ${major}` : '',
          intro ? `자기소개: ${intro}` : ''
        ].filter(Boolean).join('\n')
      };
    })
    .filter((p) => {
      const hasIdentifierCandidate = p.name || Object.keys(p.features || {}).length > 0;
      if (!hasIdentifierCandidate) skipped += 1;
      return hasIdentifierCandidate;
    });

  return { participants, mapped, skipped };
};

function App() {
  const [lang, setLang] = useState('ko');
  const [step, setStep] = useState('input');
  const [legalView, setLegalView] = useState(null);
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([{ id: 1, name: '', intro: '', source: 'manual', features: {} }]);
  const [config, setConfig] = useState({ teamSize: 4, remainderMode: 'spread', useCustomPrompt: false });
  const [teams, setTeams] = useState([]);
  const [customPrompt, setCustomPrompt] = useState('');

  const [formUrl, setFormUrl] = useState('');
  const [sheetImportLoading, setSheetImportLoading] = useState(false);
  const [sheetListLoading, setSheetListLoading] = useState(false);
  const [sheetListOpen, setSheetListOpen] = useState(false);
  const [driveForms, setDriveForms] = useState([]);
  const [message, setMessage] = useState('');

  const [availableIdentifierKeys, setAvailableIdentifierKeys] = useState([]);
  const [selectedIdentifierKey, setSelectedIdentifierKey] = useState('');
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const [participantQuery, setParticipantQuery] = useState('');
  const [columnLimit, setColumnLimit] = useState(6);

  const maxInitialRows = 20;

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data?.session ?? null);
      setUser(data?.session?.user ?? null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!alive) return;
      setSession(s ?? null);
      setUser(s?.user ?? null);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  if (legalView === 'terms') return <TermsOfService lang={lang} onBack={() => setLegalView(null)} />;
  if (legalView === 'privacy') return <PrivacyPolicy lang={lang} onBack={() => setLegalView(null)} />;
  if (legalView === 'refund') return <RefundPolicy lang={lang} onBack={() => setLegalView(null)} />;

  const login = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        scopes:
          'openid email profile https://www.googleapis.com/auth/forms.body.readonly https://www.googleapis.com/auth/forms.responses.readonly https://www.googleapis.com/auth/drive.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' }
      }
    });
    if (error) alert(`로그인 실패: ${error.message}`);
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert(`로그아웃 실패: ${error.message}`);
  };

  const openSheets = async () => {
    try {
      if (!session?.provider_token) throw new Error('Google 권한 토큰이 없습니다. 재로그인하세요.');
      setSheetListLoading(true);
      setMessage('');

      const q = encodeURIComponent("mimeType='application/vnd.google-apps.form' and trashed=false");
      const fields = encodeURIComponent('files(id,name,modifiedTime)');
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?pageSize=50&orderBy=modifiedTime desc&q=${q}&fields=${fields}`,
        {
          headers: { Authorization: `Bearer ${session.provider_token}` }
        }
      );

      if (!res.ok) throw new Error('구글폼 목록 조회 실패');

      const data = await res.json();
      setDriveForms(Array.isArray(data?.files) ? data.files : []);
      setSheetListOpen(true);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSheetListLoading(false);
    }
  };

  const importSheet = async (urlOrId) => {
    try {
      if (!session?.provider_token) throw new Error('Google 권한 토큰이 없습니다. 재로그인하세요.');
      const formId = parseFormId(urlOrId ?? formUrl);
      if (!formId) throw new Error('유효한 Google Form URL 또는 ID를 입력하세요.');

      setSheetImportLoading(true);
      setMessage('');

      const formRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
        headers: { Authorization: `Bearer ${session.provider_token}` }
      });
      if (!formRes.ok) throw new Error('구글폼 메타데이터 조회 실패');
      const formData = await formRes.json();

      const respRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses?pageSize=500`, {
        headers: { Authorization: `Bearer ${session.provider_token}` }
      });
      if (!respRes.ok) throw new Error('구글폼 응답 조회 실패');
      const responses = await respRes.json();

      const { participants: imported, mapped, skipped } = mapFormResponsesToParticipants(formData, responses);
      if (!imported.length) throw new Error('가져올 참가자 데이터가 없습니다.');

      const featureKeys = Array.from(
        new Set(imported.flatMap((p) => Object.keys(p.features || {})).filter(Boolean))
      );
      setAvailableIdentifierKeys(featureKeys);
      setSelectedIdentifierKey('');
      setShowAllParticipants(false);

      setParticipants((prev) => {
        const existing = prev.filter((p) => p.name || Object.keys(p.features || {}).length > 0);
        const keySet = new Set(existing.map((p) => `${p.name}||${p.intro}`));
        const merged = [...existing];

        for (const p of imported) {
          const key = `${p.name}||${p.intro}`;
          if (!keySet.has(key)) {
            keySet.add(key);
            merged.push(p);
          }
        }
        return merged;
      });

      setMessage(`구글폼 불러오기 완료: ${mapped}명 반영, ${skipped}명 스킵`);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSheetImportLoading(false);
    }
  };

  const onUploadCsv = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const list = results.data
          .map((r, i) => ({
            id: Date.now() + i,
            name: r['이름'] || r.name || '',
            intro: r['자기소개'] || r.intro || '',
            source: 'csv',
            features: {}
          }))
          .filter((p) => p.name || Object.keys(p.features || {}).length > 0);

        setParticipants((prev) => [...prev.filter((p) => p.name || Object.keys(p.features || {}).length > 0), ...list]);
      }
    });
  };

  const validParticipants = useMemo(
    () => participants.filter((p) => p.name || Object.keys(p.features || {}).length > 0),
    [participants]
  );

  const filteredParticipants = useMemo(() => {
    const q = participantQuery.trim().toLowerCase();
    if (!q) return validParticipants;
    return validParticipants.filter((p) => {
      const idValue = String(selectedIdentifierKey ? p?.features?.[selectedIdentifierKey] || '' : '').toLowerCase();
      const featureText = Object.values(p.features || {}).join(' ').toLowerCase();
      return idValue.includes(q) || featureText.includes(q);
    });
  }, [participantQuery, validParticipants, selectedIdentifierKey]);

  const getParticipantIdentifier = (participant) => {
    if (!selectedIdentifierKey) return '';
    return String(participant?.features?.[selectedIdentifierKey] || '').trim();
  };

  const tableFeatureKeys = useMemo(() => {
    const candidates = availableIdentifierKeys.filter((k) => k !== selectedIdentifierKey);
    return candidates.slice(0, columnLimit);
  }, [availableIdentifierKeys, selectedIdentifierKey, columnLimit]);

  const shownParticipants = useMemo(() => {
    if (showAllParticipants || filteredParticipants.length <= maxInitialRows) return filteredParticipants;
    return filteredParticipants.slice(0, maxInitialRows);
  }, [filteredParticipants, showAllParticipants]);

  const runAssign = async () => {
    if (validParticipants.length < 2) return alert('최소 2명 이상 입력해 주세요.');
    if (!selectedIdentifierKey) return alert('식별 기준을 먼저 선택해 주세요.');

    const missingIdentifier = validParticipants.filter((p) => !getParticipantIdentifier(p));
    if (missingIdentifier.length > 0) {
      return alert(`선택한 식별 기준 값이 비어 있는 참가자가 ${missingIdentifier.length}명 있습니다.`);
    }

    const payloadParticipants = validParticipants.map((p) => ({
      ...p,
      originalName: p.originalName || p.name,
      name: getParticipantIdentifier(p),
      identifierKey: selectedIdentifierKey,
      identifierValue: getParticipantIdentifier(p)
    }));

    setStep('loading');
    try {
      const res = await fetch('/api/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: payloadParticipants,
          config,
          customPrompt: config.useCustomPrompt ? String(customPrompt || '').trim() : ''
        })
      });
      const data = await res.json();
      if (!data.teams) throw new Error(data.error || '배정 실패');
      setTeams(data.teams);
      setStep('result');
    } catch {
      alert('분석 중 오류가 발생했습니다.');
      setStep('input');
    }
  };

  const exportCSV = () => {
    let csv = '\uFEFFTeam,Name,Role,Insight\n';
    teams.forEach((t) => t.members.forEach((m) => (csv += `${t.id},${m.name},${m.role},"${m.style}"\n`)));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TeamBuilder_Result.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 text-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 font-black text-xl text-cyan-700">
            <Users className="size-5" /> TeamBuilder AI
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang('ko')} className="text-sm">KR</button>
            <button onClick={() => setLang('en')} className="text-sm">EN</button>
            {!user ? (
              <button onClick={login} className="px-3 py-1 bg-slate-900 text-white rounded">Google 로그인</button>
            ) : (
              <button onClick={logout} className="px-3 py-1 bg-slate-200 rounded">로그아웃</button>
            )}
          </div>
        </div>

        {step === 'input' && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-xs text-slate-500">현재 참가자</p>
                <p className="text-2xl font-black text-slate-900">{validParticipants.length}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-xs text-slate-500">식별 기준</p>
                <p className="text-sm font-bold truncate">{selectedIdentifierKey || '미선택'}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-xs text-slate-500">맞춤 프롬프트</p>
                <p className="text-sm font-bold">{config.useCustomPrompt ? 'ON' : 'OFF'}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-xs text-slate-500">진행 상태</p>
                <p className="text-sm font-bold">{selectedIdentifierKey ? '배정 준비 완료' : '식별 기준 선택 필요'}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <p className="text-sm font-bold">100% 데이터 기반 팀 분석</p>

              <div className="rounded-xl border border-slate-200 p-3 space-y-3 bg-slate-50/70">
                <p className="text-sm font-bold flex items-center gap-2"><Settings2 size={15} /> 1) 팀 설정</p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                  <span>1팀당 인원</span>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={config.teamSize}
                    onChange={(e) => setConfig({ ...config, teamSize: parseInt(e.target.value, 10) || 4 })}
                    className="w-20 border rounded px-2 py-1"
                  />
                </label>

                <label className="inline-flex items-center gap-2 px-2 py-1 border rounded">
                  <input
                    type="radio"
                    checked={config.remainderMode === 'spread'}
                    onChange={() => setConfig({ ...config, remainderMode: 'spread' })}
                  />
                  나머지 인원 기존 팀에 배분
                </label>

                <label className="inline-flex items-center gap-2 px-2 py-1 border rounded">
                  <input
                    type="radio"
                    checked={config.remainderMode === 'keep_partial'}
                    onChange={() => setConfig({ ...config, remainderMode: 'keep_partial' })}
                  />
                  마지막 팀을 부족 인원 그대로 유지
                </label>
              </div>
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 px-2 py-1 border rounded text-sm">
                  <input
                    type="checkbox"
                    checked={config.useCustomPrompt}
                    onChange={(e) => setConfig({ ...config, useCustomPrompt: e.target.checked })}
                  />
                  사용자 맞춤 프롬프트 사용
                </label>
                {config.useCustomPrompt && (
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="예: 김민지와 김철수는 같은 팀, 각 팀 성별은 최대한 균형, 성향 다른 사람끼리 섞기"
                    className="w-full min-h-24 border rounded px-3 py-2 text-sm"
                  />
                )}
              </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                <p className="text-sm font-bold flex items-center gap-2"><Database size={15} /> 2) 데이터 불러오기</p>
                <div className="flex gap-2">
                  <input
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="Google Form URL 또는 Form ID"
                    className="flex-1 border rounded px-3 py-2"
                  />
                  <button
                    onClick={() => importSheet()}
                    disabled={sheetImportLoading}
                    className="px-3 py-2 bg-slate-900 text-white rounded"
                  >
                    {sheetImportLoading ? '불러오는 중...' : '불러오기'}
                  </button>
                  <button
                    onClick={openSheets}
                    disabled={sheetListLoading}
                    className="px-3 py-2 bg-slate-200 rounded"
                  >
                    {sheetListLoading ? '목록 조회 중...' : 'Google에서 폼 선택'}
                  </button>
                </div>
              </div>

              {sheetListOpen && driveForms.length > 0 && (
              <div className="max-h-52 overflow-y-auto border rounded">
                {driveForms.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setFormUrl(`https://docs.google.com/forms/d/${f.id}/edit`);
                      importSheet(f.id);
                      setSheetListOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 border-b hover:bg-slate-50"
                  >
                    <div className="font-semibold text-sm">{f.name}</div>
                    <div className="text-xs text-slate-500">{f.id}</div>
                  </button>
                ))}
              </div>
              )}

              {message && <p className="text-sm text-blue-700 font-semibold">{message}</p>}

              <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-bold mb-2">2) 식별 기준 선택 (필수)</p>
              <p className="text-xs text-slate-500 mb-2">기본 이름은 제거했습니다. 폼 질문 중 1개를 선택하세요.</p>
              <div className="flex flex-wrap gap-2">
                {availableIdentifierKeys.length === 0 && (
                  <p className="text-xs text-slate-500">폼을 불러오면 질문 목록이 여기 표시됩니다.</p>
                )}
                {availableIdentifierKeys.map((key) => (
                  <label key={key} className="inline-flex items-center gap-2 px-2 py-1 border rounded text-sm">
                    <input
                      type="radio"
                      checked={selectedIdentifierKey === key}
                      onChange={() => setSelectedIdentifierKey(key)}
                    />
                    <span className="max-w-44 truncate" title={key}>{key}</span>
                  </label>
                ))}
              </div>
              {!selectedIdentifierKey && (
                <p className="text-xs text-rose-600 mt-2">식별 기준을 선택하지 않으면 분석이 시작되지 않습니다.</p>
              )}
              </div>

              <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 rounded cursor-pointer">
              <Upload size={16} /> CSV 업로드
              <input type="file" accept=".csv" className="hidden" onChange={onUploadCsv} />
              </label>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-100 text-sm font-semibold">참가자 데이터 미리보기 (엑셀 형태)</div>
              <div className="px-3 py-2 border-b bg-white flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-slate-500" />
                  <input
                    value={participantQuery}
                    onChange={(e) => setParticipantQuery(e.target.value)}
                    placeholder="참가자/값 검색"
                    className="border rounded px-2 py-1 text-sm w-52"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <SlidersHorizontal size={14} className="text-slate-500" />
                  <span>표시 특성 수</span>
                  <input
                    type="number"
                    min="3"
                    max="12"
                    value={columnLimit}
                    onChange={(e) => setColumnLimit(Math.min(12, Math.max(3, parseInt(e.target.value, 10) || 6)))}
                    className="w-16 border rounded px-2 py-1"
                  />
                </div>
              </div>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left w-14">No</th>
                      <th className="px-3 py-2 text-left min-w-44">
                        <span className="inline-block max-w-40 truncate" title={selectedIdentifierKey || '식별 기준 미선택'}>
                          {selectedIdentifierKey || '식별 기준 선택 필요'}
                        </span>
                      </th>
                      {tableFeatureKeys.map((key) => (
                        <th key={key} className="px-3 py-2 text-left min-w-44">
                          <span className="inline-block max-w-40 truncate" title={key}>{key}</span>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left w-16">삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownParticipants.map((p, idx) => (
                      <tr key={p.id} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <span className="inline-block max-w-52 truncate" title={getParticipantIdentifier(p) || '-'}>
                            {getParticipantIdentifier(p) || '-'}
                          </span>
                        </td>
                        {tableFeatureKeys.map((key) => (
                          <td key={`${p.id}-${key}`} className="px-3 py-2">
                            <span className="inline-block max-w-52 truncate" title={String(p?.features?.[key] || '-')}>
                              {String(p?.features?.[key] || '-')}
                            </span>
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <button
                            onClick={() => setParticipants(participants.filter((x) => x.id !== p.id))}
                            className="text-slate-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {shownParticipants.length === 0 && (
                      <tr>
                        <td colSpan={tableFeatureKeys.length + 3} className="px-3 py-6 text-center text-slate-500">
                          검색 결과가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </div>

              {filteredParticipants.length > maxInitialRows && (
              <button
                type="button"
                onClick={() => setShowAllParticipants((v) => !v)}
                className="px-3 py-2 border rounded hover:bg-slate-50"
              >
                {showAllParticipants
                  ? '접기'
                  : `전체보기 (${filteredParticipants.length - maxInitialRows}명 더 보기)`}
              </button>
              )}

              <div className="sticky bottom-3 bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-3 flex gap-2">
              <button
                onClick={() => setParticipants([...participants, { id: Date.now(), name: '', intro: '', source: 'manual', features: {} }])}
                className="px-3 py-2 border rounded"
              >
                빈 참가자 1명 추가
              </button>
              <button onClick={runAssign} className="px-4 py-2 bg-cyan-700 text-white rounded">팀 배정 실행</button>
              </div>
            </div>
          </div>
        )}

        {step === 'loading' && <div className="mt-10 text-center font-bold">데이터 분석 중입니다...</div>}

        {step === 'result' && (
          <div className="mt-6 space-y-4">
            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-emerald-600 text-white rounded inline-flex items-center gap-2"
              >
                <Download size={16} /> CSV 다운로드
              </button>
              <button onClick={() => setStep('input')} className="px-4 py-2 border rounded">다시 배정</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((t) => (
                <div key={t.id} className="bg-white border rounded-2xl p-4">
                  <h3 className="font-black mb-2">Team {t.id}</h3>
                  {t.members.map((m, i) => (
                    <div key={i} className="text-sm border rounded p-2 mb-2">
                      <div className="font-bold">
                        {m.name} <span className="text-xs text-slate-500">{m.role}</span>
                      </div>
                      <div className="text-xs text-slate-500">{m.style}</div>
                    </div>
                  ))}
                  <div className="text-xs text-slate-600">{t.analysis}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="mt-10 pt-6 border-t text-center text-sm text-slate-500">
          <button onClick={() => setLegalView('terms')} className="mx-2">이용약관</button>
          <button onClick={() => setLegalView('privacy')} className="mx-2">개인정보처리방침</button>
          <button onClick={() => setLegalView('refund')} className="mx-2">환불정책</button>
        </footer>
      </div>
    </div>
  );
}

export default App;
