const normalizeTeamsById = (teams = []) =>
  [...teams].sort((a, b) => Number(a.id) - Number(b.id));

export const validateQuantitative = ({
  teams,
  allIds,
  targetTeamSizes,
  remainderMode,
  allowTeamCountChange,
  remainderCount
}) => {
  const orderedTeams = normalizeTeamsById(teams);
  const usedIds = orderedTeams.flatMap((team) => (team.members || []).map((member) => member.id));

  const seen = new Set();
  const duplicateIds = [];
  for (const id of usedIds) {
    if (seen.has(id)) duplicateIds.push(id);
    else seen.add(id);
  }

  const allSet = new Set(allIds);
  const invalidIds = usedIds.filter((id) => !allSet.has(id));
  const missingIds = allIds.filter((id) => !seen.has(id));

  const actualTeamSizes = orderedTeams.map((team) => (team.members || []).length);
  const expectedTeamCount = targetTeamSizes.length;
  const actualTeamCount = orderedTeams.length;
  const minTeamCount = expectedTeamCount;
  const maxTeamCount = expectedTeamCount + (allowTeamCountChange ? Math.max(1, remainderCount) : 0);
  const teamCountMatch = actualTeamCount >= minTeamCount && actualTeamCount <= maxTeamCount;

  const expectedSorted = [...targetTeamSizes].sort((a, b) => b - a);
  const actualSorted = [...actualTeamSizes].sort((a, b) => b - a);

  let teamSizeRuleMatch = true;
  if (remainderMode === 'spread') {
    teamSizeRuleMatch = JSON.stringify(expectedSorted) === JSON.stringify(actualSorted);
  } else if (remainderMode === 'keep_partial') {
    teamSizeRuleMatch = JSON.stringify(targetTeamSizes) === JSON.stringify(actualTeamSizes);
  } else {
    teamSizeRuleMatch = allowTeamCountChange
      ? actualTeamSizes.every((size) => Number(size) > 0)
      : JSON.stringify(expectedSorted) === JSON.stringify(actualSorted);
  }

  const ok =
    duplicateIds.length === 0 &&
    missingIds.length === 0 &&
    invalidIds.length === 0 &&
    teamCountMatch &&
    teamSizeRuleMatch;

  return {
    ok,
    totalParticipants: allIds.length,
    expectedTeamCount,
    allowTeamCountChange,
    actualTeamCount,
    expectedTeamSizes: targetTeamSizes,
    actualTeamSizes,
    duplicateCount: duplicateIds.length,
    missingCount: missingIds.length,
    invalidCount: invalidIds.length,
    teamCountMatch,
    teamSizeRuleMatch,
    duplicateIds: duplicateIds.slice(0, 8),
    missingIds: missingIds.slice(0, 8),
    invalidIds: invalidIds.slice(0, 8)
  };
};

export const buildValidationFeedback = (integrity, promptIssues = []) => {
  const messages = [];

  if (!integrity.teamCountMatch) {
    messages.push(
      `팀 개수가 맞지 않습니다. expected=${integrity.expectedTeamCount}, actual=${integrity.actualTeamCount}`
    );
  }
  if (!integrity.teamSizeRuleMatch) {
    messages.push(
      `팀 인원 분포가 맞지 않습니다. expected=${JSON.stringify(
        integrity.expectedTeamSizes
      )}, actual=${JSON.stringify(integrity.actualTeamSizes)}`
    );
  }
  if (integrity.duplicateCount > 0) messages.push(`중복 배정 id 존재: ${integrity.duplicateIds.join(', ')}`);
  if (integrity.missingCount > 0) messages.push(`누락 id 존재: ${integrity.missingIds.join(', ')}`);
  if (integrity.invalidCount > 0) messages.push(`존재하지 않는 id 사용: ${integrity.invalidIds.join(', ')}`);
  if (Array.isArray(promptIssues) && promptIssues.length > 0) {
    messages.push(`사용자 요청 미반영: ${promptIssues.slice(0, 3).join(' / ')}`);
  }

  return messages.join(' | ');
};
