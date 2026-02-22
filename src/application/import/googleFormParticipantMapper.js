import { norm } from '../../domain/shared/normalize';
import { createInternalId } from '../../domain/participants/internalId';

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
  for (const question of questionMap) {
    if (normalizedAliases.includes(norm(question.title))) return question.qid;
  }
  return null;
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

export const mapFormResponsesToParticipants = (form, responses) => {
  const questionMap = normalizeQuestionMap(form);
  const nameQid = findQuestionId(questionMap, ['\uC774\uB984', '\uC131\uBA85', 'name', 'fullname']);
  const introQid = findQuestionId(questionMap, ['\uC790\uAE30\uC18C\uAC1C', '\uC18C\uAC1C', 'intro', 'introduction']);
  const majorQid = findQuestionId(questionMap, ['\uD559\uACFC', '\uC804\uACF5', 'major', 'department']);
  const studentIdQid = findQuestionId(questionMap, ['\uD559\uBC88', 'studentid', 'studentno']);

  const list = Array.isArray(responses?.responses) ? responses.responses : [];
  let mapped = 0;
  let skipped = 0;

  const participants = list
    .map((responseItem, index) => {
      const answers = responseItem?.answers || {};
      const features = {};

      for (const question of questionMap) {
        const value = extractAnswerValue(answers[question.qid]);
        if (value) features[question.title] = value;
      }

      const respondentEmail = String(responseItem?.respondentEmail || '').trim();
      if (respondentEmail) features['\uC751\uB2F5\uC790 \uC774\uBA54\uC77C'] = respondentEmail;

      const guessedName = extractAnswerValue(answers[nameQid]) || respondentEmail || `\uCC38\uAC00\uC790-${index + 1}`;
      const intro = extractAnswerValue(answers[introQid]);
      const major = extractAnswerValue(answers[majorQid]);
      const studentId = extractAnswerValue(answers[studentIdQid]);

      mapped += 1;
      return {
        id: Date.now() + index,
        internalId: createInternalId(),
        name: guessedName,
        originalName: guessedName,
        source: 'google-form',
        features,
        intro: [
          studentId ? `\uD559\uBC88: ${studentId}` : '',
          major ? `\uD559\uACFC: ${major}` : '',
          intro ? `\uC790\uAE30\uC18C\uAC1C: ${intro}` : ''
        ]
          .filter(Boolean)
          .join('\n')
      };
    })
    .filter((participant) => {
      const hasIdentifierCandidate = participant.name || Object.keys(participant.features || {}).length > 0;
      if (!hasIdentifierCandidate) skipped += 1;
      return hasIdentifierCandidate;
    });

  return { participants, mapped, skipped };
};
