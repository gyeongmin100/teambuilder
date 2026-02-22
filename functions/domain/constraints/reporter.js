import { trimText } from '../../shared/text.js';
import { summarizeConstraintStatus, analyzeConstraintConsistency } from './evaluator.js';

const buildAssignmentReport = ({ teams, constraints, feasibility, reason, teamSize, remainderMode, usedFallback, unsupportedConstraints = [] }) => {
  const consistency = analyzeConstraintConsistency(constraints);
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

  const checklist = constraintResults.map((c) => ({
    item: `${c.type}${c.rawText ? ` (${trimText(c.rawText, 30)})` : ''}`,
    requested: true,
    status: c.status
  }));

  const warnings = (feasibility || []).filter((f) => f.status === 'impossible').map((f) => f.detail);
  const unsupportedWarnings = unsupportedConstraints.map((u) => `미지원 제약(${u.type}): ${u.rawText}`);
  const conflictWarnings = consistency.conflicts.map((x) => `충돌: ${x}`);
  const ambiguityWarnings = consistency.ambiguities.map((x) => `모호/정성: ${x}`);

  return {
    summary: trimText([
      `총 ${teams.flatMap((t) => t.members || []).length}명을 ${teams.length}개 팀으로 배정했습니다.`,
      `팀 크기 기준: ${teamSize}명 / remainderMode: ${remainderMode}.`,
      `배정 메모: ${trimText(reason || '', 120) || '없음'}.`,
      usedFallback ? 'AI 실패 시 서버 안전규칙으로 폴백 배정했습니다.' : 'AI 판단을 우선 반영하고 서버는 안전 검증만 수행했습니다.',
      warnings.length > 0 ? `불가능 제약 ${warnings.length}건은 최선안으로 처리했습니다.` : '',
      unsupportedWarnings.length > 0 ? `미지원 제약 ${unsupportedWarnings.length}건은 자동 검증에서 제외했습니다.` : '',
      consistency.conflicts.length > 0 ? `요청 충돌 ${consistency.conflicts.length}건은 패널티 최소화 해를 선택했습니다.` : '',
      consistency.ambiguities.length > 0 ? `모호/정성 요청 ${consistency.ambiguities.length}건은 최선 추정으로 반영했습니다.` : ''
    ].filter(Boolean).join(' '), 900),
    interpretation: constraints.map((c) => ({
      constraintId: c.id,
      type: c.type,
      priority: c.priority,
      rawText: c.rawText || '',
      instruction: c.instruction || ''
    })),
    ambiguities: consistency.ambiguities,
    conflicts: consistency.conflicts,
    decisionLog: consistency.decisionLog,
    checklist,
    constraints: constraintResults,
    feasibility,
    warnings: [...warnings, ...unsupportedWarnings, ...conflictWarnings, ...ambiguityWarnings],
    actionHint: warnings.length > 0
      ? '요청사항 일부가 데이터상 불가능하여 AI가 최선안으로 조정했습니다. 상세 사유는 경고/판정 로그를 확인하세요.'
      : 'AI 판단 기반으로 배정이 완료되었습니다.',
    teamReports: teams.map((team) => ({
      teamId: team.id,
      reason: `${team.members.length}명으로 구성. 제약 반영 상태는 체크리스트를 확인하세요.`,
      evidence: [`인원: ${team.members.length}명`, team.analysis ? `AI 코멘트: ${trimText(team.analysis, 220)}` : 'AI 코멘트 없음']
    }))
  };
};

export { buildAssignmentReport };
