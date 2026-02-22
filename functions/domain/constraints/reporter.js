import { trimText } from '../../shared/text.js';
import { summarizeConstraintStatus } from './evaluator.js';

const normalizeText = (v) => String(v || '').trim().toLowerCase();

const includesAny = (text, keywords) => {
  const t = normalizeText(text);
  return keywords.some((k) => t.includes(k));
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
    if (totalStats.male === 0) return '전체 데이터에 남성 인원이 없어 여성 중심으로 구성되었습니다.';
    if (totalStats.male < teamCount) return '남성 인원이 팀 수보다 적어 모든 팀에 남성을 배치할 수 없어 여성 중심으로 구성되었습니다.';
  }

  if (teamStats.female === 0) {
    if (totalStats.female === 0) return '전체 데이터에 여성 인원이 없어 남성 중심으로 구성되었습니다.';
    if (totalStats.female < teamCount) return '여성 인원이 팀 수보다 적어 모든 팀에 여성을 배치할 수 없어 남성 중심으로 구성되었습니다.';
  }

  return '';
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
      detail: result.detail
    };
  });

  const warnings = (feasibility || []).filter((f) => f.status === 'impossible').map((f) => f.detail);
  const unsupportedWarnings = unsupportedConstraints.map((u) => `미지원 제약(${u.type}): ${u.rawText}`);
  const allMembers = teams.flatMap((t) => t.members || []);
  const totalStats = collectGenderStats(allMembers);
  const genderIntent = hasGenderBalanceIntent({ constraints, customPrompt });

  const summaryParts = [
    `총 ${allMembers.length}명을 ${teams.length}개 팀으로 배정했습니다.`,
    usedFallback ? '일부 조건은 자동 안전 규칙으로 보정해 결과를 확정했습니다.' : '요청한 조건을 가능한 범위에서 반영했습니다.'
  ];

  if (warnings.length > 0) {
    summaryParts.push(`데이터 제약으로 인해 ${warnings.length}개 조건은 완전 반영되지 않았습니다.`);
  }

  return {
    summary: trimText(summaryParts.join(' '), 500),
    warnings: [...warnings, ...unsupportedWarnings],
    teamReports: teams.map((team) => {
      const teamStats = collectGenderStats(team.members || []);
      const unavoidableNote = buildGenderShortageNote({
        teamStats,
        totalStats,
        teamCount: teams.length,
        genderIntent
      });

      const baseReason = `${team.members.length}명으로 구성했고, 데이터 균형과 입력 조건을 함께 고려했습니다.`;
      const aiReason = trimText(team.analysis || '', 180);
      const reasonLines = [baseReason, aiReason, unavoidableNote].filter(Boolean);

      const evidence = [
        `인원: ${team.members.length}명`,
        teamStats.male + teamStats.female > 0 ? `성별 집계: 남 ${teamStats.male} / 여 ${teamStats.female}` : ''
      ].filter(Boolean);

      return {
        teamId: team.id,
        reason: trimText(reasonLines.join(' '), 260),
        evidence
      };
    }),
    debug: {
      reason: trimText(reason || '', 120),
      teamSize,
      remainderMode,
      constraints: constraintResults,
      feasibility,
      unsupportedConstraints
    }
  };
};

export { buildAssignmentReport };
