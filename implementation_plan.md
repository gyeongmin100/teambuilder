# Implementation Plan - 출력 언어를 사용자 요청 프롬프트 언어에 맞추기

## 1) 목표
- 분석/배정 결과의 출력 언어를 사용자 요청 프롬프트 언어에 자동으로 맞춘다.
- 내부 프롬프트(시스템 지시문)는 영어 기반으로 정리해 인코딩 깨짐 리스크를 낮춘다.

## 2) 범위
- 대상 파일
  - `functions/domain/constraints/openaiClient.js`
  - `functions/domain/constraints/constraintEngine.js` (호출 인터페이스 영향 시)
  - `functions/domain/assignment/engine.js` (출력 언어 전달이 필요할 경우)
  - `functions/api/assign.js` (입력/출력 계약 영향 시)

## 3) 설계 원칙
- 출력 언어 결정 기준
  - 사용자 `customPrompt` 언어를 그대로 따른다.
- 혼합 언어 입력 처리
  - 감지 불가/혼합일 때만 fallback 언어(`ko`)를 사용한다.
- LLM 지시문 정책
  - 시스템 프롬프트는 영어 유지
  - 마지막 출력 규칙만 동적으로 주입
    - 예: `Final answer language: Korean` 또는 `English`

## 4) 세부 작업 계획
### 4.1 언어 감지 유틸 도입
- 작업
  - `customPrompt` 문자열 기준 간단 언어 감지 함수 추가
  - 반환값: `ko | en | unknown`
- 규칙
  - 한글 비율이 높으면 `ko`
  - 영문 비율이 높으면 `en`
  - 둘 다 애매하면 `unknown`

### 4.2 출력 언어 결정 로직 추가
- 작업
  - `resolveOutputLanguage(customPrompt)` 함수 도입
  - `unknown`일 때만 fallback 정책 적용
- 확정 정책
  - 기본: 사용자 프롬프트 언어
  - fallback 기본값: `ko`

### 4.3 OpenAI 호출부 인터페이스 확장
- 작업
  - `callOpenAI(systemPrompt, userPrompt, env, outputLanguage)` 형태로 확장
  - `callExtract`, `callAnalyze`, `callAssign`에 `outputLanguage` 전달
- 출력 규칙
  - 시스템 지시문 말미에 출력 언어 강제 문구 추가

### 4.4 프롬프트 텍스트 정리(인코딩 안정화)
- 작업
  - 깨진 문자열(모지바케) 정리
  - 영어/ASCII 중심으로 시스템 지시문 재작성
- 목적
  - 배포 환경별 인코딩 차이로 인한 프롬프트 손상 방지

### 4.5 API 경계 정리
- 작업
  - 서버 내부에서 출력 언어를 계산해 LLM 호출에 전달
- 비목표
  - 프론트 UI 구조 변경은 이번 범위에서 제외

### 4.6 랜딩 헤드라인 줄바꿈 고정
- 작업
  - 메인 카피가 `AI가 설계하는 데이터 기반 팀 빌딩까지.`로 한 줄 단위로 유지되도록 렌더링 구조 조정
  - `팀`과 `빌딩`이 서로 다른 줄로 찢어지지 않도록 줄바꿈 정책 적용
- 구현 방향
  - 헤드라인 2줄 고정 렌더링(의도한 줄바꿈만 허용)
  - 필요 시 `whitespace-nowrap` 또는 `&nbsp;`로 결합 단어 보호

## 5) 검증 계획
- 기능 검증
  - 케이스 A: 한글 프롬프트 입력 -> 체크리스트/설명 한국어 출력
  - 케이스 B: 영어 프롬프트 입력 -> 체크리스트/설명 영어 출력
  - 케이스 C: 혼합 프롬프트 입력 -> fallback 언어 출력
- 안정성 검증
  - `npm run build` 통과
  - Pages Functions 번들링 통과
- 회귀 검증
  - 랜덤 배정(프롬프트 없음) 기존 동작 유지
  - AI 3단계 배정 결과 JSON 스키마 유지

## 6) 리스크 및 대응
- 리스크
  - 언어 감지 오판으로 출력 언어가 기대와 다를 수 있음
- 대응
  - fallback 정책 고정
  - 로그에 감지 결과 기록(디버그 레벨)

## 7) 반영 순서
1. 언어 감지/결정 유틸 추가
2. OpenAI 호출 인터페이스 확장
3. 시스템 프롬프트 언어 지시 분리
4. 인코딩 깨진 프롬프트 정리
5. 빌드/함수 번들링 검증
6. 배포 후 실사용 케이스 점검
