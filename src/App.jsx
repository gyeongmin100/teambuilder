import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Upload, Trash2, Download, Search, Settings2, Database, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { TermsOfService, RefundPolicy, PrivacyPolicy } from './LegalPages';
import { supabase } from './lib/supabaseClient';

const PENDING_ASSIGN_KEY = 'teambuilder_pending_assign_v1';
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.22 } }
};

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
const countMatches = (text, regex) => (text.match(regex) || []).length;
const scoreDecodedText = (text) => {
  if (!text) return -9999;
  const replacement = countMatches(text, /\uFFFD/g);
  const badPattern = countMatches(text, /[ÃÂÐØ]/g);
  const hangul = countMatches(text, /[가-힣]/g);
  return hangul * 2 - replacement * 8 - badPattern * 3;
};

const decodeCsvTextWithFallback = async (file) => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(buffer), encoding: 'utf-8-bom', fallbackUsed: false };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: new TextDecoder('utf-16le').decode(buffer), encoding: 'utf-16le', fallbackUsed: false };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: new TextDecoder('utf-16be').decode(buffer), encoding: 'utf-16be', fallbackUsed: false };
  }

  const utf8Text = new TextDecoder('utf-8').decode(buffer);
  let eucKrText = '';
  try {
    eucKrText = new TextDecoder('euc-kr').decode(buffer);
  } catch {
    eucKrText = '';
  }

  const utf8Score = scoreDecodedText(utf8Text);
  const eucKrScore = scoreDecodedText(eucKrText);

  if (eucKrText && eucKrScore > utf8Score + 3) {
    return { text: eucKrText, encoding: 'euc-kr', fallbackUsed: true };
  }
  return { text: utf8Text, encoding: 'utf-8', fallbackUsed: false };
};

const createInternalId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

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

const guessNameFromRow = (row) => {
  const aliases = ['이름', '성명', 'name', 'fullname', 'studentname'];
  const keys = Object.keys(row || {});
  const targetKey = keys.find((key) => aliases.includes(norm(key)));
  return targetKey ? String(row[targetKey] || '').trim() : '';
};

const guessIntroFromRow = (row) => {
  const aliases = ['자기소개', '소개', 'intro', 'introduction'];
  const keys = Object.keys(row || {});
  const targetKey = keys.find((key) => aliases.includes(norm(key)));
  return targetKey ? String(row[targetKey] || '').trim() : '';
};

const mapRowsToParticipants = (rows, source) => {
  const list = Array.isArray(rows) ? rows : [];
  let skipped = 0;

  const participants = list
    .map((row, i) => {
      const raw = row && typeof row === 'object' ? row : {};
      const features = {};
      for (const [key, value] of Object.entries(raw)) {
        const normalizedKey = String(key || '').trim();
        const normalizedValue = String(value ?? '').trim();
        if (!normalizedKey || !normalizedValue) continue;
        features[normalizedKey] = normalizedValue;
      }

      if (Object.keys(features).length === 0) {
        skipped += 1;
        return null;
      }

      const guessedName = guessNameFromRow(raw);
      const intro = guessIntroFromRow(raw);
      const fallbackName = guessedName || `참가자-${i + 1}`;

      return {
        id: Date.now() + i,
        internalId: createInternalId(),
        name: fallbackName,
        originalName: fallbackName,
        intro,
        source,
        features
      };
    })
    .filter(Boolean);

  return { participants, mapped: participants.length, skipped };
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
        internalId: createInternalId(),
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
  const [step, setStep] = useState('input');
  const [uiPage, setUiPage] = useState('landing');
  const [legalView, setLegalView] = useState(null);
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [config, setConfig] = useState({ teamSize: 4, remainderMode: 'spread', useCustomPrompt: false });
  const [teams, setTeams] = useState([]);
  const [customPrompt, setCustomPrompt] = useState('');

  const [formUrl, setFormUrl] = useState('');
  const [sheetImportLoading, setSheetImportLoading] = useState(false);
  const [sheetListLoading, setSheetListLoading] = useState(false);
  const [sheetListOpen, setSheetListOpen] = useState(false);
  const [driveForms, setDriveForms] = useState([]);
  const [message, setMessage] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [availableIdentifierKeys, setAvailableIdentifierKeys] = useState([]);
  const [selectedIdentifierKey, setSelectedIdentifierKey] = useState('');
  const [columnOrder, setColumnOrder] = useState([]);
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const [participantQuery, setParticipantQuery] = useState('');
  const [newFeatureName, setNewFeatureName] = useState('');
  const [draggingColumnKey, setDraggingColumnKey] = useState('');

  const maxInitialRows = 20;
  const maxFeatureColumns = 6;

  useEffect(() => {
    setColumnOrder((prev) => {
      const filtered = prev.filter((k) => availableIdentifierKeys.includes(k));
      const next = [...filtered];
      availableIdentifierKeys.forEach((k) => {
        if (!next.includes(k)) next.push(k);
      });
      return next;
    });
  }, [availableIdentifierKeys]);

  useEffect(() => {
    if (columnOrder.length === 0) {
      if (selectedIdentifierKey) setSelectedIdentifierKey('');
      return;
    }
    if (!selectedIdentifierKey || !columnOrder.includes(selectedIdentifierKey)) {
      setSelectedIdentifierKey(columnOrder[0]);
    }
  }, [columnOrder, selectedIdentifierKey]);

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
      if (!s?.user) setUiPage('landing');
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const runAfterPayment = async () => {
      const params = new URLSearchParams(window.location.search);
      const checkoutId = params.get('checkout_id');
      const checkoutSuccess = params.get('checkout_success');
      if (!checkoutId || checkoutSuccess !== 'true') return;

      setUiPage('input');
      setStep('loading');
      setMessage('결제 확인 중...');
      try {
        const verifyRes = await fetch(`/api/checkout?checkout_id=${encodeURIComponent(checkoutId)}`);
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData?.paid) {
          throw new Error(verifyData?.error || '결제가 아직 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.');
        }

        const raw = sessionStorage.getItem(PENDING_ASSIGN_KEY);
        if (!raw) throw new Error('결제는 확인됐지만 분석 요청 데이터가 없습니다. 다시 실행해 주세요.');
        const pending = JSON.parse(raw);
        if (!pending?.payload) throw new Error('분석 요청 데이터가 손상되었습니다. 다시 실행해 주세요.');

        const res = await fetch('/api/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...pending.payload,
            checkout_id: checkoutId
          })
        });
        const data = await res.json();
        if (!data.teams) throw new Error(data.error || '배정 실패');

        sessionStorage.removeItem(PENDING_ASSIGN_KEY);
        setTeams(data.teams);
        setMessage('결제 완료 확인 후 팀 배정이 완료되었습니다.');
        setStep('result');
      } catch (error) {
        setStep('input');
        setMessage(error.message || '결제 확인/팀 배정 중 오류가 발생했습니다.');
      } finally {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('checkout_id');
        cleanUrl.searchParams.delete('checkout_success');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
    };

    runAfterPayment();
  }, []);

  if (legalView === 'terms') return <TermsOfService lang="ko" onBack={() => setLegalView(null)} />;
  if (legalView === 'privacy') return <PrivacyPolicy lang="ko" onBack={() => setLegalView(null)} />;
  if (legalView === 'refund') return <RefundPolicy lang="ko" onBack={() => setLegalView(null)} />;

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
    if (error) setMessage(`로그인 실패: ${error.message}`);
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(`로그아웃 실패: ${error.message}`);
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
      setAvailableIdentifierKeys((prev) => Array.from(new Set([...prev, ...featureKeys])));
      setShowAllParticipants(false);

      setParticipants((prev) => [...prev.filter((p) => p.name || Object.keys(p.features || {}).length > 0), ...imported]);

      setMessage(`구글폼 불러오기 완료: ${mapped}명 반영, ${skipped}명 스킵`);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSheetImportLoading(false);
    }
  };

  const mergeImportedParticipants = (imported) => {
    const featureKeys = Array.from(
      new Set(imported.flatMap((p) => Object.keys(p.features || {})).filter(Boolean))
    );
    setAvailableIdentifierKeys((prev) => Array.from(new Set([...prev, ...featureKeys])));
    setShowAllParticipants(false);

    setParticipants((prev) => [...prev.filter((p) => p.name || Object.keys(p.features || {}).length > 0), ...imported]);
  };

  const moveColumnByDrop = (dragKey, dropKey) => {
    if (!dragKey || !dropKey || dragKey === dropKey) return;
    setColumnOrder((prev) => {
      const from = prev.indexOf(dragKey);
      const to = prev.indexOf(dropKey);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const addFeatureColumn = () => {
    const key = String(newFeatureName || '').trim();
    if (!key) return setMessage('추가할 특성명을 입력하세요.');
    if (availableIdentifierKeys.includes(key)) return setMessage('이미 존재하는 특성명입니다.');

    setAvailableIdentifierKeys((prev) => [...prev, key]);
    setParticipants((prev) =>
      prev.map((p) => ({
        ...p,
        features: { ...(p.features || {}), [key]: String(p?.features?.[key] ?? '') }
      }))
    );
    setNewFeatureName('');
  };

  const updateParticipantFeature = (participant, key, value) => {
    const rowKey = participant.internalId || participant.id;
    setParticipants((prev) =>
      prev.map((p) => {
        const currentKey = p.internalId || p.id;
        if (currentKey !== rowKey) return p;
        return {
          ...p,
          features: {
            ...(p.features || {}),
            [key]: String(value ?? '')
          }
        };
      })
    );
  };

  const onUploadCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { text, encoding, fallbackUsed } = await decodeCsvTextWithFallback(file);
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const { participants: imported, mapped, skipped } = mapRowsToParticipants(results.data, 'csv');
          if (!imported.length) {
            setMessage('CSV에서 가져올 데이터가 없습니다.');
            return;
          }
          mergeImportedParticipants(imported);
          setMessage(
            `CSV 불러오기 완료: ${mapped}명 반영, ${skipped}명 스킵${fallbackUsed ? ` (인코딩 자동보정: ${encoding})` : ''}`
          );
        },
        error: () => setMessage('CSV 파싱 중 오류가 발생했습니다.')
      });
    } catch (error) {
      setMessage(error.message || '파일 업로드 처리 중 오류가 발생했습니다.');
    } finally {
      e.target.value = '';
    }
  };

  const validParticipants = useMemo(
    () => participants.filter((p) => !isBlankParticipantRow(p)),
    [participants]
  );

  const filteredParticipants = useMemo(() => {
    const q = participantQuery.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((p) => {
      const idValue = String(selectedIdentifierKey ? p?.features?.[selectedIdentifierKey] || '' : '').toLowerCase();
      const featureText = Object.values(p.features || {}).join(' ').toLowerCase();
      return idValue.includes(q) || featureText.includes(q);
    });
  }, [participantQuery, participants, selectedIdentifierKey]);

  const [excludedFeatureKeys, setExcludedFeatureKeys] = useState([]);

  useEffect(() => {
    if (!selectedIdentifierKey) return;
    setExcludedFeatureKeys((prev) => prev.filter((k) => k !== selectedIdentifierKey));
  }, [selectedIdentifierKey]);

  const applyFeatureExclusion = (features) => {
    const base = features || {};
    const blocked = new Set(excludedFeatureKeys);
    return Object.fromEntries(Object.entries(base).filter(([k]) => !blocked.has(k)));
  };

  const toggleExcludedFeature = (key) => {
    setExcludedFeatureKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectIdentifierKey = (key) => {
    setSelectedIdentifierKey(key);
    setExcludedFeatureKeys((prev) => prev.filter((k) => k !== key));
  };

  const getParticipantIdentifier = (participant) => {
    if (!selectedIdentifierKey) return '';
    return String(participant?.features?.[selectedIdentifierKey] || '').trim();
  };

  const isBlankParticipantRow = (participant) => {
    const features = participant?.features || {};
    const values = Object.values(features);
    if (values.length === 0) return true;
    return values.every((v) => !String(v ?? '').trim());
  };

  const getMissingCellCount = (participant) => {
    if (columnOrder.length === 0) return 0;
    return columnOrder.reduce((count, key) => {
      const value = String(participant?.features?.[key] ?? '').trim();
      return value ? count : count + 1;
    }, 0);
  };

  const tableFeatureKeys = useMemo(() => {
    const candidates = columnOrder
      .filter((k) => k !== selectedIdentifierKey)
      .filter((k) => !excludedFeatureKeys.includes(k));
    return candidates.slice(0, maxFeatureColumns);
  }, [columnOrder, excludedFeatureKeys, selectedIdentifierKey]);

  const shownParticipants = useMemo(() => {
    if (showAllParticipants || filteredParticipants.length <= maxInitialRows) return filteredParticipants;
    return filteredParticipants.slice(0, maxInitialRows);
  }, [filteredParticipants, showAllParticipants]);

  const duplicateIdentifierCount = useMemo(() => {
    if (!selectedIdentifierKey) return 0;
    const counts = new Map();
    validParticipants.forEach((p) => {
      const key = getParticipantIdentifier(p);
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.values()).filter((n) => n > 1).length;
  }, [selectedIdentifierKey, validParticipants]);

  const runAssign = async () => {
    const nonBlankParticipants = participants.filter((p) => !isBlankParticipantRow(p));
    const removedBlankCount = participants.length - nonBlankParticipants.length;
    if (removedBlankCount > 0) {
      setParticipants(nonBlankParticipants);
    }

    if (nonBlankParticipants.length < 2) return setMessage('최소 2명 이상 입력해 주세요.');
    if (!selectedIdentifierKey) return setMessage('기준열을 선택해 주세요.');

    const incompleteRows = nonBlankParticipants.reduce(
      (acc, participant) => {
        const missingCount = getMissingCellCount(participant);
        if (missingCount > 0) {
          acc.rows += 1;
          acc.cells += missingCount;
        }
        return acc;
      },
      { rows: 0, cells: 0 }
    );

    if (incompleteRows.rows > 0) {
      const proceed = window.confirm(
        `미완성 입력 경고\n- 미완성 행: ${incompleteRows.rows}개\n- 비어 있는 칸: ${incompleteRows.cells}개\n\n계속 진행할까요?`
      );
      if (!proceed) {
        setMessage('팀 배정을 중단했습니다. 미완성 칸을 채운 뒤 다시 실행하세요.');
        return;
      }
    }
    if (excludedFeatureKeys.includes(selectedIdentifierKey)) {
      return setMessage('기준열은 제외할 수 없습니다.');
    }

    const payloadParticipants = nonBlankParticipants.map((p, index) => {
      const rawIdentifier = getParticipantIdentifier(p);
      const fallbackIdentifier = `참가자-${index + 1}`;
      const identifierValue = rawIdentifier || fallbackIdentifier;

      return {
        ...p,
        internalId: String(p.internalId || p.id || createInternalId()),
        originalName: p.originalName || p.name || identifierValue,
        name: identifierValue,
        identifierKey: selectedIdentifierKey,
        identifierValue,
        features: applyFeatureExclusion(p.features || {})
      };
    });

    const assignPayload = {
      participants: payloadParticipants,
      config,
      customPrompt: config.useCustomPrompt ? String(customPrompt || '').trim() : ''
    };

    setStep('loading');
    setPaymentLoading(true);
    try {
      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email || undefined,
          metadata: {
            participant_count: payloadParticipants.length,
            identifier_key: selectedIdentifierKey
          }
        })
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok || !checkoutData?.url) {
        throw new Error(checkoutData?.error || '결제 세션 생성 실패');
      }

      sessionStorage.setItem(
        PENDING_ASSIGN_KEY,
        JSON.stringify({
          payload: assignPayload,
          createdAt: Date.now()
        })
      );

      window.location.href = checkoutData.url;
    } catch (error) {
      setMessage(error.message || '결제 연결 중 오류가 발생했습니다.');
      setStep('input');
    } finally {
      setPaymentLoading(false);
    }
  };

  const exportCSV = () => {
    let csv = '\uFEFFTeam,Identifier,Analysis\n';
    teams.forEach((t) =>
      t.members.forEach((m) => {
        const identifier = String(m.name || m.id || '').replaceAll('"', '""');
        const analysis = String(t.analysis || '').replaceAll('"', '""');
        csv += `${t.id},"${identifier}","${analysis}"\n`;
      })
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TeamBuilder_Result.csv';
    a.click();
  };

  const addEmptyParticipantRow = () => {
    const baseColumns = columnOrder.length > 0 ? columnOrder : ['이름'];
    if (columnOrder.length === 0) {
      setAvailableIdentifierKeys((prev) => (prev.includes('이름') ? prev : [...prev, '이름']));
    }
    const features = Object.fromEntries(baseColumns.map((k) => [k, '']));
    setParticipants((prev) => [
      ...prev,
      {
        id: Date.now(),
        internalId: createInternalId(),
        name: '',
        originalName: '',
        intro: '',
        source: 'manual',
        features
      }
    ]);
  };

  const currentPage = step === 'loading' ? 'loading' : step === 'result' ? 'result' : uiPage;

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 p-4">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-16 h-[24rem] w-[24rem] rounded-full bg-emerald-300/20 blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto">
        <div className="sticky top-2 z-20 mb-6 flex justify-between items-center rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
          <button onClick={() => { setStep('input'); setUiPage('landing'); }} className="flex items-center gap-2 font-black text-xl text-slate-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-600 text-white"><Users className="size-4" /></span>
            TeamBuilder
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setUiPage('landing')} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold">랜딩</button>
            {user && <button onClick={() => setUiPage('input')} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold">입력</button>}
            {!user ? (
              <button onClick={() => setUiPage('login')} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-semibold">로그인</button>
            ) : (
              <button onClick={logout} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-semibold">로그아웃</button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
        {currentPage === 'landing' && (
          <motion.div key="landing" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="mt-4 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
              <div className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                  <Sparkles size={14} /> AI Team Orchestration
                </p>
                <h1 className="mt-4 text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                  설문 데이터로<br />
                  <span className="text-cyan-700">팀빌딩 자동화</span>
                </h1>
                <p className="mt-4 text-slate-600 max-w-xl">
                  Google Form 응답을 바로 읽고, 결제 완료 후 AI가 역할과 조합을 분석해 팀을 배정합니다.
                </p>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => (user ? setUiPage('input') : setUiPage('login'))} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-white text-sm font-semibold">
                    시작하기 <ArrowRight size={16} />
                  </button>
                  <button onClick={() => setUiPage('input')} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold">입력 화면 보기</button>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold text-slate-500">프로세스</p>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3"><span className="font-bold">1.</span> 데이터 가져오기</div>
                    <div className="rounded-xl bg-slate-50 p-3"><span className="font-bold">2.</span> 열/팀 조건 설정</div>
                    <div className="rounded-xl bg-slate-50 p-3"><span className="font-bold">3.</span> 결제 후 팀 배정</div>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs text-slate-500">신뢰성</p>
                  <p className="text-sm font-bold mt-2 inline-flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> OAuth + Polar + AI 폴백</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === 'login' && (
          <motion.div key="login" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="mt-10 max-w-xl mx-auto">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-xs font-bold text-slate-500">AUTHENTICATION</p>
              <h2 className="text-4xl font-black mt-2">로그인</h2>
              <p className="text-slate-600 mt-3">교수 계정으로 로그인하면 Google Form 목록을 바로 선택할 수 있습니다.</p>
              <button onClick={login} className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-white font-semibold">Google 로그인</button>
              <button onClick={() => setUiPage('landing')} className="mt-3 w-full rounded-xl border border-slate-300 py-3 font-semibold">랜딩으로 돌아가기</button>
            </div>
          </motion.div>
        )}

        {currentPage === 'input' && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-xs text-slate-500">현재 참가자</p>
                <p className="text-2xl font-black text-slate-900">{validParticipants.length}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-xs text-slate-500">기준열</p>
                <p className="text-sm font-bold truncate">{selectedIdentifierKey || '미선택'}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-xs text-slate-500">맞춤 프롬프트</p>
                <p className="text-sm font-bold">{config.useCustomPrompt ? 'ON' : 'OFF'}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-xs text-slate-500">진행 상태</p>
                <p className="text-sm font-bold">{selectedIdentifierKey ? '배정 준비 완료' : '기준열 선택 필요'}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 grid gap-4">
              <p className="text-sm font-bold">100% 데이터 기반 팀 분석</p>

              <div className="rounded-xl border border-slate-200 p-3 space-y-3 bg-slate-50/70 order-3">
                <p className="text-sm font-bold flex items-center gap-2"><Settings2 size={15} /> 3) 팀 설정</p>
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

              <div className="rounded-xl border border-slate-200 p-3 space-y-3 order-1">
                <p className="text-sm font-bold flex items-center gap-2"><Database size={15} /> 1) 데이터 가져오기</p>
                <p className="text-xs text-slate-500">지원 기능: 구글폼 연결, CSV 업로드, 빈 행 추가</p>
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
                    {sheetListLoading ? '목록 조회 중...' : '내 구글폼 목록'}
                  </button>
                </div>
                <label className="inline-flex w-fit items-center gap-2 px-3 py-2 bg-slate-100 rounded cursor-pointer">
                  <Upload size={16} /> CSV 업로드
                  <input type="file" accept=".csv" className="hidden" onChange={onUploadCsv} />
                </label>
              </div>

              {sheetListOpen && driveForms.length > 0 && (
              <div className="max-h-52 overflow-y-auto border rounded order-1">
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

              {message && <p className="text-sm text-blue-700 font-semibold order-2">{message}</p>}

              <div className="rounded-xl border border-slate-200 p-3 space-y-2 order-2">
                <p className="text-sm font-bold">2) 열 관리</p>
                <p className="text-xs text-slate-500">열 이름을 클릭해서 기준열을 선택하세요.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={newFeatureName}
                    onChange={(e) => setNewFeatureName(e.target.value)}
                    placeholder="새 특성명 입력 (예: MBTI, 성별, 희망역할)"
                    className="px-3 py-2 border rounded text-sm w-72"
                  />
                  <button
                    type="button"
                    onClick={addFeatureColumn}
                    className="px-3 py-2 border rounded text-sm bg-white"
                  >
                    특성(열) 추가
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {columnOrder.length === 0 && (
                    <p className="text-xs text-slate-500">폼을 불러오거나 CSV를 업로드하면 열 목록이 표시됩니다.</p>
                  )}
                  {columnOrder.map((key) => (
                    <div
                      key={`feature-select-${key}`}
                      draggable
                      onDragStart={() => setDraggingColumnKey(key)}
                      onDragEnd={() => setDraggingColumnKey('')}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        moveColumnByDrop(draggingColumnKey, key);
                        setDraggingColumnKey('');
                      }}
                      onClick={() => selectIdentifierKey(key)}
                      className={`inline-flex items-center gap-2 px-2 py-1 border rounded text-sm cursor-move ${
                        selectedIdentifierKey === key ? 'border-cyan-600 bg-cyan-50' : 'bg-slate-50'
                      }`}
                    >
                      <span className="max-w-36 truncate" title={key}>{key}</span>
                      {selectedIdentifierKey === key && <span className="text-[11px] text-cyan-700 font-bold">기준</span>}
                    </div>
                  ))}
                </div>
                {!selectedIdentifierKey && (
                  <p className="text-xs text-rose-600 mt-1">열이 없으면 분석을 시작할 수 없습니다.</p>
                )}
                {selectedIdentifierKey && duplicateIdentifierCount > 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    중복 값 {duplicateIdentifierCount}건이 있습니다. 진행은 가능합니다.
                  </p>
                )}
                <p className="text-xs text-slate-500">분석에서 제외할 열을 선택할 수 있습니다.</p>
                <div className="flex flex-wrap gap-2">
                  {columnOrder.length === 0 && (
                    <p className="text-xs text-slate-500">폼을 먼저 불러오면 특성 목록이 표시됩니다.</p>
                  )}
                  {columnOrder.map((key) => {
                    const isIdentifier = key === selectedIdentifierKey;
                    const checked = excludedFeatureKeys.includes(key);
                    return (
                      <label key={key} className={`inline-flex items-center gap-2 px-2 py-1 border rounded text-sm ${isIdentifier ? 'opacity-50' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isIdentifier}
                          onChange={() => toggleExcludedFeature(key)}
                        />
                        <span className="max-w-44 truncate" title={key}>{key}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden order-4">
              <div className="px-3 py-2 bg-slate-100 text-sm font-semibold">4) 참가자 데이터 (테이블)</div>
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
              </div>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left w-14">No</th>
                      <th className="px-3 py-2 text-left min-w-44">
                        <span className="inline-block max-w-40 truncate" title={selectedIdentifierKey || '기준열 없음'}>
                          {selectedIdentifierKey || '기준열 없음'}
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
                      <tr key={p.internalId || p.id} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2">
                          {selectedIdentifierKey ? (
                            <input
                              value={String(p?.features?.[selectedIdentifierKey] || '')}
                              onChange={(e) => updateParticipantFeature(p, selectedIdentifierKey, e.target.value)}
                              className="w-full border rounded px-2 py-1 text-sm"
                              placeholder="값 입력"
                            />
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        {tableFeatureKeys.map((key) => (
                          <td key={`${p.internalId || p.id}-${key}`} className="px-3 py-2">
                            <input
                              value={String(p?.features?.[key] || '')}
                              onChange={(e) => updateParticipantFeature(p, key, e.target.value)}
                              className="w-full border rounded px-2 py-1 text-sm"
                              placeholder={`${key} 값 입력`}
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <button
                            onClick={() =>
                              setParticipants(
                                participants.filter((x) => (x.internalId || x.id) !== (p.internalId || p.id))
                              )
                            }
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
                onClick={addEmptyParticipantRow}
                className="px-3 py-2 border rounded"
              >
                빈 행 추가
              </button>
              <button onClick={runAssign} disabled={paymentLoading} className="px-4 py-2 bg-cyan-700 text-white rounded disabled:opacity-60">
                {paymentLoading ? '결제창 이동 중...' : '결제 후 팀 배정 실행'}
              </button>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'loading' && (
          <motion.div key="loading" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="mt-16 max-w-2xl mx-auto">
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear', duration: 1.2 }} className="mx-auto h-14 w-14 rounded-full border-4 border-cyan-100 border-t-cyan-600" />
              <h3 className="mt-6 text-3xl font-black">분석 대기 중</h3>
              <p className="mt-2 text-slate-600">결제 확인 후 팀 구성 결과를 계산하고 있습니다.</p>
              <div className="mx-auto mt-6 h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
                <motion.div className="h-full rounded-full bg-cyan-600" initial={{ width: '20%' }} animate={{ width: ['20%', '80%', '35%'] }} transition={{ duration: 2.4, repeat: Infinity }} />
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === 'result' && (
          <motion.div key="result" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-500">RESULT</p>
              <h2 className="text-3xl font-black mt-1">팀 배정 결과</h2>
              <p className="text-sm text-slate-600 mt-1">총 {teams.length}개 팀</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg inline-flex items-center gap-2"
              >
                <Download size={16} /> CSV 다운로드
              </button>
              <button onClick={() => { setStep('input'); setUiPage('input'); }} className="px-4 py-2 border rounded-lg">다시 배정</button>
            </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((t) => (
                <div key={t.id} className="bg-white border rounded-2xl p-4 shadow-sm">
                  <h3 className="font-black mb-2 inline-flex rounded-full bg-slate-900 px-3 py-1 text-white text-sm">Team {t.id}</h3>
                  {t.members.map((m, i) => (
                    <div key={i} className="text-sm border rounded p-2 mb-2">
                      <div className="font-bold">{m.name || m.id || '-'}</div>
                    </div>
                  ))}
                  <div className="text-xs text-slate-600">{t.analysis}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        </AnimatePresence>

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
