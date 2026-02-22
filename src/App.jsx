import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Upload, Trash2, Download, Search, Settings2, Database, ArrowRight, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TermsOfService, RefundPolicy, PrivacyPolicy } from './LegalPages';
import { supabase } from './lib/supabaseClient';

const PENDING_ASSIGN_KEY = 'teambuilder_pending_assign_v1';
const REPORT_CACHE_KEY = 'teambuilder_report_cache_v1';
const PENDING_CHECKOUT_URL_KEY = 'teambuilder_pending_checkout_url_v1';
const APP_ROUTES = {
  landing: '/',
  login: '/login',
  input: '/input',
  polar: '/checkout/pending',
  report: '/report',
  terms: '/legal/terms',
  privacy: '/legal/privacy',
  refund: '/legal/refund'
};

const resolvePageByPathname = (pathname) => {
  const normalizedPath = pathname.startsWith('/en/') ? pathname.slice(3) : pathname;
  if (pathname === APP_ROUTES.login) return 'login';
  if (pathname === APP_ROUTES.input) return 'input';
  if (pathname === APP_ROUTES.polar) return 'polar';
  if (pathname === APP_ROUTES.report) return 'report';
  if (normalizedPath === APP_ROUTES.terms) return 'terms';
  if (normalizedPath === APP_ROUTES.privacy) return 'privacy';
  if (normalizedPath === APP_ROUTES.refund) return 'refund';
  return 'landing';
};
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
  const navigate = useNavigate();
  const location = useLocation();
  const routePage = resolvePageByPathname(location.pathname);
  const routeLang = location.pathname.startsWith('/en/') ? 'en' : 'ko';
  const queryLang = new URLSearchParams(location.search).get('lang');
  const initialLang = queryLang === 'en' || queryLang === 'ko'
    ? queryLang
    : routeLang === 'en'
      ? 'en'
      : 'ko';
  const [uiLang, setUiLang] = useState(() => {
    if (queryLang === 'en' || queryLang === 'ko') return queryLang;
    try {
      return localStorage.getItem('teambuilder_ui_lang') || initialLang;
    } catch {
      return initialLang;
    }
  });
  const tr = (ko, en) => (uiLang === 'en' ? en : ko);

  const goPage = (page, options = {}) => {
    const targetPath = APP_ROUTES[page] || APP_ROUTES.landing;
    if (window.location.pathname === targetPath) return;
    navigate(targetPath, options);
  };
  const goPolicy = (policyPage, lang = uiLang, options = {}) => {
    const basePath = APP_ROUTES[policyPage] || APP_ROUTES.terms;
    const targetPath = lang === 'en' ? `/en${basePath}` : basePath;
    if (window.location.pathname === targetPath) return;
    navigate(targetPath, options);
  };
  const updateLang = (nextLang) => {
    const normalized = nextLang === 'en' ? 'en' : 'ko';
    setUiLang(normalized);
    const isPolicyRoute = routePage === 'terms' || routePage === 'privacy' || routePage === 'refund';
    if (isPolicyRoute) {
      goPolicy(routePage, normalized);
      return;
    }
    const params = new URLSearchParams(location.search);
    if (normalized === 'en') params.set('lang', 'en');
    else params.delete('lang');
    const nextSearch = params.toString();
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
  };
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [config, setConfig] = useState({ teamSize: 4, remainderMode: 'spread', useCustomPrompt: false });
  const [teams, setTeams] = useState([]);
  const [assignmentReport, setAssignmentReport] = useState(null);
  const [reportCacheHydrated, setReportCacheHydrated] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const [formUrl, setFormUrl] = useState('');
  const [sheetImportLoading, setSheetImportLoading] = useState(false);
  const [sheetListLoading, setSheetListLoading] = useState(false);
  const [sheetListOpen, setSheetListOpen] = useState(false);
  const [driveForms, setDriveForms] = useState([]);
  const [message, setMessage] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const reportCacheKey = user?.id ? `${REPORT_CACHE_KEY}_${user.id}` : `${REPORT_CACHE_KEY}_anon`;

  const [availableIdentifierKeys, setAvailableIdentifierKeys] = useState([]);
  const [selectedIdentifierKey, setSelectedIdentifierKey] = useState('');
  const [columnOrder, setColumnOrder] = useState([]);
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const [participantQuery, setParticipantQuery] = useState('');
  const [newFeatureName, setNewFeatureName] = useState('');
  const [draggingColumnKey, setDraggingColumnKey] = useState('');

  const maxInitialRows = 20;
  const maxFeatureColumns = 6;

  const clearAllReportCaches = () => {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(REPORT_CACHE_KEY)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(reportCacheKey);
      if (!raw) {
        setReportCacheHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.teams) && parsed.teams.length > 0) {
        setTeams(parsed.teams);
      }
      if (parsed?.report) {
        setAssignmentReport(parsed.report);
      }
    } catch {
      sessionStorage.removeItem(reportCacheKey);
    } finally {
      setReportCacheHydrated(true);
    }
  }, [reportCacheKey]);

  useEffect(() => {
    if (!reportCacheHydrated) return;
    if (!Array.isArray(teams) || teams.length === 0) {
      sessionStorage.removeItem(reportCacheKey);
      return;
    }
    try {
      sessionStorage.setItem(
        reportCacheKey,
        JSON.stringify({
          teams,
          report: assignmentReport || null,
          updatedAt: Date.now()
        })
      );
    } catch {
      // noop
    }
  }, [teams, assignmentReport, reportCacheHydrated, reportCacheKey]);

  useEffect(() => {
    try {
      localStorage.setItem('teambuilder_ui_lang', uiLang);
    } catch {
      // noop
    }
  }, [uiLang]);

  useEffect(() => {
    const isPolicyRoute = routePage === 'terms' || routePage === 'privacy' || routePage === 'refund';
    if (isPolicyRoute) {
      if (routeLang !== uiLang) setUiLang(routeLang);
      return;
    }
    if (queryLang === 'en' || queryLang === 'ko') {
      if (queryLang !== uiLang) setUiLang(queryLang);
    }
  }, [routeLang, routePage, uiLang, queryLang]);

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
    if (selectedIdentifierKey !== columnOrder[0]) {
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
      if (!s?.user) goPage('landing', { replace: true });
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (routePage !== 'report') return;
    if (!reportCacheHydrated) return;
    if (Array.isArray(teams) && teams.length > 0) return;
    setMessage(tr('결과 데이터가 없습니다. 입력 화면에서 먼저 팀 배정을 실행해 주세요.', 'No report data found. Run team assignment from input page first.'));
    goPage('input', { replace: true });
  }, [routePage, teams, reportCacheHydrated]);

  useEffect(() => {
    if (routePage !== 'polar') return;
    const params = new URLSearchParams(window.location.search);
    const hasCheckoutReturn = Boolean(params.get('checkout_id') && params.get('checkout_success') === 'true');
    if (hasCheckoutReturn) return;
    const hasPendingAssign = Boolean(sessionStorage.getItem(PENDING_ASSIGN_KEY));
    if (paymentLoading || hasPendingAssign) return;
    setMessage(tr('유효한 결제 대기 정보가 없어 입력 화면으로 이동합니다.', 'No valid pending checkout info. Redirecting to input page.'));
    goPage('input', { replace: true });
  }, [routePage, paymentLoading]);

  useEffect(() => {
    const runAfterPayment = async () => {
      const params = new URLSearchParams(window.location.search);
      const checkoutId = params.get('checkout_id');
      const checkoutSuccess = params.get('checkout_success');
      if (!checkoutId || checkoutSuccess !== 'true') return;

      goPage('polar', { replace: true });
      setStep('loading');
      setMessage(tr('결제 확인 중...', 'Verifying checkout...'));
      try {
        const verifyRes = await fetch(`/api/checkout?checkout_id=${encodeURIComponent(checkoutId)}`);
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData?.paid) {
          throw new Error(verifyData?.error || tr('결제가 아직 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.', 'Payment is not completed yet. Please try again shortly.'));
        }

        const raw = sessionStorage.getItem(PENDING_ASSIGN_KEY);
        if (!raw) throw new Error(tr('결제는 확인됐지만 분석 요청 데이터가 없습니다. 다시 실행해 주세요.', 'Payment was verified but assignment payload is missing. Please run again.'));
        const pending = JSON.parse(raw);
        if (!pending?.payload) throw new Error(tr('분석 요청 데이터가 손상되었습니다. 다시 실행해 주세요.', 'Assignment payload is corrupted. Please run again.'));

        const res = await fetch('/api/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...pending.payload,
            checkout_id: checkoutId
          })
        });
        const data = await res.json();
        if (!data.teams) throw new Error(data.error || tr('배정 실패', 'Assignment failed'));

        sessionStorage.removeItem(PENDING_ASSIGN_KEY);
        setTeams(data.teams);
        setAssignmentReport(data.report || null);
        setMessage(tr('결제 완료 확인 후 팀 배정이 완료되었습니다.', 'Checkout verified and team assignment completed.'));
        setStep('result');
        goPage('report', { replace: true });
      } catch (error) {
        setStep('input');
        goPage('input', { replace: true });
        setMessage(error.message || tr('결제 확인/팀 배정 중 오류가 발생했습니다.', 'Error occurred while verifying checkout and assigning teams.'));
      } finally {
        sessionStorage.removeItem(PENDING_CHECKOUT_URL_KEY);
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('checkout_id');
        cleanUrl.searchParams.delete('checkout_success');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
    };

    runAfterPayment();
  }, []);

  if (routePage === 'terms') {
    return (
      <TermsOfService
        lang={routeLang}
        onBack={() => goPage('landing')}
        onSwitchLang={(nextLang) => goPolicy('terms', nextLang, { replace: true })}
      />
    );
  }
  if (routePage === 'privacy') {
    return (
      <PrivacyPolicy
        lang={routeLang}
        onBack={() => goPage('landing')}
        onSwitchLang={(nextLang) => goPolicy('privacy', nextLang, { replace: true })}
      />
    );
  }
  if (routePage === 'refund') {
    return (
      <RefundPolicy
        lang={routeLang}
        onBack={() => goPage('landing')}
        onSwitchLang={(nextLang) => goPolicy('refund', nextLang, { replace: true })}
      />
    );
  }

  const login = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${APP_ROUTES.login}`,
        scopes:
          'openid email profile https://www.googleapis.com/auth/forms.body.readonly https://www.googleapis.com/auth/forms.responses.readonly https://www.googleapis.com/auth/drive.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' }
      }
    });
    if (error) setMessage(tr(`로그인 실패: ${error.message}`, `Sign-in failed: ${error.message}`));
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(tr(`로그아웃 실패: ${error.message}`, `Sign-out failed: ${error.message}`));
    if (!error) {
      clearAllReportCaches();
      sessionStorage.removeItem(PENDING_CHECKOUT_URL_KEY);
      goPage('landing');
    }
  };

  const openSheets = async () => {
    try {
      if (!session?.provider_token) throw new Error(tr('Google 권한 토큰이 없습니다. 재로그인하세요.', 'Google permission token missing. Please sign in again.'));
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

      if (!res.ok) throw new Error(tr('구글폼 목록 조회 실패', 'Failed to fetch Google Form list'));

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
      if (!session?.provider_token) throw new Error(tr('Google 권한 토큰이 없습니다. 재로그인하세요.', 'Google permission token missing. Please sign in again.'));
      const formId = parseFormId(urlOrId ?? formUrl);
      if (!formId) throw new Error(tr('유효한 Google Form URL 또는 ID를 입력하세요.', 'Enter a valid Google Form URL or Form ID.'));

      setSheetImportLoading(true);
      setMessage('');

      const formRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
        headers: { Authorization: `Bearer ${session.provider_token}` }
      });
      if (!formRes.ok) throw new Error(tr('구글폼 메타데이터 조회 실패', 'Failed to fetch Google Form metadata'));
      const formData = await formRes.json();

      const respRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses?pageSize=500`, {
        headers: { Authorization: `Bearer ${session.provider_token}` }
      });
      if (!respRes.ok) throw new Error(tr('구글폼 응답 조회 실패', 'Failed to fetch Google Form responses'));
      const responses = await respRes.json();

      const { participants: imported, mapped, skipped } = mapFormResponsesToParticipants(formData, responses);
      if (!imported.length) throw new Error(tr('가져올 참가자 데이터가 없습니다.', 'No participant data to import.'));

      const featureKeys = Array.from(
        new Set(imported.flatMap((p) => Object.keys(p.features || {})).filter(Boolean))
      );
      setAvailableIdentifierKeys((prev) => Array.from(new Set([...prev, ...featureKeys])));
      setShowAllParticipants(false);

      setParticipants((prev) => [...prev.filter((p) => p.name || Object.keys(p.features || {}).length > 0), ...imported]);

      setMessage(tr(`구글폼 불러오기 완료: ${mapped}명 반영, ${skipped}명 스킵`, `Google Form import completed: ${mapped} mapped, ${skipped} skipped`));
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
    if (!key) return setMessage(tr('추가할 특성명을 입력하세요.', 'Enter a new column name.'));
    if (availableIdentifierKeys.includes(key)) return setMessage(tr('이미 존재하는 특성명입니다.', 'Column already exists.'));

    setAvailableIdentifierKeys((prev) => [...prev, key]);
    setParticipants((prev) =>
      prev.map((p) => ({
        ...p,
        features: { ...(p.features || {}), [key]: String(p?.features?.[key] ?? '') }
      }))
    );
    setNewFeatureName('');
  };

  const removeFeatureColumn = (key) => {
    if (availableIdentifierKeys.length <= 1) {
      setMessage(tr('특성은 최소 1개 이상 필요합니다.', 'At least one column is required.'));
      return;
    }

    setAvailableIdentifierKeys((prev) => prev.filter((k) => k !== key));
    setExcludedFeatureKeys((prev) => prev.filter((k) => k !== key));
    setParticipants((prev) =>
      prev.map((p) => {
        const next = { ...(p.features || {}) };
        delete next[key];
        return { ...p, features: next };
      })
    );
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
            setMessage(tr('CSV에서 가져올 데이터가 없습니다.', 'No importable data found in CSV.'));
            return;
          }
          mergeImportedParticipants(imported);
          setMessage(
            tr(
              `CSV 불러오기 완료: ${mapped}명 반영, ${skipped}명 스킵${fallbackUsed ? ` (인코딩 자동보정: ${encoding})` : ''}`,
              `CSV import completed: ${mapped} mapped, ${skipped} skipped${fallbackUsed ? ` (encoding fallback: ${encoding})` : ''}`
            )
          );
        },
        error: () => setMessage(tr('CSV 파싱 중 오류가 발생했습니다.', 'CSV parsing error occurred.'))
      });
    } catch (error) {
      setMessage(error.message || tr('파일 업로드 처리 중 오류가 발생했습니다.', 'Error occurred while handling file upload.'));
    } finally {
      e.target.value = '';
    }
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

  const [excludedFeatureKeys, setExcludedFeatureKeys] = useState([]);

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

  const getParticipantIdentifier = (participant) => {
    if (!selectedIdentifierKey) return '';
    return String(participant?.features?.[selectedIdentifierKey] || '').trim();
  };

  const tableFeatureKeys = useMemo(() => {
    const candidates = columnOrder
      .filter((k) => k !== (columnOrder[0] || ''))
      .filter((k) => !excludedFeatureKeys.includes(k));
    return candidates.slice(0, maxFeatureColumns);
  }, [columnOrder, excludedFeatureKeys]);

  const shownParticipants = useMemo(() => {
    if (showAllParticipants || filteredParticipants.length <= maxInitialRows) return filteredParticipants;
    return filteredParticipants.slice(0, maxInitialRows);
  }, [filteredParticipants, showAllParticipants]);

  const teamReportMap = useMemo(() => {
    const reports = Array.isArray(assignmentReport?.teamReports) ? assignmentReport.teamReports : [];
    return new Map(reports.map((r) => [Number(r.teamId) || r.teamId, r]));
  }, [assignmentReport]);

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
    if (validParticipants.length < 2) return setMessage(tr('최소 2명 이상 입력해 주세요.', 'Please provide at least 2 participants.'));
    if (!selectedIdentifierKey) return setMessage(tr('맨 앞 열이 필요합니다. 열을 추가해 주세요.', 'Primary column is required. Please add a column.'));

    const missingIdentifier = validParticipants.filter((p) => !getParticipantIdentifier(p));
    if (missingIdentifier.length > 0) {
      return setMessage(tr(`맨 앞 열 값이 비어 있는 참가자가 ${missingIdentifier.length}명 있습니다.`, `${missingIdentifier.length} participants have empty primary-column values.`));
    }
    if (excludedFeatureKeys.includes(selectedIdentifierKey)) {
      return setMessage(tr('맨 앞 열은 제외할 수 없습니다.', 'Primary column cannot be excluded.'));
    }
    const payloadParticipants = validParticipants.map((p) => ({
      ...p,
      internalId: String(p.internalId || p.id || createInternalId()),
      originalName: p.originalName || p.name,
      name: getParticipantIdentifier(p),
      identifierKey: selectedIdentifierKey,
      identifierValue: getParticipantIdentifier(p),
      features: applyFeatureExclusion(p.features || {})
    }));

    const assignPayload = {
      participants: payloadParticipants,
      config,
      customPrompt: config.useCustomPrompt ? String(customPrompt || '').trim() : ''
    };

    setStep('loading');
    goPage('polar');
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
        throw new Error(checkoutData?.error || tr('결제 세션 생성 실패', 'Failed to create checkout session'));
      }

      sessionStorage.setItem(
        PENDING_ASSIGN_KEY,
        JSON.stringify({
          payload: assignPayload,
          createdAt: Date.now()
        })
      );
      sessionStorage.setItem(PENDING_CHECKOUT_URL_KEY, checkoutData.url);

      window.location.href = checkoutData.url;
    } catch (error) {
      setMessage(error.message || tr('결제 연결 중 오류가 발생했습니다.', 'Error occurred while opening checkout.'));
      setStep('input');
      goPage('input');
    } finally {
      setPaymentLoading(false);
    }
  };

  const exportCSV = () => {
    let csv = '\uFEFFTeam,Identifier,Analysis,TeamReason\n';
    teams.forEach((t) =>
      t.members.forEach((m) => {
        const identifier = String(m.name || m.id || '').replaceAll('"', '""');
        const analysis = String(t.analysis || '').replaceAll('"', '""');
        const teamReport = teamReportMap.get(Number(t.id) || t.id);
        const teamReason = String(teamReport?.reason || '').replaceAll('"', '""');
        csv += `${t.id},"${identifier}","${analysis}","${teamReason}"\n`;
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
        name: '새 참여자',
        originalName: '새 참여자',
        intro: '',
        source: 'manual',
        features
      }
    ]);
  };

  const routeParams = new URLSearchParams(window.location.search);
  const hasCheckoutReturn = Boolean(routeParams.get('checkout_id') && routeParams.get('checkout_success') === 'true');
  const currentPage =
    routePage === 'polar'
      ? (paymentLoading || hasCheckoutReturn ? 'loading' : 'polar_wait')
      : routePage === 'report'
        ? 'result'
        : routePage;
  const isEn = uiLang === 'en';
  const tx = {
    login: isEn ? 'Sign in' : '로그인',
    logout: isEn ? 'Sign out' : '로그아웃',
    landingBadge: isEn ? 'Team Assignment Assistant' : '팀 편성 어시스턴트',
    landingTitleLine2: isEn ? 'Make Teams in Minutes' : '몇 분 안에 팀 편성',
    landingBody: isEn
      ? 'Import responses, set simple rules, and confirm teams.'
      : '응답을 불러오고, 규칙을 정한 뒤, 팀을 확정하세요.',
    start: isEn ? 'Get started' : '시작하기',
    demo: isEn ? 'Try with sample data' : '샘플로 바로 시작',
    quickFlowTitle: isEn ? 'How it works' : '사용 방법',
    flowStep1: isEn ? 'Import data' : '데이터 불러오기',
    flowStep2: isEn ? 'Set rules' : '규칙 설정',
    flowStep3: isEn ? 'Confirm teams' : '팀 확정',
    flowStep1Desc: isEn ? 'Google Form or CSV' : 'Google Form 또는 CSV',
    flowStep2Desc: isEn ? 'team size and constraints' : '팀 인원과 조건 선택',
    flowStep3Desc: isEn ? 'download and share result' : '결과 확인 후 다운로드',
    workspaceAccess: isEn ? 'Workspace Access' : '워크스페이스 접속',
    workspaceTitle: isEn ? 'Instructor Ops Console' : '교수자 운영 콘솔',
    workspaceBody: isEn
      ? 'After sign-in, form list, payment verification, and reports run in one operational flow.'
      : '로그인하면 폼 목록 조회, 결제 검증, 결과 리포트 관리가 하나의 흐름으로 연결됩니다.',
    connectOAuth: isEn ? 'Connect with Google OAuth' : 'Google OAuth로 계정을 연결하세요.',
    googleLogin: isEn ? 'Continue with Google' : 'Google 로그인',
    backToLanding: isEn ? 'Back to landing' : '랜딩으로 돌아가기',
    participants: isEn ? 'Participants' : '현재 참가자',
    primaryColumn: isEn ? 'Primary column' : '맨 앞 열',
    customPrompt: isEn ? 'Custom prompt' : '맞춤 프롬프트',
    progressStatus: isEn ? 'Status' : '진행 상태',
    ready: isEn ? 'Ready for assignment' : '배정 준비 완료',
    needPrimary: isEn ? 'Primary column required' : '맨 앞 열 확인 필요',
    dataDrivenAnalysis: isEn ? '100% data-driven team analysis' : '100% 데이터 기반 팀 분석',
    teamSettings: isEn ? '1) Team settings' : '1) 팀 설정',
    teamSize: isEn ? 'Members per team' : '1팀당 인원',
    remainderSpread: isEn ? 'Spread remainders into existing teams' : '나머지 인원 기존 팀에 배분',
    remainderPartial: isEn ? 'Keep final team as partial' : '마지막 팀을 부족 인원 그대로 유지',
    customPromptToggle: isEn ? 'Use custom prompt' : '사용자 맞춤 프롬프트 사용',
    importData: isEn ? '2) Import data' : '2) 데이터 가져오기',
    importHint: isEn ? 'Google Form, CSV upload, and manual row are supported' : '지원 기능: 구글폼 연결, CSV 업로드, 빈 행 추가',
    load: isEn ? 'Load' : '불러오기',
    loading: isEn ? 'Loading...' : '불러오는 중...',
    myForms: isEn ? 'My Google Forms' : '내 구글폼 목록',
    loadingList: isEn ? 'Fetching list...' : '목록 조회 중...',
    uploadCsv: isEn ? 'Upload CSV' : 'CSV 업로드',
    columnMgmt: isEn ? '3) Column management' : '3) 열 관리',
    tableTitle: isEn ? '4) Participant table' : '4) 참가자 데이터 (테이블)',
    search: isEn ? 'Search participant/value' : '참가자/값 검색',
    noResult: isEn ? 'No matching participants' : '검색 결과가 없습니다.',
    addRow: isEn ? 'Add empty row' : '빈 행 추가',
    runAssign: isEn ? 'Run assignment after payment' : '결제 후 팀 배정 실행',
    moveToPayment: isEn ? 'Opening checkout...' : '결제창 이동 중...',
    analyzing: isEn ? 'Analyzing with AI' : 'AI 분석 중',
    analyzingDesc: isEn ? 'Verifying payment and calculating team composition.' : '결제 확인 후 팀 구성 결과를 계산하고 있습니다.',
    pendingTitle: isEn ? 'Checkout pending state' : '결제 대기 상태',
    pendingDesc: isEn ? 'No valid checkout return found, so auto verification cannot start.' : '결제 복귀 정보가 없어서 자동 검증을 시작할 수 없습니다.',
    goPayment: isEn ? 'Go to checkout' : '결제 페이지로 이동',
    goInput: isEn ? 'Go to input' : '입력 화면으로 이동',
    downloadCsv: isEn ? 'Download CSV' : 'CSV 다운로드',
    rerunAssign: isEn ? 'Edit prompt and re-run' : '프롬프트 수정 후 다시 배정',
    fullReport: isEn ? 'Full report' : '전체 결과 보고서',
    teamReason: isEn ? 'Team rationale' : '팀 편성 근거'
    ,
    formUrlPlaceholder: isEn ? 'Google Form URL or Form ID' : 'Google Form URL 또는 Form ID',
    promptPlaceholder: isEn ? 'e.g., keep A and B together, balance gender, mix different collaboration styles' : '예: 김민지와 김철수는 같은 팀, 각 팀 성별은 최대한 균형, 성향 다른 사람끼리 섞기',
    leadingColumnRule: isEn ? 'Teams are built using the first column as identifier.' : '맨 앞 열을 기준으로 팀을 나눕니다.',
    addColumnPlaceholder: isEn ? 'New column name (e.g., MBTI, gender, preferred role)' : '새 특성명 입력 (예: MBTI, 성별, 희망역할)',
    addColumn: isEn ? 'Add column' : '특성(열) 추가',
    columnListHint: isEn ? 'Column list appears after importing a form or CSV.' : '폼을 불러오거나 CSV를 업로드하면 열 목록이 표시됩니다.',
    baseLabel: isEn ? 'Base' : '기준',
    deleteLabel: isEn ? 'Delete' : '삭제',
    noColumnToRun: isEn ? 'Cannot start analysis without columns.' : '열이 없으면 분석을 시작할 수 없습니다.',
    duplicateValueNotice: isEn ? 'duplicate values found. You can still continue.' : '건이 있습니다. 진행은 가능합니다.',
    excludeFieldHint: isEn ? 'Choose columns to exclude from analysis.' : '분석에서 제외할 열을 선택할 수 있습니다.',
    loadFormFirstHint: isEn ? 'Import a form first to show feature columns.' : '폼을 먼저 불러오면 특성 목록이 표시됩니다.',
    noPrimaryColumn: isEn ? 'No primary column' : '맨 앞 열 없음',
    valueInput: isEn ? 'Enter value' : '값 입력',
    moreView: isEn ? 'Show all' : '전체보기',
    collapse: isEn ? 'Collapse' : '접기',
    waitingCheckoutLinkMissing: isEn ? 'No recoverable checkout link. Please start payment again.' : '복구 가능한 결제 링크가 없습니다. 다시 결제를 시작해 주세요.',
    reportMetaPrefix: isEn ? 'Constraint parse source' : '제약 파싱 소스',
    reportConflicts: isEn ? 'Request conflicts' : '요청 충돌',
    reportAmbiguities: isEn ? 'Ambiguous/qualitative handling' : '모호/정성 요청 처리',
    reportWarnings: isEn ? 'Impossible/constraint warnings' : '불가능/제약 경고',
    checklistItem: isEn ? 'Checklist item' : '체크 항목',
    requested: isEn ? 'Requested' : '요청됨',
    notRequested: isEn ? 'Not requested' : '요청되지 않음',
    constraintDetail: isEn ? 'Constraint detail status' : '제약 상세 판정',
    decisionLog: isEn ? 'Decision log' : '자동 판단 로그'
  };

  return (
    <div className="min-h-screen bg-[#f5f6f1] text-[#1a1f2e] p-4 md:p-6">
      <div className="max-w-[1280px] mx-auto">
        <div className="sticky top-4 z-20 flex justify-between items-center py-3 px-4 md:px-5 rounded-2xl border border-[#d9deea] bg-white/85 backdrop-blur-md shadow-[0_8px_25px_rgba(18,24,40,0.06)]">
          <button
            type="button"
            onClick={() => goPage('landing')}
            className="inline-flex items-center gap-2 font-extrabold text-lg text-[#141b2d] tracking-tight"
          >
            <Users className="size-5 text-[#1570ef]" /> TeamBuilder
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nextLang = uiLang === 'ko' ? 'en' : 'ko';
                updateLang(nextLang);
              }}
              className="px-3 py-1 border border-[#d9deea] rounded-lg text-xs font-semibold bg-white"
            >
              {uiLang === 'ko' ? 'EN' : 'KO'}
            </button>
            {!user ? (
              <button onClick={() => goPage('login')} className="px-3 py-1.5 bg-[#1a2138] text-white rounded-lg text-sm font-semibold">{tx.login}</button>
            ) : (
              <button onClick={logout} className="px-3 py-1.5 bg-[#eef2f7] rounded-lg text-sm font-semibold">{tx.logout}</button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
        {currentPage === 'landing' && (
          <motion.div key="landing" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="mt-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
              <div className="rounded-[28px] border border-[#d9deea] bg-white px-6 py-7 md:px-9 md:py-10 shadow-[0_18px_40px_rgba(18,24,40,0.08)]">
                <p className="inline-flex items-center gap-2 rounded-full border border-[#d4e6ff] bg-[#f2f8ff] px-3 py-1 text-xs font-semibold text-[#1868db]">
                  <Sparkles size={14} /> {tx.landingBadge}
                </p>
                <h1 className="mt-5 text-4xl lg:text-5xl font-black leading-[1.05] tracking-[-0.02em]">
                  Data-In, Teams-Out.
                  <br />
                  <span className="text-[#1570ef]">{tx.landingTitleLine2}</span>
                </h1>
                <p className="mt-4 text-[#4b556b] max-w-2xl leading-7">
                  {tx.landingBody}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button onClick={() => (user ? goPage('input') : goPage('login'))} className="inline-flex items-center gap-2 rounded-xl bg-[#1a2138] px-5 py-3 text-white font-semibold">
                    {tx.start} <ArrowRight size={16} />
                  </button>
                  <button onClick={() => goPage('input')} className="rounded-xl border border-[#d9deea] bg-white px-5 py-3 font-semibold">{tx.demo}</button>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#d9deea] bg-white p-5 shadow-[0_18px_40px_rgba(18,24,40,0.08)]">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#6b7280] font-bold">{tx.quickFlowTitle}</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-[#e7ebf3] bg-[#f8fafc] p-4">
                    <p className="text-sm font-bold">1. {tx.flowStep1}</p>
                    <p className="text-xs text-[#667085] mt-1">{tx.flowStep1Desc}</p>
                  </div>
                  <div className="rounded-2xl border border-[#e7ebf3] bg-[#f8fafc] p-4">
                    <p className="text-sm font-bold">2. {tx.flowStep2}</p>
                    <p className="text-xs text-[#667085] mt-1">{tx.flowStep2Desc}</p>
                  </div>
                  <div className="rounded-2xl border border-[#e7ebf3] bg-[#f8fafc] p-4">
                    <p className="text-sm font-bold">3. {tx.flowStep3}</p>
                    <p className="text-xs text-[#667085] mt-1">{tx.flowStep3Desc}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === 'login' && (
          <motion.div key="login" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="mt-10 max-w-5xl mx-auto grid md:grid-cols-2 gap-5">
            <div className="rounded-[28px] border border-[#d9deea] bg-[#1b2137] text-white p-8 shadow-[0_20px_45px_rgba(18,24,40,0.22)]">
              <p className="text-xs uppercase tracking-[0.18em] text-white/70">{tx.workspaceAccess}</p>
              <h2 className="mt-4 text-4xl font-black leading-tight">{tx.workspaceTitle}</h2>
              <p className="mt-4 text-white/80 leading-7">{tx.workspaceBody}</p>
            </div>
            <div className="rounded-[28px] border border-[#d9deea] bg-white p-8 shadow-[0_18px_40px_rgba(18,24,40,0.08)]">
              <h3 className="text-3xl font-black tracking-tight">{tx.login}</h3>
              <p className="text-[#667085] mt-3">{tx.connectOAuth}</p>
              <button onClick={login} className="mt-6 w-full rounded-xl bg-[#1a2138] py-3 text-white font-semibold">{tx.googleLogin}</button>
              <button onClick={() => goPage('landing')} className="mt-3 w-full rounded-xl border border-[#d9deea] py-3 font-semibold">{tx.backToLanding}</button>
            </div>
          </motion.div>
        )}

        {currentPage === 'input' && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-white border border-[#d9deea] rounded-2xl p-4">
                <p className="text-xs text-[#667085]">{tx.participants}</p>
                <p className="text-2xl font-black text-slate-900">{validParticipants.length}</p>
              </div>
              <div className="bg-white border border-[#d9deea] rounded-2xl p-4">
                <p className="text-xs text-[#667085]">{tx.primaryColumn}</p>
                <p className="text-sm font-bold truncate">{selectedIdentifierKey || tx.noPrimaryColumn}</p>
              </div>
              <div className="bg-white border border-[#d9deea] rounded-2xl p-4">
                <p className="text-xs text-[#667085]">{tx.customPrompt}</p>
                <p className="text-sm font-bold">{config.useCustomPrompt ? 'ON' : 'OFF'}</p>
              </div>
              <div className="bg-white border border-[#d9deea] rounded-2xl p-4">
                <p className="text-xs text-[#667085]">{tx.progressStatus}</p>
                <p className="text-sm font-bold">{selectedIdentifierKey ? tx.ready : tx.needPrimary}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#d9deea] p-6 space-y-4">
              <p className="text-sm font-bold">{tx.dataDrivenAnalysis}</p>

              <div className="rounded-xl border border-[#d9deea] p-3 space-y-3 bg-[#f7f9fc]/70">
                <p className="text-sm font-bold flex items-center gap-2"><Settings2 size={15} /> {tx.teamSettings}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                  <span>{tx.teamSize}</span>
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
                  {tx.remainderSpread}
                </label>

                <label className="inline-flex items-center gap-2 px-2 py-1 border rounded">
                  <input
                    type="radio"
                    checked={config.remainderMode === 'keep_partial'}
                    onChange={() => setConfig({ ...config, remainderMode: 'keep_partial' })}
                  />
                  {tx.remainderPartial}
                </label>
              </div>
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 px-2 py-1 border rounded text-sm">
                  <input
                    type="checkbox"
                    checked={config.useCustomPrompt}
                    onChange={(e) => setConfig({ ...config, useCustomPrompt: e.target.checked })}
                  />
                  {tx.customPromptToggle}
                </label>
                {config.useCustomPrompt && (
                  <div className="space-y-2">
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder={tx.promptPlaceholder}
                      className="w-full min-h-24 border rounded px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>
              </div>

              <div className="rounded-xl border border-[#d9deea] p-3 space-y-3">
                <p className="text-sm font-bold flex items-center gap-2"><Database size={15} /> {tx.importData}</p>
                <p className="text-xs text-[#667085]">{tx.importHint}</p>
                <div className="flex gap-2">
                  <input
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder={tx.formUrlPlaceholder}
                    className="flex-1 border rounded px-3 py-2"
                  />
                  <button
                    onClick={() => importSheet()}
                    disabled={sheetImportLoading}
                    className="px-3 py-2 bg-[#1a2138] text-white rounded"
                  >
                      {sheetImportLoading ? tx.loading : tx.load}
                  </button>
                  <button
                    onClick={openSheets}
                    disabled={sheetListLoading}
                    className="px-3 py-2 bg-slate-200 rounded"
                  >
                      {sheetListLoading ? tx.loadingList : tx.myForms}
                  </button>
                </div>
                <label className="inline-flex w-fit items-center gap-2 px-3 py-2 bg-[#f2f5fa] rounded cursor-pointer">
                  <Upload size={16} /> {tx.uploadCsv}
                  <input type="file" accept=".csv" className="hidden" onChange={onUploadCsv} />
                </label>
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
                    className="w-full text-left px-3 py-2 border-b hover:bg-[#f7f9fc]"
                  >
                    <div className="font-semibold text-sm">{f.name}</div>
                    <div className="text-xs text-[#667085]">{f.id}</div>
                  </button>
                ))}
              </div>
              )}

              {message && <p className="text-sm text-blue-700 font-semibold">{message}</p>}

              <div className="rounded-xl border border-[#d9deea] p-3 space-y-2">
                <p className="text-sm font-bold">{tx.columnMgmt}</p>
                <p className="text-xs text-[#667085]">{tx.leadingColumnRule}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={newFeatureName}
                    onChange={(e) => setNewFeatureName(e.target.value)}
                    placeholder={tx.addColumnPlaceholder}
                    className="px-3 py-2 border rounded text-sm w-72"
                  />
                  <button
                    type="button"
                    onClick={addFeatureColumn}
                    className="px-3 py-2 border rounded text-sm bg-white"
                  >
                    {tx.addColumn}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {columnOrder.length === 0 && (
                    <p className="text-xs text-[#667085]">{tx.columnListHint}</p>
                  )}
                  {columnOrder.map((key) => (
                    <div
                      key={`feature-remove-${key}`}
                      draggable
                      onDragStart={() => setDraggingColumnKey(key)}
                      onDragEnd={() => setDraggingColumnKey('')}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        moveColumnByDrop(draggingColumnKey, key);
                        setDraggingColumnKey('');
                      }}
                      className={`inline-flex items-center gap-2 px-2 py-1 border rounded text-sm cursor-move ${
                        columnOrder[0] === key ? 'border-cyan-600 bg-cyan-50' : 'bg-[#f7f9fc]'
                      }`}
                    >
                      <span className="max-w-36 truncate" title={key}>{key}</span>
                      {columnOrder[0] === key && <span className="text-[11px] text-cyan-700 font-bold">{tx.baseLabel}</span>}
                      <button
                        type="button"
                        onClick={() => removeFeatureColumn(key)}
                        className="text-rose-600"
                      >
                        {tx.deleteLabel}
                      </button>
                    </div>
                  ))}
                </div>
                {!selectedIdentifierKey && (
                  <p className="text-xs text-rose-600 mt-1">{tx.noColumnToRun}</p>
                )}
                {selectedIdentifierKey && duplicateIdentifierCount > 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    {isEn ? `${duplicateIdentifierCount} ${tx.duplicateValueNotice}` : `중복 값 ${duplicateIdentifierCount}${tx.duplicateValueNotice}`}
                  </p>
                )}
                <p className="text-xs text-[#667085]">{tx.excludeFieldHint}</p>
                <div className="flex flex-wrap gap-2">
                  {columnOrder.length === 0 && (
                    <p className="text-xs text-[#667085]">{tx.loadFormFirstHint}</p>
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

              <div className="rounded-xl border border-[#d9deea] overflow-hidden">
              <div className="px-3 py-2 bg-[#f2f5fa] text-sm font-semibold">{tx.tableTitle}</div>
              <div className="px-3 py-2 border-b bg-white flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-[#667085]" />
                  <input
                    value={participantQuery}
                    onChange={(e) => setParticipantQuery(e.target.value)}
                    placeholder={tx.search}
                    className="border rounded px-2 py-1 text-sm w-52"
                  />
                </div>
              </div>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#f7f9fc] border-b">
                    <tr>
                      <th className="px-3 py-2 text-left w-14">No</th>
                      <th className="px-3 py-2 text-left min-w-44">
                        <span className="inline-block max-w-40 truncate" title={selectedIdentifierKey || tx.noPrimaryColumn}>
                          {selectedIdentifierKey || tx.noPrimaryColumn}
                        </span>
                      </th>
                      {tableFeatureKeys.map((key) => (
                        <th key={key} className="px-3 py-2 text-left min-w-44">
                          <span className="inline-block max-w-40 truncate" title={key}>{key}</span>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left w-16">{tx.deleteLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownParticipants.map((p, idx) => (
                      <tr key={p.internalId || p.id} className="border-b hover:bg-[#f7f9fc]">
                        <td className="px-3 py-2 text-[#667085]">{idx + 1}</td>
                        <td className="px-3 py-2">
                          {selectedIdentifierKey ? (
                            <input
                              value={String(p?.features?.[selectedIdentifierKey] || '')}
                              onChange={(e) => updateParticipantFeature(p, selectedIdentifierKey, e.target.value)}
                              className="w-full border rounded px-2 py-1 text-sm"
                              placeholder={tx.valueInput}
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
                              placeholder={isEn ? `${key} value` : `${key} 값 입력`}
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
                            className="text-[#667085]"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {shownParticipants.length === 0 && (
                      <tr>
                        <td colSpan={tableFeatureKeys.length + 3} className="px-3 py-6 text-center text-[#667085]">
                          {tx.noResult}
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
                className="px-3 py-2 border rounded hover:bg-[#f7f9fc]"
              >
                {showAllParticipants
                  ? tx.collapse
                  : isEn
                    ? `${tx.moreView} (+${filteredParticipants.length - maxInitialRows})`
                    : `${tx.moreView} (${filteredParticipants.length - maxInitialRows}명 더 보기)`}
              </button>
              )}

              <div className="sticky bottom-3 bg-white/95 backdrop-blur border border-[#d9deea] rounded-xl p-3 flex gap-2">
              <button
                onClick={addEmptyParticipantRow}
                className="px-3 py-2 border rounded"
              >
                {tx.addRow}
              </button>
              <button onClick={runAssign} disabled={paymentLoading} className="px-4 py-2 bg-cyan-700 text-white rounded disabled:opacity-60">
                {paymentLoading ? tx.moveToPayment : tx.runAssign}
              </button>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'loading' && (
          <motion.div key="loading" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="mt-16 max-w-2xl mx-auto">
            <div className="rounded-3xl border border-[#d9deea] bg-white p-10 text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear', duration: 1.4 }} className="mx-auto h-12 w-12 rounded-full border-4 border-[#d9deea] border-t-cyan-600" />
              <h3 className="mt-6 text-2xl font-black">{tx.analyzing}</h3>
              <p className="mt-2 text-[#4b556b]">{tx.analyzingDesc}</p>
            </div>
          </motion.div>
        )}

        {currentPage === 'polar_wait' && (
          <motion.div key="polar-wait" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="mt-16 max-w-2xl mx-auto">
            <div className="rounded-3xl border border-[#d9deea] bg-white p-10 text-center space-y-4">
              <h3 className="text-2xl font-black">{tx.pendingTitle}</h3>
              <p className="text-[#4b556b]">{tx.pendingDesc}</p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => {
                    const pendingUrl = sessionStorage.getItem(PENDING_CHECKOUT_URL_KEY);
                    if (!pendingUrl) {
                      setMessage(tx.waitingCheckoutLinkMissing);
                      goPage('input');
                      return;
                    }
                    window.location.href = pendingUrl;
                  }}
                  className="px-4 py-2 bg-[#1a2138] text-white rounded"
                >
                  {tx.goPayment}
                </button>
                <button onClick={() => goPage('input')} className="px-4 py-2 border rounded">
                  {tx.goInput}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === 'result' && (
          <motion.div key="result" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="mt-6 space-y-4">
            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-emerald-600 text-white rounded inline-flex items-center gap-2"
              >
                <Download size={16} /> {tx.downloadCsv}
              </button>
              <button
                onClick={() => {
                  setStep('input');
                  goPage('input');
                  setTeams([]);
                  setAssignmentReport(null);
                  sessionStorage.removeItem(reportCacheKey);
                }}
                className="px-4 py-2 border rounded"
              >
                {tx.rerunAssign}
              </button>
            </div>
            {assignmentReport && (
              <div className="bg-white border rounded-2xl p-4 space-y-3">
                <h3 className="font-black">{tx.fullReport}</h3>
                <p className="text-sm text-[#344054]">{assignmentReport.summary}</p>
                {assignmentReport.meta && (
                  <p className="text-[11px] text-[#667085]">
                    {tx.reportMetaPrefix}: {assignmentReport.meta.constraintSource || '-'} / {isEn ? 'parsed constraints' : '해석된 제약'} {assignmentReport.meta.parsedConstraintCount || 0}{isEn ? '' : '건'} / {isEn ? 'unsupported' : '미지원'} {assignmentReport.meta.unsupportedConstraintCount || 0}{isEn ? '' : '건'}
                  </p>
                )}
                {(assignmentReport.conflicts || []).length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-1">
                    <p className="text-xs font-bold text-rose-700">{tx.reportConflicts}</p>
                    {(assignmentReport.conflicts || []).map((w, idx) => (
                      <p key={`conflict-${idx}`} className="text-xs text-rose-700">- {w}</p>
                    ))}
                  </div>
                )}
                {(assignmentReport.ambiguities || []).length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
                    <p className="text-xs font-bold text-amber-800">{tx.reportAmbiguities}</p>
                    {(assignmentReport.ambiguities || []).map((w, idx) => (
                      <p key={`ambiguity-${idx}`} className="text-xs text-amber-800">- {w}</p>
                    ))}
                  </div>
                )}
                {assignmentReport.actionHint && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    {assignmentReport.actionHint}
                  </div>
                )}
                {(assignmentReport.warnings || []).length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-1">
                    <p className="text-xs font-bold text-rose-700">{tx.reportWarnings}</p>
                    {(assignmentReport.warnings || []).map((w, idx) => (
                      <p key={`warning-${idx}`} className="text-xs text-rose-700">- {w}</p>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {(assignmentReport.checklist || []).map((item, i) => (
                    <div key={`${item.item || 'item'}-${i}`} className="rounded-xl border border-[#d9deea] bg-[#f7f9fc] p-3">
                      <p className="text-xs text-[#667085]">{item.item || tx.checklistItem}</p>
                      <p className="text-sm font-bold mt-1">{item.status || '-'}</p>
                      <p className="text-xs text-[#4b556b] mt-1">{item.requested ? tx.requested : tx.notRequested}</p>
                    </div>
                  ))}
                </div>
                {(assignmentReport.constraints || []).length > 0 && (
                  <div className="rounded-xl border border-[#d9deea] p-3 space-y-1">
                    <p className="text-xs font-bold text-[#344054]">{tx.constraintDetail}</p>
                    {(assignmentReport.constraints || []).map((c, idx) => (
                      <p key={`constraint-${idx}`} className="text-xs text-[#4b556b]">
                        - {c.type}: {c.status} {c.detail ? ` / ${c.detail}` : ''}
                      </p>
                    ))}
                  </div>
                )}
                {(assignmentReport.decisionLog || []).length > 0 && (
                  <div className="rounded-xl border border-[#d9deea] p-3 space-y-1">
                    <p className="text-xs font-bold text-[#344054]">{tx.decisionLog}</p>
                    {(assignmentReport.decisionLog || []).map((line, idx) => (
                      <p key={`decision-${idx}`} className="text-xs text-[#4b556b]">- {line}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((t) => {
                const teamReport = teamReportMap.get(Number(t.id) || t.id);
                const evidence = Array.isArray(teamReport?.evidence) ? teamReport.evidence : [];
                return (
                  <div key={t.id} className="bg-white border rounded-2xl p-4 space-y-3">
                    <h3 className="font-black mb-2">Team {t.id}</h3>
                    {t.members.map((m, i) => (
                      <div key={i} className="text-sm border rounded p-2 mb-2">
                        <div className="font-bold">{m.name || m.id || '-'}</div>
                      </div>
                    ))}
                    <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3">
                      <p className="text-xs text-cyan-800 font-bold">{tx.teamReason}</p>
                      <p className="text-xs text-[#344054] mt-1">{teamReport?.reason || t.analysis}</p>
                      {evidence.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {evidence.map((line, idx) => (
                            <p key={`${t.id}-evidence-${idx}`} className="text-[11px] text-[#4b556b]">- {line}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        <footer className="mt-10 pt-6 border-t text-center text-sm text-[#667085]">
          <button onClick={() => goPolicy('terms', uiLang)} className="mx-2">{uiLang === 'en' ? 'Terms' : '이용약관'}</button>
          <button onClick={() => goPolicy('privacy', uiLang)} className="mx-2">{uiLang === 'en' ? 'Privacy' : '개인정보처리방침'}</button>
          <button onClick={() => goPolicy('refund', uiLang)} className="mx-2">{uiLang === 'en' ? 'Refund' : '환불정책'}</button>
        </footer>
      </div>
    </div>
  );
}

export default App;










