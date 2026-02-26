import React, { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { AnimatePresence, motion } from 'framer-motion';
import { toBlob } from 'html-to-image';
import { Users, Upload, Download, Search, Settings2, Database, ArrowRight, Sparkles, Trash2, Share2, ImageDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TermsOfService, RefundPolicy, PrivacyPolicy } from './LegalPages';
import { supabase } from './lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PENDING_ASSIGN_KEY = 'teambuilder_pending_assign_v1';
const REPORT_CACHE_KEY = 'teambuilder_report_cache_v1';
const PENDING_CHECKOUT_URL_KEY = 'teambuilder_pending_checkout_url_v1';
const PENDING_CHECKOUT_ID_KEY = 'teambuilder_pending_checkout_id_v1';
const safeGetSession = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
const safeSetSession = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // noop
  }
};
const safeRemoveSession = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // noop
  }
};
const safeSessionKeys = () => {
  try {
    return Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i)).filter(Boolean);
  } catch {
    return [];
  }
};
const safeGetLocal = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const safeSetLocal = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // noop
  }
};
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

const normalizeRoutePath = (pathname) => {
  const withoutEnPrefix = pathname.startsWith('/en/') ? pathname.slice(3) : pathname;
  if (withoutEnPrefix.length > 1) return withoutEnPrefix.replace(/\/+$/, '');
  return withoutEnPrefix;
};

const resolvePageByPathname = (pathname) => {
  const normalizedPath = normalizeRoutePath(pathname);
  const normalizedLogin = normalizeRoutePath(APP_ROUTES.login);
  const normalizedInput = normalizeRoutePath(APP_ROUTES.input);
  const normalizedPolar = normalizeRoutePath(APP_ROUTES.polar);
  const normalizedReport = normalizeRoutePath(APP_ROUTES.report);
  const normalizedTerms = normalizeRoutePath(APP_ROUTES.terms);
  const normalizedPrivacy = normalizeRoutePath(APP_ROUTES.privacy);
  const normalizedRefund = normalizeRoutePath(APP_ROUTES.refund);

  if (normalizedPath === normalizedLogin) return 'login';
  if (normalizedPath === normalizedInput) return 'input';
  if (normalizedPath === normalizedPolar) return 'polar';
  if (normalizedPath === normalizedReport) return 'report';
  if (normalizedPath === normalizedTerms) return 'terms';
  if (normalizedPath === normalizedPrivacy) return 'privacy';
  if (normalizedPath === normalizedRefund) return 'refund';
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
  const badPattern = countMatches(text, /[AAÐØ]/g);
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
        features,
        enabled: true
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
        enabled: true,
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
    return safeGetLocal('teambuilder_ui_lang') || initialLang;
  });
  const tr = (ko, en) => (uiLang === 'en' ? en : ko);

  const goPage = (page, options = {}) => {
    const targetPath = APP_ROUTES[page] || APP_ROUTES.landing;
    if (normalizeRoutePath(window.location.pathname) === normalizeRoutePath(targetPath)) return;
    navigate(targetPath, options);
  };
  const goPolicy = (policyPage, lang = uiLang, options = {}) => {
    const basePath = APP_ROUTES[policyPage] || APP_ROUTES.terms;
    const targetPath = lang === 'en' ? `/en${basePath}` : basePath;
    if (normalizeRoutePath(window.location.pathname) === normalizeRoutePath(targetPath)) return;
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
  const [config, setConfig] = useState({ teamSize: 0, remainderPolicy: 'spread' });
  const [teams, setTeams] = useState([]);
  const [assignmentReport, setAssignmentReport] = useState(null);
  const [reportCacheHydrated, setReportCacheHydrated] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customPromptEnabled, setCustomPromptEnabled] = useState(false);
  const [teamSizeInput, setTeamSizeInput] = useState('');

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
  const [importPanelOpen, setImportPanelOpen] = useState(false);
  const runAssignLockRef = useRef(false);
  const checkoutResumeLockRef = useRef(false);
  const tableInputRefs = useRef(new Map());
  const historyRef = useRef({ past: [], future: [] });
  const isApplyingHistoryRef = useRef(false);
  const [, setHistoryTick] = useState(0);
  const [editingColumnKey, setEditingColumnKey] = useState('');
  const [editingColumnName, setEditingColumnName] = useState('');
  const [expandedMemberKeys, setExpandedMemberKeys] = useState({});
  const [resultActionLoading, setResultActionLoading] = useState(false);
  const resultCaptureRef = useRef(null);
  const bypassReportRedirectRef = useRef(false);
  const [reportCollapsed, setReportCollapsed] = useState(false);

  const maxInitialRows = 10;
  const historyLimit = 60;

  const cloneSnapshot = (snapshot) => {
    try {
      return structuredClone(snapshot);
    } catch {
      return JSON.parse(JSON.stringify(snapshot));
    }
  };

  const buildDataSnapshot = () => ({
    participants,
    availableIdentifierKeys,
    columnOrder,
    excludedFeatureKeys
  });

  const applyDataSnapshot = (snapshot) => {
    if (!snapshot) return;
    isApplyingHistoryRef.current = true;
    setParticipants(snapshot.participants || []);
    setAvailableIdentifierKeys(snapshot.availableIdentifierKeys || []);
    setColumnOrder(snapshot.columnOrder || []);
    setExcludedFeatureKeys(snapshot.excludedFeatureKeys || []);
    queueMicrotask(() => {
      isApplyingHistoryRef.current = false;
    });
  };

  const recordHistorySnapshot = () => {
    if (isApplyingHistoryRef.current) return;
    const current = cloneSnapshot(buildDataSnapshot());
    historyRef.current.past.push(current);
    if (historyRef.current.past.length > historyLimit) {
      historyRef.current.past.shift();
    }
    historyRef.current.future = [];
    setHistoryTick((v) => v + 1);
  };

  const undoDataChange = () => {
    if (historyRef.current.past.length === 0) return;
    const previous = historyRef.current.past.pop();
    historyRef.current.future.push(cloneSnapshot(buildDataSnapshot()));
    applyDataSnapshot(previous);
    setHistoryTick((v) => v + 1);
  };

  const redoDataChange = () => {
    if (historyRef.current.future.length === 0) return;
    const next = historyRef.current.future.pop();
    historyRef.current.past.push(cloneSnapshot(buildDataSnapshot()));
    applyDataSnapshot(next);
    setHistoryTick((v) => v + 1);
  };

  const clearAllReportCaches = () => {
    const keysToRemove = safeSessionKeys().filter((k) => k.startsWith(REPORT_CACHE_KEY));
    keysToRemove.forEach((k) => safeRemoveSession(k));
  };

  useEffect(() => {
    try {
      const raw = safeGetSession(reportCacheKey);
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
      safeRemoveSession(reportCacheKey);
    } finally {
      setReportCacheHydrated(true);
    }
  }, [reportCacheKey]);

  useEffect(() => {
    if (!reportCacheHydrated) return;
    if (!Array.isArray(teams) || teams.length === 0) {
      safeRemoveSession(reportCacheKey);
      return;
    }
    safeSetSession(
      reportCacheKey,
      JSON.stringify({
        teams,
        report: assignmentReport || null,
        updatedAt: Date.now()
      })
    );
  }, [teams, assignmentReport, reportCacheHydrated, reportCacheKey]);

  useEffect(() => {
    safeSetLocal('teambuilder_ui_lang', uiLang);
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
  }, [routeLang, routePage, queryLang]);

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
      if (!s?.user) goPage('landing', { replace: true });
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (routePage !== 'login') return;
    if (!user) return;
    goPage('input', { replace: true });
  }, [routePage, user]);

  useEffect(() => {
    if (routePage !== 'report') return;
    if (bypassReportRedirectRef.current) return;
    if (!reportCacheHydrated) return;
    if (Array.isArray(teams) && teams.length > 0) return;
    setMessage(tr('결과 데이터가 없습니다. 입력 화면에서 먼저 팀 배정을 실행해 주세요.', 'No report data found. Run team assignment from input page first.'));
    goPage('input', { replace: true });
  }, [routePage, teams, reportCacheHydrated]);

  useEffect(() => {
    if (routePage !== 'report') {
      bypassReportRedirectRef.current = false;
    }
  }, [routePage]);

  useEffect(() => {
    if (routePage !== 'polar') return;
    const params = new URLSearchParams(location.search);
    const hasCheckoutReturn = Boolean(params.get('checkout_id') && params.get('checkout_success') === 'true');
    if (hasCheckoutReturn) return;
    const hasPendingAssign = Boolean(safeGetSession(PENDING_ASSIGN_KEY));
    if (paymentLoading || hasPendingAssign) return;
    setMessage(tr('유효한 결제 대기 정보가 없어 입력 화면으로 이동합니다.', 'No valid pending checkout info. Redirecting to input page.'));
    goPage('input', { replace: true });
  }, [routePage, paymentLoading, location.search]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const isEditable =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (!isEditable) return;
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;

      const key = String(event.key || '').toLowerCase();
      if (key === 'z' && event.shiftKey) {
        event.preventDefault();
        redoDataChange();
        return;
      }
      if (key === 'z') {
        event.preventDefault();
        undoDataChange();
        return;
      }
      if (key === 'y') {
        event.preventDefault();
        redoDataChange();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undoDataChange, redoDataChange]);

  const clearPendingCheckoutState = () => {
    safeRemoveSession(PENDING_ASSIGN_KEY);
    safeRemoveSession(PENDING_CHECKOUT_URL_KEY);
    safeRemoveSession(PENDING_CHECKOUT_ID_KEY);
  };

  const runPaidAssignment = async ({ checkoutId, cleanReturnQuery = false, redirectOnMissingPayload = false }) => {
    if (!checkoutId || checkoutResumeLockRef.current) return;

    checkoutResumeLockRef.current = true;
    setStep('loading');
    setPaymentLoading(true);
    setMessage(tr('결제 확인 중...', 'Verifying checkout...'));

    try {
      const verifyRes = await fetch(`/api/checkout?checkout_id=${encodeURIComponent(checkoutId)}`);
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData?.paid) {
        throw new Error(verifyData?.error || tr('결제가 아직 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.', 'Payment is not completed yet. Please try again shortly.'));
      }

      const raw = safeGetSession(PENDING_ASSIGN_KEY);
      if (!raw) {
        throw new Error(tr('결제는 확인됐지만 분석 요청 데이터가 없습니다. 다시 실행해 주세요.', 'Payment was verified but assignment payload is missing. Please run again.'));
      }
      const pending = JSON.parse(raw);
      if (!pending?.payload) {
        throw new Error(tr('분석 요청 데이터가 손상되었습니다. 다시 실행해 주세요.', 'Assignment payload is corrupted. Please run again.'));
      }

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

      clearPendingCheckoutState();
      setTeams(data.teams);
      setAssignmentReport(data.report || null);
      setMessage(tr('결제 완료 확인 후 팀 배정이 완료되었습니다.', 'Checkout verified and team assignment completed.'));
      setStep('result');
      goPage('report', { replace: true });
    } catch (error) {
      const errorMessage =
        error?.message ||
        tr('결제 확인/팀 배정 중 오류가 발생했습니다.', 'Error occurred while verifying checkout and assigning teams.');
      setMessage(errorMessage);
      if (redirectOnMissingPayload && /요청 데이터|payload|손상/.test(errorMessage)) {
        setStep('input');
        goPage('input', { replace: true });
      } else {
        setStep('input');
        goPage('polar', { replace: true });
      }
    } finally {
      if (cleanReturnQuery) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('checkout_id');
        cleanUrl.searchParams.delete('checkout_success');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
      checkoutResumeLockRef.current = false;
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    if (routePage !== 'polar') return;
    const params = new URLSearchParams(location.search);
    const checkoutId = params.get('checkout_id');
    const checkoutSuccess = params.get('checkout_success');
    if (!checkoutId || checkoutSuccess !== 'true') return;
    runPaidAssignment({
      checkoutId,
      cleanReturnQuery: true,
      redirectOnMissingPayload: true
    });
  }, [routePage, location.search]);

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

  const toUserFacingError = (error, fallbackKo, fallbackEn) => {
    const raw = String(error?.message || error || '').trim();
    if (!raw) return tr(fallbackKo, fallbackEn);
    const isAuthIssue = /(401|403|unauthorized|forbidden|token|oauth|permission|scope)/i.test(raw);
    if (isAuthIssue) {
      return tr(
        '권한 또는 세션이 만료되었습니다. 다시 로그인 후 시도해 주세요.',
        'Your permission/session has expired. Please sign in again and retry.'
      );
    }
    return raw;
  };

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
    if (error) setMessage(toUserFacingError(error, '로그인 중 오류가 발생했습니다.', 'An error occurred during sign-in.'));
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(tr(`로그아웃 실패: ${error.message}`, `Sign-out failed: ${error.message}`));
    if (!error) {
      clearAllReportCaches();
      safeRemoveSession(PENDING_CHECKOUT_URL_KEY);
      goPage('landing');
    }
  };

  const openSheets = async () => {
    try {
      const getGoogleAccessToken = async () => {
        if (session?.provider_token) return session.provider_token;
        const { data, error } = await supabase.auth.refreshSession();
        if (error) throw error;
        const refreshed = data?.session?.provider_token;
        if (!refreshed) {
          throw new Error(tr('Google 권한 토큰이 없습니다. 재로그인하세요.', 'Google permission token missing. Please sign in again.'));
        }
        return refreshed;
      };

      const accessToken = await getGoogleAccessToken();
      setSheetListLoading(true);
      setMessage('');

      const q = encodeURIComponent("mimeType='application/vnd.google-apps.form' and trashed=false");
      const fields = encodeURIComponent('files(id,name,modifiedTime)');
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?pageSize=50&orderBy=modifiedTime desc&q=${q}&fields=${fields}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!res.ok) throw new Error(tr('구글폼 목록 조회 실패', 'Failed to fetch Google Form list'));

      const data = await res.json();
      setDriveForms(Array.isArray(data?.files) ? data.files : []);
      setSheetListOpen(true);
    } catch (e) {
      setMessage(toUserFacingError(e, '구글폼 목록 조회 중 오류가 발생했습니다.', 'An error occurred while loading Google Form list.'));
    } finally {
      setSheetListLoading(false);
    }
  };

  const importSheet = async (urlOrId) => {
    try {
      const getGoogleAccessToken = async () => {
        if (session?.provider_token) return session.provider_token;
        const { data, error } = await supabase.auth.refreshSession();
        if (error) throw error;
        const refreshed = data?.session?.provider_token;
        if (!refreshed) {
          throw new Error(tr('Google 권한 토큰이 없습니다. 재로그인하세요.', 'Google permission token missing. Please sign in again.'));
        }
        return refreshed;
      };

      const accessToken = await getGoogleAccessToken();
      const formId = parseFormId(urlOrId ?? formUrl);
      if (!formId) throw new Error(tr('유효한 Google Form URL 또는 ID를 입력하세요.', 'Enter a valid Google Form URL or Form ID.'));

      setSheetImportLoading(true);
      setMessage('');

      const formRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!formRes.ok) throw new Error(tr('구글폼 메타데이터 조회 실패', 'Failed to fetch Google Form metadata'));
      const formData = await formRes.json();

      const allResponses = [];
      let pageToken = '';
      for (;;) {
        const pageQuery = new URLSearchParams({ pageSize: '500' });
        if (pageToken) pageQuery.set('pageToken', pageToken);
        const respRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses?${pageQuery.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!respRes.ok) throw new Error(tr('구글폼 응답 조회 실패', 'Failed to fetch Google Form responses'));
        const page = await respRes.json();
        if (Array.isArray(page?.responses)) allResponses.push(...page.responses);
        if (!page?.nextPageToken) break;
        pageToken = page.nextPageToken;
      }
      const responses = { responses: allResponses };

      const { participants: imported, mapped, skipped } = mapFormResponsesToParticipants(formData, responses);
      if (!imported.length) throw new Error(tr('가져올 참가자 데이터가 없습니다.', 'No participant data to import.'));

      recordHistorySnapshot();
      const featureKeys = Array.from(
        new Set(imported.flatMap((p) => Object.keys(p.features || {})).filter(Boolean))
      );
      setAvailableIdentifierKeys((prev) => Array.from(new Set([...prev, ...featureKeys])));
      if (!selectedIdentifierKey && featureKeys.length > 0) setSelectedIdentifierKey(featureKeys[0]);
      setShowAllParticipants(false);

      setParticipants((prev) => [...prev.filter((p) => p.name || Object.keys(p.features || {}).length > 0), ...imported]);

      setMessage(tr(`구글폼 불러오기 완료: ${mapped}명 반영, ${skipped}명 스킵`, `Google Form import completed: ${mapped} mapped, ${skipped} skipped`));
    } catch (e) {
      setMessage(toUserFacingError(e, '구글폼 데이터 불러오기 중 오류가 발생했습니다.', 'An error occurred while importing Google Form data.'));
    } finally {
      setSheetImportLoading(false);
    }
  };

  const mergeImportedParticipants = (imported) => {
    recordHistorySnapshot();
    const featureKeys = Array.from(
      new Set(imported.flatMap((p) => Object.keys(p.features || {})).filter(Boolean))
    );
    setAvailableIdentifierKeys((prev) => Array.from(new Set([...prev, ...featureKeys])));
    if (!selectedIdentifierKey && featureKeys.length > 0) setSelectedIdentifierKey(featureKeys[0]);
    setShowAllParticipants(false);

    setParticipants((prev) => [...prev.filter((p) => p.name || Object.keys(p.features || {}).length > 0), ...imported]);
  };

  const pinColumnAsIdentifier = (key) => {
    if (!key) return;
    if (selectedIdentifierKey === key) return;
    setSelectedIdentifierKey(key);
    setMessage(tr(`기준 열 지정: ${key}`, `Primary column set: ${key}`));
  };

  const removeFeatureColumn = (key) => {
    if (!key) return;
    recordHistorySnapshot();
    setAvailableIdentifierKeys((prev) => prev.filter((k) => k !== key));
    setColumnOrder((prev) => prev.filter((k) => k !== key));
    setExcludedFeatureKeys((prev) => prev.filter((k) => k !== key));
    setParticipants((prev) =>
      prev.map((p) => {
        const nextFeatures = { ...(p.features || {}) };
        delete nextFeatures[key];
        return { ...p, features: nextFeatures };
      })
    );
    if (selectedIdentifierKey === key) {
      const nextKey = columnOrder.find((col) => col !== key) || '';
      setSelectedIdentifierKey(nextKey);
    }
    setMessage(tr(`열 삭제 완료: ${key}`, `Column deleted: ${key}`));
  };

  const hasDuplicateColumnName = (nextName, exceptKey = '') => {
    const target = String(nextName || '').trim().toLowerCase();
    if (!target) return false;
    return availableIdentifierKeys.some((k) => k !== exceptKey && String(k || '').trim().toLowerCase() === target);
  };

  const addFeatureColumn = () => {
    const base = tr('새 열', 'New column');
    let seq = columnOrder.length + 1;
    let key = `${base} ${seq}`;
    while (hasDuplicateColumnName(key)) {
      seq += 1;
      key = `${base} ${seq}`;
    }
    if (hasDuplicateColumnName(key)) return setMessage(tr('이미 존재하는 특성명입니다.', 'Column already exists.'));

    recordHistorySnapshot();
    setAvailableIdentifierKeys((prev) => [...prev, key]);
    setColumnOrder((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setParticipants((prev) =>
      prev.map((p) => ({
        ...p,
        features: { ...(p.features || {}), [key]: String(p?.features?.[key] ?? '') }
      }))
    );
    setMessage(tr(`열 추가 완료: ${key}`, `Column added: ${key}`));
  };

  const startRenameFeatureColumn = (key) => {
    setEditingColumnKey(key);
    setEditingColumnName(key);
  };

  const cancelRenameFeatureColumn = () => {
    setEditingColumnKey('');
    setEditingColumnName('');
  };

  const submitRenameFeatureColumn = (oldKey) => {
    const nextKey = String(editingColumnName || '').trim();
    if (!oldKey) return cancelRenameFeatureColumn();
    if (!nextKey) return setMessage(tr('새 열 이름을 입력하세요.', 'Enter a new column name.'));
    if (nextKey === oldKey) return cancelRenameFeatureColumn();
    if (hasDuplicateColumnName(nextKey, oldKey)) return setMessage(tr('이미 존재하는 특성명입니다.', 'Column already exists.'));

    recordHistorySnapshot();
    setAvailableIdentifierKeys((prev) => prev.map((k) => (k === oldKey ? nextKey : k)));
    setColumnOrder((prev) => prev.map((k) => (k === oldKey ? nextKey : k)));
    setExcludedFeatureKeys((prev) => prev.map((k) => (k === oldKey ? nextKey : k)));
    setParticipants((prev) =>
      prev.map((p) => {
        const base = { ...(p.features || {}) };
        if (!(oldKey in base) && !(nextKey in base)) return p;
        const value = String(base[oldKey] ?? base[nextKey] ?? '');
        delete base[oldKey];
        base[nextKey] = value;
        return { ...p, features: base };
      })
    );
    if (selectedIdentifierKey === oldKey) setSelectedIdentifierKey(nextKey);
    cancelRenameFeatureColumn();
    setMessage(tr(`열 이름 변경: ${oldKey} -> ${nextKey}`, `Column renamed: ${oldKey} -> ${nextKey}`));
  };

  const updateParticipantFeature = (participant, key, value) => {
    const rowKey = participant.internalId || participant.id;
    recordHistorySnapshot();
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

  const removeParticipantRow = (participant) => {
    recordHistorySnapshot();
    const rowKey = participant.internalId || participant.id;
    setParticipants((prev) => prev.filter((p) => (p.internalId || p.id) !== rowKey));
  };

  const handleTablePaste = (event, startRowIndex, startColumnKey) => {
    const rawText = event.clipboardData?.getData('text/plain') || '';
    if (!rawText || (!rawText.includes('\t') && !rawText.includes('\n'))) return;
    if (!selectedIdentifierKey) return;

    event.preventDefault();
    const rows = rawText
      .replace(/\r/g, '')
      .split('\n')
      .filter((line, index, list) => !(index === list.length - 1 && line === ''))
      .map((line) => line.split('\t'));
    if (rows.length === 0) return;

    const columnKeys = [selectedIdentifierKey, ...tableFeatureKeys];
    const startColIndex = columnKeys.indexOf(startColumnKey);
    if (startColIndex < 0) return;

    recordHistorySnapshot();
    const visibleKeys = shownParticipants.map((p) => p.internalId || p.id);
    const fallbackColumns = columnOrder.length > 0 ? columnOrder : [selectedIdentifierKey];

    setParticipants((prev) => {
      const next = prev.map((p) => ({ ...p, features: { ...(p.features || {}) } }));
      const keyToIndex = new Map(next.map((p, idx) => [p.internalId || p.id, idx]));
      const workingVisibleKeys = [...visibleKeys];

      const ensureRowKeyByVisibleIndex = (visibleIndex) => {
        while (visibleIndex >= workingVisibleKeys.length) {
          const features = Object.fromEntries(fallbackColumns.map((k) => [k, '']));
          const created = {
            id: Date.now() + workingVisibleKeys.length,
            internalId: createInternalId(),
            name: tr('새 참여자', 'New participant'),
            originalName: tr('새 참여자', 'New participant'),
            intro: '',
            source: 'manual',
            enabled: true,
            features
          };
          next.push(created);
          const key = created.internalId || created.id;
          keyToIndex.set(key, next.length - 1);
          workingVisibleKeys.push(key);
        }
        return workingVisibleKeys[visibleIndex];
      };

      rows.forEach((cells, rowOffset) => {
        const rowKey = ensureRowKeyByVisibleIndex(startRowIndex + rowOffset);
        const targetIndex = keyToIndex.get(rowKey);
        if (targetIndex === undefined) return;

        cells.forEach((cell, colOffset) => {
          const columnKey = columnKeys[startColIndex + colOffset];
          if (!columnKey) return;
          next[targetIndex].features[columnKey] = String(cell ?? '');
        });
      });

      return next;
    });
    setShowAllParticipants(true);
    setMessage(tr('대량 붙여넣기를 적용했습니다.', 'Bulk paste applied.'));
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
      setMessage(toUserFacingError(error, '파일 업로드 처리 중 오류가 발생했습니다.', 'Error occurred while handling file upload.'));
    } finally {
      e.target.value = '';
    }
  };

  const hasParticipantData = (participant) =>
    Boolean(participant?.name || Object.keys(participant?.features || {}).length > 0);

  const tableParticipants = useMemo(
    () => participants.filter(hasParticipantData),
    [participants]
  );

  const validParticipants = useMemo(
    () => tableParticipants.filter((p) => p?.enabled !== false),
    [tableParticipants]
  );

  const filteredParticipants = useMemo(() => {
    const q = participantQuery.trim().toLowerCase();
    if (!q) return tableParticipants;
    return tableParticipants.filter((p) => {
      const idValue = String(selectedIdentifierKey ? p?.features?.[selectedIdentifierKey] || '' : '').toLowerCase();
      const featureText = Object.values(p.features || {}).join(' ').toLowerCase();
      return idValue.includes(q) || featureText.includes(q);
    });
  }, [participantQuery, tableParticipants, selectedIdentifierKey]);

  const toggleParticipantEnabled = (participant, checked) => {
    const rowKey = participant.internalId || participant.id;
    recordHistorySnapshot();
    setParticipants((prev) =>
      prev.map((p) => {
        const currentKey = p.internalId || p.id;
        if (currentKey !== rowKey) return p;
        return { ...p, enabled: Boolean(checked) };
      })
    );
  };

  const [excludedFeatureKeys, setExcludedFeatureKeys] = useState([]);

  const applyFeatureExclusion = (features) => {
    const base = features || {};
    const blocked = new Set(excludedFeatureKeys);
    return Object.fromEntries(Object.entries(base).filter(([k]) => !blocked.has(k)));
  };

  const toggleExcludedFeature = (key) => {
    recordHistorySnapshot();
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
      .filter((k) => k !== selectedIdentifierKey)
      .filter((k) => !excludedFeatureKeys.includes(k));
    return candidates;
  }, [columnOrder, excludedFeatureKeys, selectedIdentifierKey]);

  const shownParticipants = filteredParticipants;
  const compactTableMaxHeight = 10 * 44 + 52;

  const buildTableInputRefKey = (participant, columnKey) =>
    `${participant?.internalId || participant?.id || ''}::${String(columnKey || '')}`;

  const focusNextRowInput = (rowIndex, columnKey) => {
    const nextParticipant = shownParticipants[rowIndex + 1];
    if (!nextParticipant) return;
    const key = buildTableInputRefKey(nextParticipant, columnKey);
    const nextInput = tableInputRefs.current.get(key);
    if (nextInput && typeof nextInput.focus === 'function') {
      nextInput.focus();
      if (typeof nextInput.select === 'function') nextInput.select();
    }
  };

  const handleTableInputKeyDown = (event, rowIndex, columnKey) => {
    if (event.key !== 'Enter') return;
    if (event.nativeEvent?.isComposing) return;
    event.preventDefault();
    focusNextRowInput(rowIndex, columnKey);
  };

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

  const renderEditableHeader = (columnKey, fallbackLabel) => {
    if (!columnKey) {
      return <span className="inline-block max-w-40 truncate">{fallbackLabel}</span>;
    }

    if (editingColumnKey === columnKey) {
      return (
        <span className="inline-flex items-center gap-1">
          <Input
            value={editingColumnName}
            onChange={(e) => setEditingColumnName(e.target.value)}
            onBlur={() => submitRenameFeatureColumn(columnKey)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRenameFeatureColumn(columnKey);
              if (e.key === 'Escape') cancelRenameFeatureColumn();
            }}
            className="h-7 w-32 border-[#cfd5e3] bg-white text-xs"
            autoFocus
          />
        </span>
      );
    }

    return (
      <span className="inline-flex max-w-44 items-center gap-1.5">
        <button
          type="button"
          onDoubleClick={() => startRenameFeatureColumn(columnKey)}
          className="inline-block max-w-28 truncate text-left hover:text-[#1d4ed8]"
          title={columnKey}
        >
          {columnKey}
        </button>
        <button
          type="button"
          onClick={() => removeFeatureColumn(columnKey)}
          className="inline-flex items-center text-rose-600 hover:text-rose-700"
          title={tx.deleteColumn}
          aria-label={tx.deleteColumn}
        >
          <Trash2 size={12} />
        </button>
      </span>
    );
  };

  const runAssign = async () => {
    if (runAssignLockRef.current) return;
    if (!Number.isFinite(Number(config.teamSize)) || Number(config.teamSize) < 1) {
      return setMessage(tr('1팀당 인원을 1 이상 입력해 주세요.', 'Please set members per team to at least 1.'));
    }
    if (validParticipants.length < 2) {
      return setMessage(tr('최소 2명 이상 입력해 주세요.', 'Please provide at least 2 participants.'));
    }
    if (!selectedIdentifierKey) {
      return setMessage(tr('기준 열이 필요합니다. 열을 추가해 주세요.', 'Primary column is required. Please add a column.'));
    }

    const missingIdentifier = validParticipants.filter((p) => !getParticipantIdentifier(p));
    if (missingIdentifier.length > 0) {
      return setMessage(tr(`기준 열 값이 비어 있는 참가자가 ${missingIdentifier.length}명 있습니다.`, `${missingIdentifier.length} participants have empty primary-column values.`));
    }
    if (excludedFeatureKeys.includes(selectedIdentifierKey)) {
      return setMessage(tr('기준 열은 제외할 수 없습니다.', 'Primary column cannot be excluded.'));
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

    if (customPromptEnabled && !normalizedCustomPrompt) {
      return setMessage(tr('맞춤 프롬프트를 입력해 주세요.', 'Please enter a custom prompt.'));
    }

    const assignPayload = {
      participants: payloadParticipants,
      config: {
        teamSize: Number(config.teamSize) || 0,
        remainderPolicy
      },
      customPrompt: customPromptEnabled ? normalizedCustomPrompt : ''
    };

    runAssignLockRef.current = true;
    setStep('loading');
    setPaymentLoading(true);
    try {
      if (!customPromptEnabled) {
        const res = await fetch('/api/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...assignPayload,
            checkout_id: ''
          })
        });
        const data = await res.json();
        if (!data?.teams) throw new Error(data?.error || tr('배정 실패', 'Assignment failed'));
        setTeams(data.teams);
        setAssignmentReport(data.report || null);
        setMessage(tr('무료 랜덤 배정이 완료되었습니다.', 'Free random assignment completed.'));
        setStep('result');
        goPage('report', { replace: true });
        return;
      }

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

      safeSetSession(
        PENDING_ASSIGN_KEY,
        JSON.stringify({
          payload: assignPayload,
          createdAt: Date.now()
        })
      );
      safeSetSession(PENDING_CHECKOUT_ID_KEY, String(checkoutData.checkout_id || ''));
      safeSetSession(PENDING_CHECKOUT_URL_KEY, checkoutData.url);

      window.location.href = checkoutData.url;
    } catch (error) {
      setMessage(toUserFacingError(error, '결제 연결 중 오류가 발생했습니다.', 'Error occurred while opening checkout.'));
      setStep('input');
      goPage('input');
    } finally {
      runAssignLockRef.current = false;
      setPaymentLoading(false);
    }
  };

  const exportCSV = () => {
    const preferredFeatureColumns = (columnOrder || []).filter((key) => key && key !== selectedIdentifierKey);
    const discoveredFeatureColumns = [];
    teams.forEach((team) => {
      (team?.members || []).forEach((member) => {
        Object.keys(member?.features || {}).forEach((key) => {
          if (!key || key === selectedIdentifierKey) return;
          if (!preferredFeatureColumns.includes(key) && !discoveredFeatureColumns.includes(key)) {
            discoveredFeatureColumns.push(key);
          }
        });
      });
    });

    const featureColumns = [...preferredFeatureColumns, ...discoveredFeatureColumns];
    const fields = ['Team', ...featureColumns];
    const rows = [];

    teams.forEach((team) => {
      (team?.members || []).forEach((member) => {
        const featureMap = member?.features || {};
        const row = {
          Team: team.id
        };
        featureColumns.forEach((key) => {
          row[key] = String(featureMap?.[key] || '');
        });
        rows.push(row);
      });
    });

    const csv = `\uFEFF${Papa.unparse({ fields, data: rows })}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TeamBuilder_Result.csv';
    a.click();
  };

  const toggleMemberDetail = (teamId, memberId) => {
    const key = `${teamId}::${memberId}`;
    setExpandedMemberKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const captureResultAsBlob = async () => {
    const node = resultCaptureRef.current;
    if (!node) throw new Error(tr('결과 영역을 찾을 수 없습니다.', 'Result area not found.'));

    const blob = await toBlob(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#f8fafc'
    });

    if (!blob) throw new Error(tr('이미지 변환에 실패했습니다.', 'Failed to convert image.'));
    return blob;
  };

  const saveResultImage = async () => {
    setResultActionLoading(true);
    try {
      const blob = await captureResultAsBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TeamBuilder_Result_${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error?.message || tr('이미지 저장 중 오류가 발생했습니다.', 'Error occurred while saving image.'));
    } finally {
      setResultActionLoading(false);
    }
  };

  const shareResult = async () => {
    setResultActionLoading(true);
    try {
      const shareText = `${tr('팀 배정 결과', 'Team assignment result')}\n${assignmentReport?.summary || ''}`;
      if (navigator.share) {
        try {
          const blob = await captureResultAsBlob();
          const file = new File([blob], 'TeamBuilder_Result.png', { type: 'image/png' });
          await navigator.share({
            title: tr('팀 배정 결과', 'Team assignment result'),
            text: shareText,
            files: [file]
          });
          return;
        } catch {
          await navigator.share({
            title: tr('팀 배정 결과', 'Team assignment result'),
            text: shareText,
            url: window.location.href
          });
          return;
        }
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        setMessage(tr('결과 링크를 클립보드에 복사했습니다.', 'Result link copied to clipboard.'));
      } else {
        throw new Error(tr('공유를 지원하지 않는 브라우저입니다.', 'This browser does not support sharing.'));
      }
    } catch (error) {
      setMessage(error?.message || tr('공유 중 오류가 발생했습니다.', 'Error occurred while sharing result.'));
    } finally {
      setResultActionLoading(false);
    }
  };

  const addEmptyParticipantRow = () => {
    recordHistorySnapshot();
    const baseColumns = columnOrder.length > 0 ? columnOrder : ['이름'];
    if (columnOrder.length === 0) {
      setAvailableIdentifierKeys((prev) => (prev.includes('이름') ? prev : [...prev, '이름']));
      setColumnOrder((prev) => (prev.includes('이름') ? prev : [...prev, '이름']));
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
        enabled: true,
        features
      }
    ]);
  };

  const routeParams = new URLSearchParams(window.location.search);
  const hasCheckoutReturn = Boolean(routeParams.get('checkout_id') && routeParams.get('checkout_success') === 'true');
  const currentPage =
    routePage === 'polar'
      ? 'polar_wait'
      : routePage === 'report'
        ? 'result'
        : routePage;
  const isEn = uiLang === 'en';
  const tx = {
    login: isEn ? 'Sign in' : '로그인',
    logout: isEn ? 'Sign out' : '로그아웃',
    landingBadge: isEn ? 'Team Assignment Assistant' : '팀 편성 어시스턴트',
    landingTitleLine2: isEn ? 'for classes and programs' : '수업·프로그램 팀 편성 자동화',
    landingBody: isEn
      ? 'This service imports participant data and generates balanced teams automatically based on your rules.'
      : '참여자 데이터를 불러와, 네가 정한 조건대로 균형 잡힌 팀을 자동으로 만들어주는 서비스야.',
    start: isEn ? 'Get started' : '시작하기',
    quickFlowTitle: isEn ? 'How it works' : '사용 방법',
    flowStep1: isEn ? 'Import data' : '데이터 불러오기',
    flowStep2: isEn ? 'Set rules' : '규칙 설정',
    flowStep3: isEn ? 'Confirm teams' : '팀 확정',
    flowStep1Desc: isEn ? 'Google Form or CSV' : 'Google Form 또는 CSV',
    flowStep2Desc: isEn ? 'team size and constraints' : '팀 인원과 조건 선택',
    flowStep3Desc: isEn ? 'download and share result' : '결과 확인 후 다운로드',
    connectOAuth: isEn ? 'Google sign in' : '구글로그인',
    googleLogin: isEn ? 'Continue with Google' : 'Google 로그인',
    participants: isEn ? 'Participants' : '현재 참가자',
    primaryColumn: isEn ? 'Primary column' : '기준 열',
    customPrompt: isEn ? 'Custom prompt' : '맞춤 프롬프트',
    customPromptHelp: isEn
      ? 'Write detailed team-building requirements here. The AI uses this prompt to reflect your constraints in the assignment.'
      : '팀 편성 조건을 구체적으로 적는 입력란입니다. 입력한 내용을 AI가 분석해 배정 결과에 반영합니다.',
    customPromptToggle: isEn ? 'Enable (Paid)' : '사용하기(유료)',
    promptChecklistTitle: isEn ? 'Team Building Report' : '팀 빌딩 리포트',
    promptOriginal: isEn ? 'Original prompt' : '사용자 요청 원문',
    promptAppliedDetail: isEn ? 'How reflected' : '반영 상세',
    promptEvidence: isEn ? 'Evidence' : '근거',
    progressStatus: isEn ? 'Ready Status' : '준비 상태',
    ready: isEn ? 'Ready for assignment' : '배정 준비 완료',
    needPrimary: isEn ? 'Primary column required' : '기준 열 확인 필요',
    dataDrivenAnalysis: isEn ? '100% data-driven team analysis' : '100% 데이터 기반 팀 분석',
    teamSettings: isEn ? 'Team settings' : '팀 설정',
    teamSize: isEn ? 'Members per team' : '1팀당 인원',
    remainderSpread: isEn ? 'Distribute across existing teams' : '기존팀에 균등 배분',
    remainderNewTeam: isEn ? 'Create a new team' : '새 팀으로 만들기',
    remainderOneTeam: isEn ? 'Put all remainder in one team' : '한 팀에 전부 배분',
    remainderModeTitle: isEn ? 'Remainder handling' : '나머지 인원 처리 방식',
    importData: isEn ? 'Import external data' : '외부데이터 가져오기',
    importHint: isEn ? 'Google Form and CSV upload are supported' : '지원 기능: 구글폼 연결, CSV 업로드',
    load: isEn ? 'Load' : '불러오기',
    loading: isEn ? 'Loading...' : '불러오는 중...',
    myForms: isEn ? 'My Google Forms' : '내 구글폼 목록',
    loadingList: isEn ? 'Fetching list...' : '목록 조회 중...',
    uploadCsv: isEn ? 'Upload CSV' : 'CSV 업로드',
    columnMgmt: isEn ? 'Row/column management' : '행/열 관리',
    tableTitle: isEn ? 'Participant table' : '참가자 데이터 (테이블)',
    search: isEn ? 'Search participant/value' : '참가자/값 검색',
    noResult: isEn ? 'No matching participants' : '검색 결과가 없습니다.',
    noData: isEn ? 'Please enter data.' : '데이터를 입력해주세요',
    addRow: isEn ? 'Add empty row' : '빈 행 추가',
    importTools: isEn ? 'Import external data' : '외부데이터 가져오기',
    hideImportTools: isEn ? 'Close import panel' : '외부데이터 가져오기 닫기',
    runAssignPaid: isEn ? 'Assign teams' : '팀 배정하기',
    runAssignFree: isEn ? 'Assign teams' : '팀 배정하기',
    moveToPayment: isEn ? 'Opening checkout...' : '결제창 이동 중...',
    assigning: isEn ? 'Assigning teams...' : '팀 배정 중...',
    analyzingDesc: isEn ? 'Analyzing. Please wait a moment.' : '분석 중입니다. 잠시만 기다려주세요.',
    pendingTitle: isEn ? 'Analyzing for team assignment.' : '팀 배정을 위해 분석 중입니다.',
    pendingVerifying: isEn ? '' : '',
    pendingDuration: isEn ? 'Analysis usually takes about 1 minute.' : '분석에는 1분 정도 소요됩니다.',
    pendingStay: isEn ? 'Please do not leave this page until analysis is complete.' : '분석이 완료될 때까지 이 페이지를 이탈하지 마세요.',
    downloadCsv: isEn ? 'Download CSV' : 'CSV 다운로드',
    saveImage: isEn ? 'Save as image' : '이미지로 저장',
    shareResult: isEn ? 'Share' : '공유하기',
    memberDetails: isEn ? 'Details' : '특성 보기',
    hideDetails: isEn ? 'Hide' : '닫기',
    teamReason: isEn ? 'Team rationale' : '팀 편성 근거',
    formUrlPlaceholder: isEn ? 'Google Form URL or Form ID' : 'Google Form URL 또는 Form ID',
    promptPlaceholder: isEn ? 'e.g., keep A and B together, balance gender, mix different collaboration styles' : '예: 김민지와 김철수는 같은 팀, 각 팀 성별은 최대한 균형, 성향 다른 사람끼리 섞기',
    addColumn: isEn ? 'Add column' : '특성(열) 추가',
    pinAsIdentifier: isEn ? 'Set primary column' : '기준 열로 지정',
    selectIdentifier: isEn ? 'Choose primary column' : '기준 열 선택',
    clearIdentifier: isEn ? 'Clear' : '초기화',
    renameColumn: isEn ? 'Rename column' : '열 이름 수정',
    deleteColumn: isEn ? 'Delete column' : '열 삭제',
    deleteLabel: isEn ? 'Delete' : '삭제',
    noColumnToRun: isEn ? 'Cannot start analysis without columns.' : '열이 없으면 분석을 시작할 수 없습니다.',
    duplicateValueNotice: isEn ? 'duplicate values found. You can still continue.' : '건이 있습니다. 진행은 가능합니다.',
    excludeFieldHint: isEn ? 'Choose columns to exclude from analysis.' : '분석에서 제외할 열을 선택할 수 있습니다.',
    loadFormFirstHint: isEn ? 'Import a form first to show feature columns.' : '폼을 먼저 불러오면 특성 목록이 표시됩니다.',
    noPrimaryColumn: isEn ? 'Not set' : '미설정',
    valueInput: isEn ? 'Enter value' : '값 입력',
    moreView: isEn ? 'Expand' : '펼쳐보기',
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
    decisionLog: isEn ? 'Decision log' : '자동 판단 로그',
    tabData: isEn ? 'Data' : '데이터',
    tabRules: isEn ? 'Rules' : '규칙',
    tabReview: isEn ? 'Review' : '검토',
    tabRun: isEn ? 'Run' : '실행',
    reviewSummary: isEn ? 'Readiness Summary' : '실행 전 점검 요약',
    dataCount: isEn ? 'Data count' : '데이터 수',
    expectedTeamCount: isEn ? 'Expected team count' : '만들어질 팀 수',
    teamComposition: isEn ? 'Team composition' : '팀 구성 미리보기',
    customPromptUsage: isEn ? 'Custom prompt' : '맞춤 프롬프트',
    enabled: isEn ? 'Enabled' : '사용',
    disabled: isEn ? 'Disabled' : '미사용',
    runReady: isEn ? 'Ready to run assignment' : '팀 배정 실행 가능',
    runBlocked: isEn ? 'Fix required items first' : '먼저 필수 항목을 해결하세요',
    openDataTabHint: isEn ? 'Complete data import and primary-column setup first.' : '데이터 불러오기와 기준 열 설정을 먼저 완료하세요.',
    goDataTab: isEn ? 'Check data section' : '데이터 섹션 확인',
    reviewFixAction: isEn ? 'Fix in page' : '페이지에서 바로 수정'
  };

  const canRunAssignment =
    Boolean(selectedIdentifierKey) &&
    validParticipants.length > 0 &&
    Number.isFinite(Number(config.teamSize)) &&
    Number(config.teamSize) >= 1;
  const hasIdentifierColumn = Boolean(selectedIdentifierKey);
  const maxTeamSizeInput = Math.max(validParticipants.length, 1);
  const normalizedTeamSize = Number(config.teamSize) || 0;
  const normalizedCustomPrompt = String(customPrompt || '').trim();
  const isCustomPromptActive = customPromptEnabled;
  const remainderPolicy = config.remainderPolicy || 'spread';
  const baseTeamCount = normalizedTeamSize > 0 ? Math.floor(validParticipants.length / normalizedTeamSize) : 0;
  const remainderCount = normalizedTeamSize > 0 ? validParticipants.length % normalizedTeamSize : 0;
  const canSelectRemainderMode = normalizedTeamSize > 0 && remainderCount > 0;
  const expectedTeamCount =
    normalizedTeamSize <= 0
      ? 0
      : remainderCount === 0
        ? baseTeamCount
        : remainderPolicy === 'new_team'
          ? baseTeamCount + 1
          : Math.max(baseTeamCount, 1);
  const teamCompositionText = (() => {
    if (validParticipants.length === 0 || normalizedTeamSize <= 0 || expectedTeamCount === 0) return '-';
    if (remainderCount === 0) return isEn ? `${normalizedTeamSize} members x ${expectedTeamCount} teams` : `${normalizedTeamSize}인 ${expectedTeamCount}팀`;
    if (remainderPolicy === 'new_team') {
      if (baseTeamCount === 0) return isEn ? `${remainderCount} members x 1 team` : `${remainderCount}인 1팀`;
      return isEn
        ? `${normalizedTeamSize} members x ${baseTeamCount} teams, ${remainderCount} members x 1 team`
        : `${normalizedTeamSize}인 ${baseTeamCount}팀, ${remainderCount}인 1팀`;
    }
    if (remainderPolicy === 'one_team') {
      if (baseTeamCount === 0) return isEn ? `${validParticipants.length} members x 1 team` : `${validParticipants.length}인 1팀`;
      const sizes = Array.from({ length: baseTeamCount }, () => normalizedTeamSize);
      sizes[0] += remainderCount;
      const group = new Map();
      sizes.forEach((size) => group.set(size, (group.get(size) || 0) + 1));
      return Array.from(group.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([size, count]) => (isEn ? `${size} members x ${count} teams` : `${size}인 ${count}팀`))
        .join(', ');
    }
    const group = new Map();
    const spreadTeams = Math.max(baseTeamCount, 1);
    const sizes = Array.from({ length: spreadTeams }, () => normalizedTeamSize);
    for (let i = 0; i < remainderCount; i += 1) {
      sizes[i % spreadTeams] += 1;
    }
    sizes.forEach((size) => group.set(size, (group.get(size) || 0) + 1));
    return Array.from(group.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([size, count]) => (isEn ? `${size} members x ${count} teams` : `${size}인 ${count}팀`))
      .join(', ');
  })();
  const reviewItems = [
    {
      label: tx.dataCount,
      value: validParticipants.length,
    },
    {
      label: tx.primaryColumn,
      value: selectedIdentifierKey || tx.noPrimaryColumn,
    },
    {
      label: isEn ? 'Duplicate identifiers' : '중복 식별값',
      value: duplicateIdentifierCount,
    },
    {
      label: tx.expectedTeamCount,
      value: expectedTeamCount
    },
    {
      label: tx.teamComposition,
      value: teamCompositionText
    },
    {
      label: tx.customPromptUsage,
      value: isCustomPromptActive ? tx.enabled : tx.disabled
    }
  ];

  const commitTeamSizeInput = () => {
    const parsed = Number(teamSizeInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setConfig({ ...config, teamSize: 0 });
      setTeamSizeInput('');
      return;
    }
    const nextSize = Math.min(maxTeamSizeInput, Math.max(1, Math.round(parsed)));
    setConfig({ ...config, teamSize: nextSize });
    setTeamSizeInput(String(nextSize));
  };

  const resetInputState = () => {
    historyRef.current = { past: [], future: [] };
    setParticipants([]);
    setAvailableIdentifierKeys([]);
    setSelectedIdentifierKey('');
    setColumnOrder([]);
    setExcludedFeatureKeys([]);
    setShowAllParticipants(false);
    setParticipantQuery('');
    setCustomPrompt('');
    setConfig({ teamSize: 0, remainderPolicy: 'spread' });
    setTeamSizeInput('');
    setFormUrl('');
    setSheetListOpen(false);
    setDriveForms([]);
    setImportPanelOpen(false);
    clearPendingCheckoutState();
    setMessage('');
  };

  const goLandingAndReset = () => {
    bypassReportRedirectRef.current = true;
    resetInputState();
    clearAllReportCaches();
    setTeams([]);
    setAssignmentReport(null);
    goPage('landing', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f5f6f1] text-[#1a1f2e] p-4 md:p-6">
      <div className="max-w-[1280px] mx-auto">
        <Card className="sticky top-4 z-20 rounded-2xl border-[#d9deea] bg-white/90 backdrop-blur-md shadow-[0_8px_25px_rgba(18,24,40,0.06)]">
          <CardContent className="flex justify-between items-center py-3 px-4 md:px-5">
            <button
            type="button"
            onClick={goLandingAndReset}
            className="inline-flex items-center gap-2 font-extrabold text-lg text-[#141b2d] tracking-tight"
            >
              <Users className="size-5 text-[#1570ef]" /> TeamBuilder
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextLang = uiLang === 'ko' ? 'en' : 'ko';
                  updateLang(nextLang);
                }}
                className="inline-flex h-8 items-center rounded-md border border-[#d9deea] bg-white px-2 text-xs"
                aria-label="language-switch"
              >
                <span className={`px-2 py-0.5 rounded ${uiLang === 'ko' ? 'bg-[#1a2138] text-white font-semibold' : 'text-[#667085]'}`}>한글</span>
                <span className="px-1 text-[#98a2b3]">|</span>
                <span className={`px-2 py-0.5 rounded ${uiLang === 'en' ? 'bg-[#1a2138] text-white font-semibold' : 'text-[#667085]'}`}>English</span>
              </button>
              {!user ? (
                <Button type="button" size="sm" onClick={() => goPage('login')} className="h-8 rounded-lg bg-[#1a2138] text-white hover:bg-[#12192d]">{tx.login}</Button>
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={logout} className="h-8 rounded-lg">{tx.logout}</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
        {currentPage === 'landing' && (
          <motion.div key="landing" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="mt-8 space-y-6">
            <div className="grid grid-cols-1 gap-5">
              <Card className="rounded-[28px] border-[#d9deea] shadow-[0_18px_40px_rgba(18,24,40,0.08)]">
                <CardContent className="px-6 py-7 md:px-9 md:py-10">
                <Badge variant="outline" className="inline-flex items-center gap-2 rounded-full border-[#d4e6ff] bg-[#f2f8ff] px-3 py-1 text-xs font-semibold text-[#1868db]">
                  <Sparkles size={14} /> {tx.landingBadge}
                </Badge>
                <h1 className="mt-5 text-4xl lg:text-5xl font-black leading-[1.05] tracking-[-0.02em]">
                  Data-In, Teams-Out.
                  <br />
                  <span className="text-[#1570ef]">{tx.landingTitleLine2}</span>
                </h1>
                <p className="mt-4 text-[#4b556b] max-w-2xl leading-7">
                  {tx.landingBody}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button onClick={() => (user ? goPage('input') : goPage('login'))} className="inline-flex items-center gap-2 rounded-xl bg-[#1a2138] px-5 py-3 text-white font-semibold hover:bg-[#12192d]">
                    {tx.start} <ArrowRight size={16} />
                  </Button>
                </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {currentPage === 'login' && (
          <motion.div key="login" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="mt-14 max-w-md mx-auto">
            <Card className="rounded-[24px] border-[#d9deea] bg-white p-7 shadow-[0_18px_40px_rgba(18,24,40,0.08)]">
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight">{tx.login}</h3>
                <p className="text-sm text-[#667085]">{tx.connectOAuth}</p>
              </div>
              <div className="mt-6">
                <Button
                  onClick={login}
                  className="h-11 w-full rounded-xl border border-[#d9deea] bg-white text-[#111827] font-semibold hover:bg-[#f8fafc]"
                >
                  <span className="inline-flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"/>
                      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.2 35.9 26.7 37 24 37c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.5 40.1 16.2 44 24 44z"/>
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.8-3 5-5.9 6.6l.1-.1 6.3 5.2C35.4 40 44 34 44 24c0-1.2-.1-2.4-.4-3.5z"/>
                    </svg>
                    {tx.googleLogin}
                  </span>
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {currentPage === 'input' && (
          <div className="mt-6 space-y-4">
            <div className="bg-white rounded-2xl border border-[#d9deea] p-6 space-y-4">
              <div className="flex flex-col gap-4">

              <div className="order-2 space-y-4">
              <div className="rounded-xl border border-[#d9deea] p-3 space-y-3 bg-[#f7f9fc]/70">
                <p className="text-sm font-bold flex items-center gap-2"><Settings2 size={15} /> {tx.teamSettings}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                  <span>{tx.teamSize}</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    min="1"
                    max={maxTeamSizeInput}
                    value={teamSizeInput}
                    onChange={(e) => {
                      const raw = String(e.target.value || '');
                      if (/^\d*$/.test(raw)) setTeamSizeInput(raw);
                    }}
                    onBlur={commitTeamSizeInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitTeamSizeInput();
                        e.currentTarget.blur();
                      }
                    }}
                    className="h-8 w-20 rounded-md border-[#d9deea] bg-white px-2 py-1"
                  />
                </label>
              </div>
              {canSelectRemainderMode && (
                <div className="space-y-2 text-sm">
                  <span className="text-[#475467]">{tx.remainderModeTitle}</span>
                  <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-2 py-1 border rounded">
                    <input
                      type="radio"
                      checked={remainderPolicy === 'spread'}
                      onChange={() => setConfig({ ...config, remainderPolicy: 'spread' })}
                    />
                    {tx.remainderSpread}
                  </label>
                  <label className="inline-flex items-center gap-2 px-2 py-1 border rounded">
                    <input
                      type="radio"
                      checked={remainderPolicy === 'one_team'}
                      onChange={() => setConfig({ ...config, remainderPolicy: 'one_team' })}
                    />
                    {tx.remainderOneTeam}
                  </label>
                  <label className="inline-flex items-center gap-2 px-2 py-1 border rounded">
                    <input
                      type="radio"
                      checked={remainderPolicy === 'new_team'}
                      onChange={() => setConfig({ ...config, remainderPolicy: 'new_team' })}
                    />
                    {tx.remainderNewTeam}
                  </label>
                </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{tx.customPrompt}</p>
                    <span className="relative inline-flex group">
                      <button
                        type="button"
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#cbd5e1] text-[10px] font-bold text-[#475467] bg-white"
                        aria-label={tx.customPromptHelp}
                      >
                        ?
                      </button>
                      <span className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-72 -translate-x-1/2 rounded-md border border-[#d9deea] bg-white px-2 py-1 text-[11px] font-medium leading-4 text-[#334155] shadow-md group-hover:block group-focus-within:block">
                        {tx.customPromptHelp}
                      </span>
                    </span>
                    <label className="inline-flex items-center gap-1 text-xs font-semibold text-[#334155]">
                      <input
                        type="checkbox"
                        checked={customPromptEnabled}
                        onChange={(e) => setCustomPromptEnabled(e.target.checked)}
                      />
                      {tx.customPromptToggle}
                    </label>
                  </div>
                </div>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={tx.promptPlaceholder}
                  disabled={!customPromptEnabled}
                  className="w-full min-h-24 border rounded px-3 py-2 text-sm disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]"
                />
              </div>
              </div>
              </div>

              <div className="order-1 space-y-5">
              <div className="space-y-4">
              <div className="rounded-xl border border-[#d9deea] overflow-hidden">
              <div className="px-3 py-2 bg-[#f2f5fa] text-sm font-semibold flex items-center justify-between gap-2">
                <span>{tx.tableTitle}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (importPanelOpen) setSheetListOpen(false);
                    setImportPanelOpen((v) => !v);
                  }}
                  className="inline-flex items-center gap-1"
                >
                  <Database size={14} />
                  {importPanelOpen ? tx.hideImportTools : tx.importTools}
                </Button>
              </div>
              {importPanelOpen && (
                <div className="px-3 py-3 border-b bg-[#f8fafc] space-y-3">
                  <p className="text-sm font-bold flex items-center gap-2"><Database size={15} /> {tx.importData}</p>
                  <p className="text-xs text-[#667085]">{tx.importHint}</p>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Input
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      placeholder={tx.formUrlPlaceholder}
                      className="h-10 flex-1 border-[#d9deea] bg-white"
                    />
                    <Button
                      onClick={() => importSheet()}
                      disabled={sheetImportLoading}
                      className="h-10 rounded-md bg-[#1a2138] text-white hover:bg-[#12192d]"
                    >
                      {sheetImportLoading ? tx.loading : tx.load}
                    </Button>
                    <Button
                      onClick={openSheets}
                      disabled={sheetListLoading}
                      variant="secondary"
                      className="h-10 rounded-md"
                    >
                      {sheetListLoading ? tx.loadingList : tx.myForms}
                    </Button>
                    <label className="inline-flex h-10 w-fit items-center gap-2 px-3 bg-[#f2f5fa] rounded cursor-pointer">
                      <Upload size={16} /> {tx.uploadCsv}
                      <input type="file" accept=".csv" className="hidden" onChange={onUploadCsv} />
                    </label>
                  </div>
                  {sheetListOpen && driveForms.length > 0 && (
                    <div className="max-h-52 overflow-y-auto border rounded bg-white">
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
                </div>
              )}
              <div className="px-3 py-2 border-b bg-white flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-[#667085]" />
                  <Input
                    value={participantQuery}
                    onChange={(e) => setParticipantQuery(e.target.value)}
                    placeholder={tx.search}
                    className="h-8 w-72 max-w-full border-[#d9deea] text-sm bg-white"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addEmptyParticipantRow}>
                    {tx.addRow}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={addFeatureColumn}>
                    {tx.addColumn}
                  </Button>
                </div>
              </div>
              <div className="px-3 py-2 border-b bg-[#f8fafc] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[#475467]">{tx.selectIdentifier}</span>
                    <select
                      value={selectedIdentifierKey}
                      onChange={(e) => pinColumnAsIdentifier(e.target.value)}
                      className="h-8 rounded-md border border-[#d9deea] bg-white px-2 text-sm"
                    >
                      {columnOrder.map((key) => (
                        <option key={`identifier-${key}`} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </div>
                  {validParticipants.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={resetInputState}
                    >
                      {tx.clearIdentifier}
                    </Button>
                  )}
                </div>
              </div>
              <div
                className={`overflow-x-auto bg-white ${showAllParticipants ? '' : 'overflow-y-auto'}`}
                style={showAllParticipants ? undefined : { maxHeight: `${compactTableMaxHeight}px` }}
              >
                <Table className="min-w-full text-sm">
                  <TableHeader className="bg-[#f7f9fc]">
                    <TableRow>
                      <TableHead className="w-10 px-3 py-2 text-left text-[#4b556b]"></TableHead>
                      <TableHead className="w-14 px-3 py-2 text-left text-[#4b556b]">
                        {tableParticipants.length > 0 ? 'No' : ''}
                      </TableHead>
                      {hasIdentifierColumn && (
                        <TableHead className="min-w-44 px-3 py-2 text-left text-[#4b556b]">
                          {renderEditableHeader(selectedIdentifierKey, '')}
                        </TableHead>
                      )}
                      {tableFeatureKeys.map((key) => (
                        <TableHead key={key} className="min-w-44 px-3 py-2 text-left text-[#4b556b]">
                          {renderEditableHeader(key, key)}
                        </TableHead>
                      ))}
                      <TableHead className="w-12 px-3 py-2 text-left text-[#4b556b]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shownParticipants.map((p, idx) => (
                      <TableRow
                        key={p.internalId || p.id}
                        className={`border-b hover:bg-[#f7f9fc] ${p?.enabled === false ? 'opacity-50' : ''}`}
                      >
                        <TableCell className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={p?.enabled !== false}
                            onChange={(e) => toggleParticipantEnabled(p, e.target.checked)}
                            aria-label={tr('행 사용 여부', 'Row enabled')}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-2 text-[#667085]">{idx + 1}</TableCell>
                        {hasIdentifierColumn && (
                          <TableCell className="px-3 py-2">
                            <Input
                              ref={(node) => {
                                const key = buildTableInputRefKey(p, selectedIdentifierKey);
                                if (!key) return;
                                if (node) tableInputRefs.current.set(key, node);
                                else tableInputRefs.current.delete(key);
                              }}
                              value={String(p?.features?.[selectedIdentifierKey] || '')}
                              onChange={(e) => updateParticipantFeature(p, selectedIdentifierKey, e.target.value)}
                              onPaste={(e) => handleTablePaste(e, idx, selectedIdentifierKey)}
                              onKeyDown={(e) => handleTableInputKeyDown(e, idx, selectedIdentifierKey)}
                              disabled={p?.enabled === false}
                              className="h-8 w-full border-[#d9deea] text-sm"
                              placeholder={tx.valueInput}
                            />
                          </TableCell>
                        )}
                        {tableFeatureKeys.map((key) => (
                          <TableCell key={`${p.internalId || p.id}-${key}`} className="px-3 py-2">
                            <Input
                              ref={(node) => {
                                const refKey = buildTableInputRefKey(p, key);
                                if (!refKey) return;
                                if (node) tableInputRefs.current.set(refKey, node);
                                else tableInputRefs.current.delete(refKey);
                              }}
                              value={String(p?.features?.[key] || '')}
                              onChange={(e) => updateParticipantFeature(p, key, e.target.value)}
                              onPaste={(e) => handleTablePaste(e, idx, key)}
                              onKeyDown={(e) => handleTableInputKeyDown(e, idx, key)}
                              disabled={p?.enabled === false}
                              className="h-8 w-full border-[#d9deea] text-sm"
                              placeholder={isEn ? `${key} value` : `${key} 값 입력`}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="px-3 py-2">
                          <Button
                            onClick={() => removeParticipantRow(p)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                            aria-label={tx.deleteLabel}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {shownParticipants.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={tableFeatureKeys.length + (hasIdentifierColumn ? 4 : 3)} className="px-3 py-6 text-center text-[#667085]">
                          {tableParticipants.length === 0 ? tx.noData : tx.noResult}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              </div>

              {filteredParticipants.length > maxInitialRows && (
              <Button
                type="button"
                onClick={() => setShowAllParticipants((v) => !v)}
                variant="outline"
                className="border-[#d9deea] bg-white hover:bg-[#f7f9fc]"
              >
                {showAllParticipants
                  ? tx.collapse
                  : tx.moreView}
              </Button>
              )}
              </div>
              </div>

              <div className="order-3 space-y-4">
                <div className="rounded-xl border border-[#d9deea] p-4 space-y-3 bg-[#f8fafc]">
                  <p className="text-sm font-bold">{tx.reviewSummary}</p>
                  <div className="grid gap-2 md:grid-cols-3">
                    {reviewItems.map((item) => (
                      <div key={item.label} className="rounded-lg border border-[#d9deea] bg-white p-3">
                        <p className="text-xs text-[#667085]">{item.label}</p>
                        <p className="text-sm font-bold mt-1">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="order-3 flex justify-end">
              <Button onClick={runAssign} disabled={paymentLoading || !canRunAssignment} className="bg-cyan-700 text-white hover:bg-cyan-800 disabled:opacity-60">
                {paymentLoading ? (customPromptEnabled ? tx.moveToPayment : tx.assigning) : (customPromptEnabled ? tx.runAssignPaid : tx.runAssignFree)}
              </Button>
              </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'loading' && (
          <motion.div key="loading" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="mt-16 max-w-2xl mx-auto">
            <div className="rounded-3xl border border-[#d9deea] bg-white p-10 text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear', duration: 1.4 }} className="mx-auto h-12 w-12 rounded-full border-4 border-[#d9deea] border-t-cyan-600" />
              <p className="mt-6 text-[#4b556b]">{tx.analyzingDesc}</p>
            </div>
          </motion.div>
        )}

        {currentPage === 'polar_wait' && (
          <motion.div key="polar-wait" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="mt-16 max-w-2xl mx-auto">
            <div className="rounded-3xl border border-[#d9deea] bg-white p-10 text-center space-y-4">
              <h3 className="text-2xl font-black">{tx.pendingTitle}</h3>
              <div className="space-y-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, ease: 'linear', duration: 1.2 }}
                  className="mx-auto h-10 w-10 rounded-full border-4 border-[#d9deea] border-t-cyan-600"
                />
                {tx.pendingVerifying ? <p className="text-[#4b556b]">{tx.pendingVerifying}</p> : null}
                <p className="text-sm text-[#4b556b]">{tx.pendingDuration}</p>
                <p className="text-sm font-semibold text-rose-600">{tx.pendingStay}</p>
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === 'result' && (
          <motion.div key="result" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="mt-6 space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={exportCSV}
                className="bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-2"
              >
                <Download size={16} /> {tx.downloadCsv}
              </Button>
              <Button
                onClick={saveResultImage}
                disabled={resultActionLoading}
                variant="outline"
                className="border-[#d9deea] bg-white"
              >
                <ImageDown size={16} /> {tx.saveImage}
              </Button>
              <Button
                onClick={shareResult}
                disabled={resultActionLoading}
                variant="outline"
                className="border-[#d9deea] bg-white"
              >
                <Share2 size={16} /> {tx.shareResult}
              </Button>
            </div>
            <div className="space-y-4">
              {assignmentReport && (
                <div className="bg-white border rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#1f2937]">{tx.promptChecklistTitle}</p>
                    <button
                      type="button"
                      onClick={() => setReportCollapsed((prev) => !prev)}
                      className="rounded border border-[#d9deea] px-2 py-1 text-xs font-semibold text-[#344054] hover:bg-[#f8fafc]"
                    >
                      {reportCollapsed ? tr('펼치기', 'Expand') : tr('접기', 'Collapse')}
                    </button>
                  </div>
                  {!reportCollapsed && (
                    <>
                  {(() => {
                    const rawChecklist = Array.isArray(assignmentReport?.rawAi?.prompt_checklist)
                      ? assignmentReport.rawAi.prompt_checklist
                      : [];
                    return String(assignmentReport.originalPrompt || '').trim() || rawChecklist.length > 0;
                  })() && (
                    <div className="space-y-2">
                        {String(assignmentReport.originalPrompt || '').trim() && (
                          <div className="rounded border border-[#e5e7eb] bg-[#f8fafc] p-2">
                            <p className="text-[11px] font-semibold text-[#475467]">{tx.promptOriginal}</p>
                            <p className="mt-1 whitespace-pre-wrap text-xs text-[#111827]">
                              {assignmentReport.originalPrompt}
                            </p>
                          </div>
                        )}
                        {(() => {
                          const rawChecklist = Array.isArray(assignmentReport?.rawAi?.prompt_checklist)
                            ? assignmentReport.rawAi.prompt_checklist
                            : [];
                          return rawChecklist.length > 0;
                        })() && (
                          <div className="space-y-1">
                            {(Array.isArray(assignmentReport?.rawAi?.prompt_checklist)
                              ? assignmentReport.rawAi.prompt_checklist
                              : []).map((item, idx) => (
                              <div key={`prompt-check-${idx}`} className="rounded border border-[#e5e7eb] p-2 text-xs">
                                {(() => {
                                  const itemTitle = String(
                                    item?.item || item?.text || item?.request || item?.original_text || `${idx + 1}`
                                  ).trim();
                                  const statusKey = String(item?.status_key || item?.statusKey || '').trim().toLowerCase();
                                  const itemStatus = String(
                                    item?.status_label || item?.statusLabel || item?.status || item?.result || ''
                                  ).trim();
                                  const itemStatusClass =
                                    statusKey === 'full'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : statusKey === 'partial'
                                        ? 'bg-orange-100 text-orange-800'
                                        : statusKey === 'unmet'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-[#f2f4f7] text-[#344054]';
                                  const itemReason = String(
                                    item?.reason || item?.comment || item?.report || item?.explanation || ''
                                  ).trim();
                                  const itemAppliedDetail = String(
                                    item?.applied_detail || item?.reflection_detail || item?.how_applied || ''
                                  ).trim();
                                  const itemEvidence = Array.isArray(item?.evidence)
                                    ? item.evidence.map((v) => String(v || '').trim()).filter(Boolean)
                                    : [];
                                  return (
                                    <>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-[#111827]">{idx + 1}. {itemTitle}</p>
                                  {itemStatus && (
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${itemStatusClass}`}>
                                      {itemStatus}
                                    </span>
                                  )}
                                </div>
                                {itemReason && <p className="mt-1 text-[#475467]">{itemReason}</p>}
                                {itemAppliedDetail && (
                                  <div className="mt-2 rounded border border-[#e5e7eb] bg-[#f8fafc] p-2">
                                    <p className="text-[11px] font-semibold text-[#475467]">{tx.promptAppliedDetail}</p>
                                    <p className="mt-1 whitespace-pre-wrap text-[#344054]">{itemAppliedDetail}</p>
                                  </div>
                                )}
                                {itemEvidence.length > 0 && (
                                  <div className="mt-2 rounded border border-[#e5e7eb] bg-white p-2">
                                    <p className="text-[11px] font-semibold text-[#475467]">{tx.promptEvidence}</p>
                                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[#344054]">
                                      {itemEvidence.map((evidence, evidenceIdx) => (
                                        <li key={`prompt-check-${idx}-evidence-${evidenceIdx}`}>{evidence}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                    </>
                                  );
                                })()}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                    </>
                  )}
                </div>
              )}
              <div ref={resultCaptureRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((t) => {
                  return (
                    <div key={t.id} className="bg-white border rounded-2xl p-4 space-y-3">
                      <h3 className="font-black mb-2">Team {t.id}</h3>
                      {t.members.map((m, i) => {
                        const memberKey = `${t.id}::${m.id || i}`;
                        const isExpanded = Boolean(expandedMemberKeys[memberKey]);
                        const features = Object.entries(m?.features || {}).filter(([, value]) => String(value || '').trim() !== '');

                        return (
                          <div key={memberKey} className="text-sm border rounded p-2 mb-2 bg-white">
                            <button
                              type="button"
                              onClick={() => toggleMemberDetail(t.id, m.id || i)}
                              className="w-full flex items-center justify-between gap-2"
                            >
                              <span className="font-bold text-left">{m.name || m.id || '-'}</span>
                              <span className="inline-flex items-center gap-1 text-xs text-[#344054]">
                                {isExpanded ? tx.hideDetails : tx.memberDetails}
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="mt-2 grid grid-cols-1 gap-1 rounded bg-[#f8fafc] p-2">
                                {features.length === 0 ? (
                                  <p className="text-xs text-[#667085]">{tr('표시할 특성값이 없습니다.', 'No feature values to show.')}</p>
                                ) : (
                                  features.map(([key, value]) => (
                                    <p key={`${memberKey}-${key}`} className="text-xs text-[#344054]">
                                      <span className="font-semibold">{key}</span>: {String(value)}
                                    </p>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default App;

















