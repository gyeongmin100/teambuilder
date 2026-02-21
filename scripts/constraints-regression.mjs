import assert from 'node:assert/strict';
import { __test__ } from '../functions/api/assign.js';

const participants = [
  { id: 'p1', displayName: '김민수', intro: '백엔드 리더 경험 다수', features: { 성별: '남자', 역할: '리더', 성향: '분석형' } },
  { id: 'p2', displayName: '김민수', intro: '프론트 개발 선호', features: { 성별: '남자', 역할: '개발', 성향: '실행형' } },
  { id: 'p3', displayName: '박영희', intro: '기획 강점', features: { 성별: '여자', 역할: '기획', 성향: '분석형' } },
  { id: 'p4', displayName: '이수진', intro: '발표 강점', features: { 성별: '여자', 역할: '발표', 성향: '외향형' } },
  { id: 'p5', displayName: '최나연', intro: '디자인/문서화 강점', features: { 성별: '여자', 역할: '디자인', 성향: '세밀형' } },
  { id: 'p6', displayName: '정도현', intro: '운영/PM 경험', features: { 성별: '남자', 역할: '리더', 성향: '외향형' } },
  { id: 'p7', displayName: '한지민', intro: '데이터 분석 선호', features: { 성별: '여자', 역할: '분석', 성향: '분석형' } }
];

const run = () => {
  const prompt = '각 팀 남자 두 명 이상 반드시, 김민수와 박영희는 같은 팀, 성향 다양하게 섞어줘, 리더 분산해줘';
  const raw = __test__.ruleBasedParseConstraints(prompt);
  const normalized = __test__.normalizeConstraints({ rawConstraints: raw, participants });

  assert.ok(normalized.some((c) => c.type === 'min_per_team'), 'min_per_team 파싱 실패');
  assert.ok(normalized.some((c) => c.type === 'soft_objective'), 'soft_objective 파싱 실패');

  const minConstraint = normalized.find((c) => c.type === 'min_per_team');
  const feasibility = __test__.evaluateFeasibility({ constraints: normalized, participants, teamCount: 5 });
  const minFeasibility = feasibility.find((f) => f.constraintId === minConstraint.id);
  assert.equal(minFeasibility.status, 'impossible', 'impossible 판정 실패');
  assert.equal(minFeasibility.shortage, 7, '부족 인원 계산 실패');

  const pairConstraint = normalized.find((c) => c.type === 'same_team');
  assert.equal(pairConstraint.resolved.status, 'not_verifiable', '동명이인 not_verifiable 처리 실패');

  const soft = normalized.find((c) => c.type === 'soft_objective');
  const teams = [
    { id: 1, members: participants.slice(0, 3) },
    { id: 2, members: participants.slice(3, 5) },
    { id: 3, members: participants.slice(5) }
  ];
  const softPenalty = __test__.softObjectivePenalty(soft, teams);
  assert.ok(Number.isFinite(softPenalty), 'softObjectivePenalty 계산 실패');

  const consistency = __test__.analyzeConstraintConsistency(normalized);
  assert.ok(Array.isArray(consistency.ambiguities), '모호성 분석 실패');

  const improved = __test__.localSearchImprove(teams, normalized, 20);
  assert.ok(Array.isArray(improved) && improved.length === 3, 'localSearchImprove 동작 실패');

  console.log('constraints-regression: OK');
};

run();
