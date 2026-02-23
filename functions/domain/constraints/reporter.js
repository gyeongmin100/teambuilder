import { trimText } from '../../shared/text.js';

const statusText = (status) => {
  if (status === 'satisfied') return '충족';
  if (status === 'partially_satisfied') return '부분 충족';
  if (status === 'unmet') return '미충족';
  return '부분 충족';
};

const parsePromptChecklistItems = (customPrompt = '') => {
  const raw = String(customPrompt || '').trim();
  if (!raw) return [];

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*•\d\)\.\s]+/, '').trim())
    .filter(Boolean);

  const source =
    lines.length <= 1
      ? raw
          .split(/,|;|\/| 그리고 | 및 /)
          .map((part) => part.trim())
          .map((part) => part.replace(/^[-*•\d\)\.\s]+/, '').trim())
          .filter(Boolean)
      : lines;

  const dedup = [];
  const seen = new Set();
  for (const item of source) {
    const normalized = item.replace(/\s+/g, ' ').trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    dedup.push(normalized);
  }

  return dedup.slice(0, 12);
};

const buildPromptChecklist = (customPrompt, requestReview = []) => {
  const items = parsePromptChecklistItems(customPrompt);
  if (items.length === 0) return [];

  const reviewPool = (requestReview || []).map((r) => ({
    ...r,
    request: String(r?.request || '').trim(),
    used: false
  }));

  return items.map((item, idx) => {
    let matched = reviewPool.find(
      (r) => !r.used && r.request && (r.request.includes(item) || item.includes(r.request))
    );
    if (!matched && reviewPool[idx] && !reviewPool[idx].used) matched = reviewPool[idx];
    if (matched) matched.used = true;

    const status = matched?.status || 'partially_satisfied';
    return {
      item: trimText(item, 220),
      status,
      statusLabel: statusText(status),
      reason: trimText(
        matched?.reason || '세부 판정 정보가 충분하지 않아 기본 상태(부분 충족)로 표시했습니다.',
        320
      )
    };
  });
};

const buildAssignmentReport = ({
  teams,
  reason,
  usedFallback,
  customPrompt,
  integrityReport,
  requestReview,
  warnings = [],
  remainderDecision = null
}) => {
  const totalParticipants = teams.flatMap((t) => t.members || []).length;

  const satisfied = (requestReview || []).filter((r) => r.status === 'satisfied');
  const partial = (requestReview || []).filter((r) => r.status === 'partially_satisfied');
  const unmet = (requestReview || []).filter((r) => r.status === 'unmet');

  const summaryLines = [
    `총 ${totalParticipants}명을 ${teams.length}개 팀으로 배정했습니다.`,
    (requestReview || []).length > 0
      ? `요청 반영 결과: 충족 ${satisfied.length}건, 부분 충족 ${partial.length}건, 미충족 ${unmet.length}건.`
      : String(customPrompt || '').trim()
        ? '요청사항을 최대한 반영해 배정했습니다.'
        : '입력 데이터 균형을 기준으로 배정했습니다.',
    usedFallback
      ? '정합성 검증에서 오류가 확인되어 자동 보정 규칙으로 결과를 안정화했습니다.'
      : '정합성 검증을 통과한 결과만 확정했습니다.',
    remainderDecision?.reason
      ? `나머지 인원 판단: ${trimText(remainderDecision.reason, 160)}`
      : '',
    trimText(reason || '', 200)
  ].filter(Boolean);

  const teamReports = teams.map((team) => ({
    teamId: team.id,
    reason: trimText(team.analysis || `${team.members.length}명으로 구성되었습니다.`, 520),
    evidence: [`인원: ${team.members.length}명`]
  }));

  const promptChecklist = buildPromptChecklist(customPrompt, requestReview || []);

  return {
    summary: trimText(summaryLines.join(' '), 1300),
    originalPrompt: trimText(customPrompt || '', 2000),
    promptChecklist,
    integrity: integrityReport || null,
    requestReview: (requestReview || []).map((r) => ({
      request: trimText(r.request || '', 180),
      status: r.status,
      statusLabel: statusText(r.status),
      reason: trimText(r.reason || '', 320)
    })),
    remainderDecision: remainderDecision
      ? {
          mode: remainderDecision.mode || 'existing_teams',
          allowedTeamCountChange: Boolean(remainderDecision.allowedTeamCountChange),
          reason: trimText(remainderDecision.reason || '', 220)
        }
      : null,
    warnings: (warnings || []).map((w) => trimText(w, 260)).filter(Boolean),
    teamReports
  };
};

export { buildAssignmentReport };
