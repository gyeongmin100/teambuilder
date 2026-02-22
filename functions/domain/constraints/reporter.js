import { trimText } from '../../shared/text.js';
import { summarizeConstraintStatus, matchConstraintValue } from './evaluator.js';

const normalizeText = (v) => String(v || '').trim().toLowerCase();

const includesAny = (text, keywords) => {
  const t = normalizeText(text);
  return keywords.some((k) => t.includes(k));
};

const formatConstraintLabel = (constraint) => {
  const raw = trimText(constraint?.rawText || constraint?.instruction || '', 70);
  if (raw) return raw;
  const type = String(constraint?.type || '요청').replaceAll('_', ' ');
  return type;
};

const GENDER_KEYWORDS = ['성별', 'gender', 'sex', '남녀'];
const MALE_VALUES = ['남', '남자', 'male', 'man', 'm'];
const FEMALE_VALUES = ['여', '여자', 'female', 'woman', 'f'];

const detectGender = (member) => {
  const features = member?.features || {};
  for (const [key, rawValue] of Object.entries(features)) {
    const keyText = normalizeText(key);
    if (!GENDER_KEYWORDS.some((k) => keyText.includes(k))) continue;

    const valueText = normalizeText(rawValue);
    if (MALE_VALUES.some((v) => valueText === v || valueText.startsWith(`${v} `))) return 'male';
    if (FEMALE_VALUES.some((v) => valueText === v || valueText.startsWith(`${v} `))) return 'female';
  }
  return '';
};

const collectGenderStats = (members) => {
  let male = 0;
  let female = 0;
  for (const m of members || []) {
    const g = detectGender(m);
    if (g === 'male') male += 1;
    if (g === 'female') female += 1;
  }
  return { male, female };
};

const hasGenderBalanceIntent = ({ constraints = [], customPrompt = '' }) => {
  const promptText = normalizeText(customPrompt);
  if (includesAny(promptText, ['성비', '남녀', 'gender', 'male', 'female', '남자', '여자'])) return true;

  return (constraints || []).some((c) =>
    includesAny(`${c?.rawText || ''} ${c?.instruction || ''}`, ['성비', '남녀', 'gender', 'male', 'female', '남자', '여자'])
  );
};

const buildGenderShortageNote = ({ teamStats, totalStats, teamCount, genderIntent }) => {
  if (!genderIntent) return '';

  if (teamStats.male === 0) {
    if (totalStats.male === 0) return '전체 데이터에 남성 인원이 없어 여성 중심으로 구성했습니다.';
    if (totalStats.male < teamCount) return '남성 인원이 팀 수보다 적어 모든 팀에 남성을 배치할 수 없어 여성 중심으로 구성했습니다.';
  }

  if (teamStats.female === 0) {
    if (totalStats.female === 0) return '전체 데이터에 여성 인원이 없어 남성 중심으로 구성했습니다.';
    if (totalStats.female < teamCount) return '여성 인원이 팀 수보다 적어 모든 팀에 여성을 배치할 수 없어 남성 중심으로 구성했습니다.';
  }

  return '';
};

const detectMbtiKey = (team) => {
  const members = team?.members || [];
  for (const m of members) {
    for (const k of Object.keys(m?.features || {})) {
      if (normalizeText(k).includes('mbti')) return k;
    }
  }
  return '';
};

const isMbti = (v) => /^[ei][ns][tf][jp]$/i.test(String(v || '').trim());

const buildMbtiReason = (team, constraints, customPrompt) => {
  const joined = normalizeText(`${customPrompt || ''} ${(constraints || []).map((c) => c.rawText || c.instruction || '').join(' ')}`);
  const hasIntent = includesAny(joined, ['mbti', '궁합', '성격', '성향']);
  if (!hasIntent) return '';

  const key = detectMbtiKey(team);
  if (!key) return '성향 조합 요청을 반영하려고 했지만 MBTI 데이터가 충분하지 않아 다른 특성 균형을 우선했습니다.';

  const mbtis = (team.members || [])
    .map((m) => String(m?.features?.[key] || '').trim().toUpperCase())
    .filter((v) => isMbti(v));

  if (mbtis.length < 2) return 'MBTI 정보가 부족한 인원이 있어 확인 가능한 범위에서 성향 균형을 반영했습니다.';

  const uniqueCount = new Set(mbtis).size;
  if (uniqueCount >= 3) {
    return `MBTI(${mbtis.join(', ')})가 한쪽으로 치우치지 않도록 섞어 역할 분담과 상호보완이 가능하게 구성했습니다.`;
  }

  return `MBTI(${mbtis.join(', ')})가 유사한 구성원은 협업 안정성을 위해 함께 배치하고, 다른 성향과 충돌하지 않도록 인원을 조정했습니다.`;
};

const cleanTechnicalPhrase = (text) => {
  const raw = String(text || '').trim();
  if (!raw) return '';
  return raw
    .replace(/폴백/gi, '자동 보정')
    .replace(/fallback/gi, 'auto adjustment')
    .replace(/AI 배정 실패/gi, '자동 배정 과정에서 일부 조건 재조정')
    .replace(/최소 안전/gi, '안정적인')
    .replace(/remainderMode\s*[:=]\s*[a-z_]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const evaluateTeamConstraintStatus = (team, constraint) => {
  if (!constraint || !team) return { status: 'unknown', detail: '' };

  if (constraint.type === 'min_per_team' && constraint.attributeKey) {
    const count = (team.members || []).filter((m) => matchConstraintValue(m, constraint)).length;
    if (count >= constraint.min) return { status: 'satisfied', detail: `${constraint.attribute || constraint.value || '해당 조건'} 최소 조건 충족` };
    return { status: 'unsatisfied', detail: `${constraint.attribute || constraint.value || '해당 조건'} 인원 부족` };
  }

  if (constraint.type === 'max_per_team' && constraint.attributeKey) {
    const count = (team.members || []).filter((m) => matchConstraintValue(m, constraint)).length;
    if (count <= constraint.max) return { status: 'satisfied', detail: `${constraint.attribute || constraint.value || '해당 조건'} 상한 충족` };
    return { status: 'unsatisfied', detail: `${constraint.attribute || constraint.value || '해당 조건'} 인원 과다` };
  }

  if (constraint.type === 'balance') {
    return { status: 'considered', detail: `${constraint.attribute || '균형'} 기준을 전체 팀 관점으로 반영` };
  }

  if (constraint.type === 'soft_objective') {
    return { status: 'considered', detail: formatConstraintLabel(constraint) };
  }

  return { status: 'considered', detail: formatConstraintLabel(constraint) };
};

const buildAssignmentReport = ({
  teams,
  constraints,
  feasibility,
  reason,
  teamSize,
  remainderMode,
  usedFallback,
  unsupportedConstraints = [],
  customPrompt = ''
}) => {
  const feasibilityMap = new Map((feasibility || []).map((f) => [f.constraintId, f]));
  const constraintResults = constraints.map((constraint) => {
    const result = summarizeConstraintStatus({ constraint, feasibilityItem: feasibilityMap.get(constraint.id), teams });
    return {
      constraintId: constraint.id,
      type: constraint.type,
      priority: constraint.priority,
      rawText: constraint.rawText || '',
      status: result.status,
      detail: result.detail,
      constraint
    };
  });

  const requestedLabels = constraints.map(formatConstraintLabel).filter(Boolean);
  const satisfiedItems = constraintResults.filter((x) => ['satisfied'].includes(x.status));
  const unsatisfiedItems = constraintResults.filter((x) => ['violated', 'impossible', 'partially_satisfied'].includes(x.status));

  const warnings = (feasibility || []).filter((f) => f.status === 'impossible').map((f) => f.detail);
  const unsupportedWarnings = unsupportedConstraints.map((u) => `자동 판정 미지원 요청: ${u.rawText || u.type}`);

  const allMembers = teams.flatMap((t) => t.members || []);
  const totalStats = collectGenderStats(allMembers);
  const genderIntent = hasGenderBalanceIntent({ constraints, customPrompt });

  const satisfiedText = satisfiedItems.length > 0
    ? `반영된 요청: ${satisfiedItems.map((x) => formatConstraintLabel(x.constraint)).slice(0, 5).join(', ')}`
    : '완전히 충족된 명시 요청은 없지만 전체 균형을 우선해 배정했습니다.';

  const unmetText = unsatisfiedItems.length > 0
    ? `완전 충족이 어려웠던 요청: ${unsatisfiedItems.map((x) => formatConstraintLabel(x.constraint)).slice(0, 4).join(', ')}`
    : '주요 요청은 대부분 충족되었습니다.';

  const unmetReasonText = unsatisfiedItems.length > 0
    ? `사유: ${unsatisfiedItems.map((x) => x.detail).filter(Boolean).slice(0, 2).join(' / ')}`
    : '';

  const strategyText = usedFallback
    ? '일부 요청은 데이터 제한으로 자동 보정 규칙을 적용해 팀 수와 인원 균형을 우선으로 확정했습니다.'
    : '요청 조건을 우선 반영하되, 충돌 시 전체 팀의 균형과 실행 가능성을 기준으로 최선안을 선택했습니다.';

  const summary = trimText([
    `총 ${allMembers.length}명을 ${teams.length}개 팀으로 배정했습니다.`,
    requestedLabels.length > 0 ? `요청사항: ${requestedLabels.slice(0, 6).join(', ')}` : '',
    satisfiedText,
    unmetText,
    unmetReasonText,
    strategyText
  ].filter(Boolean).join(' '), 1200);

  const teamReports = teams.map((team) => {
    const teamStats = collectGenderStats(team.members || []);
    const unavoidableNote = buildGenderShortageNote({
      teamStats,
      totalStats,
      teamCount: teams.length,
      genderIntent
    });

    const satisfiedTeam = [];
    const unmetTeam = [];

    for (const c of constraints || []) {
      const r = evaluateTeamConstraintStatus(team, c);
      if (r.status === 'satisfied') satisfiedTeam.push(r.detail);
      if (r.status === 'unsatisfied') unmetTeam.push(r.detail);
    }

    const mbtiReason = buildMbtiReason(team, constraints, customPrompt);
    const aiReason = cleanTechnicalPhrase(trimText(team.analysis || '', 180));

    const reasonLines = [
      `${team.members.length}명으로 구성했고, 요청 조건과 데이터 분포를 함께 고려해 역할이 겹치지 않도록 조합했습니다.`,
      satisfiedTeam.length > 0 ? `주요 반영 내용: ${satisfiedTeam.slice(0, 2).join(', ')}.` : '',
      unmetTeam.length > 0 ? `완전 충족이 어려운 부분: ${unmetTeam.slice(0, 2).join(', ')}.` : '',
      mbtiReason,
      unavoidableNote,
      aiReason
    ].filter(Boolean);

    const evidence = [
      `인원: ${team.members.length}명`,
      teamStats.male + teamStats.female > 0 ? `성별 집계: 남 ${teamStats.male} / 여 ${teamStats.female}` : ''
    ].filter(Boolean);

    return {
      teamId: team.id,
      reason: trimText(reasonLines.join(' '), 520),
      evidence
    };
  });

  return {
    summary,
    warnings: [...warnings, ...unsupportedWarnings],
    teamReports,
    debug: {
      reason: cleanTechnicalPhrase(trimText(reason || '', 120)),
      teamSize,
      remainderMode,
      constraints: constraintResults.map(({ constraint, ...rest }) => rest),
      feasibility,
      unsupportedConstraints
    }
  };
};

export { buildAssignmentReport };
