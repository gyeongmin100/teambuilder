import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { __test__ } from '../functions/api/assign.js';

const fixturePath = path.resolve('scripts', 'prompt-samples-50.json');
const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const participants = [
  { id: 'p1', displayName: '김민지', intro: '기획 발표', features: { 성별: '여자', 역할: '기획', 학년: '3학년', 성향: '외향형', 전공: '경영', MBTI: 'ENFP' } },
  { id: 'p2', displayName: '김철수', intro: '백엔드 개발', features: { 성별: '남자', 역할: '개발', 학년: '3학년', 성향: '분석형', 전공: '컴공', MBTI: 'INTJ' } },
  { id: 'p3', displayName: '박영희', intro: '디자인 문서화', features: { 성별: '여자', 역할: '디자인', 학년: '1학년', 성향: '세밀형', 전공: '디자인', MBTI: 'ISFJ' } },
  { id: 'p4', displayName: '이수진', intro: '발표 리더십', features: { 성별: '여자', 역할: '리더', 학년: '2학년', 성향: '외향형', 전공: '국문', MBTI: 'ENTJ' } },
  { id: 'p5', displayName: '최나연', intro: '분석/데이터', features: { 성별: '여자', 역할: '분석', 학년: '4학년', 성향: '분석형', 전공: '통계', MBTI: 'INTP' } },
  { id: 'p6', displayName: '한지민', intro: '프론트 개발', features: { 성별: '남자', 역할: '개발', 학년: '2학년', 성향: '실행형', 전공: '컴공', MBTI: 'ESFP' } },
  { id: 'p7', displayName: '정도현', intro: 'PM 운영', features: { 성별: '남자', 역할: '리더', 학년: '4학년', 성향: '사교형', 전공: '산공', MBTI: 'ENFJ' } }
];

const hasAnyExpectedType = (types, expected) => expected.some((t) => types.has(t));

const run = () => {
  assert.ok(Array.isArray(fixtures), '픽스처 형식 오류');
  assert.equal(fixtures.length, 50, '샘플 개수는 50개여야 함');

  const failures = [];
  for (const sample of fixtures) {
    const raw = __test__.ruleBasedParseConstraints(sample.prompt);
    const normalized = __test__.normalizeConstraints({ rawConstraints: raw, participants });
    const typeSet = new Set(normalized.map((c) => c.type));

    if (normalized.length === 0) {
      failures.push(`[${sample.id}] 제약 0건: ${sample.prompt}`);
      continue;
    }

    if (!hasAnyExpectedType(typeSet, sample.expectTypesAny || [])) {
      failures.push(
        `[${sample.id}] 기대 타입 미매칭: expectedAny=${JSON.stringify(sample.expectTypesAny)} actual=${JSON.stringify(Array.from(typeSet))}`
      );
    }
  }

  if (failures.length > 0) {
    const preview = failures.slice(0, 10).join('\n');
    throw new Error(`prompt-samples-regression failed (${failures.length}건)\n${preview}`);
  }

  console.log(`prompt-samples-regression: OK (samples=${fixtures.length})`);
};

run();
