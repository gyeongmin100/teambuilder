# ? ?먮룞 諛곗젙 SaaS (TeamBuilder) 援ы쁽 ?묒뾽

## 1. 珥덇린 ?ㅼ젙
- [x] `task.md` 諛?`implementation_plan.md` ?묒꽦
- [x] ?꾩슂???쇱씠釉뚮윭由??ㅼ튂 (Lucide-react, Tailwind CSS v4, Framer-motion ??
- [x] ?꾨줈?앺듃 援ъ“ ?뺣━ (frontend -> root ?대룞)

## 2. 諛깆뿏??援ы쁽 (Cloudflare Pages Functions)
- [x] `functions/api/assign.js`: ? 諛곗젙 濡쒖쭅 諛?GPT ?곕룞 (?꾨즺)
- [x] `functions/api/checkout.js`: Polar 寃곗젣 ?몄뀡 ?앹꽦 (?꾨즺)
- [x] ? 諛곗젙 ?뚭퀬由ъ쬁 (Deterministic Algorithm) 媛쒕컻 (?꾨즺)

## 3. ?꾨줎?몄뿏??援ы쁽 (React + Vite)
- [x] ?쒕뵫 ?섏씠吏 諛??낅젰 ??(?대쫫, ??븷, ?묒뾽 ?ㅽ????? (?꾨즺)
- [x] 寃곌낵 ?쒖떆 ?섏씠吏 (? 援ъ꽦?? 諛곗젙 洹쇨굅 ?붿빟) (?꾨즺)
- [x] Polar 寃곗젣 ?곕룞 (Redirect Flow 援ы쁽) (?꾨즺)
- [x] 濡쒕뵫 諛??먮윭 ?몃뱾留?(?꾨즺)

## 4. ?듯빀 諛?諛고룷 以鍮?
- [x] 鍮뚮뱶 寃利?(Vite build ?깃났)
- [ ] ?섍꼍 蹂???ㅼ젙 (OPENAI_API_KEY, POLAR_ACCESS_TOKEN ?? - ?ъ슜???ㅼ젙 ?꾩슂
- [ ] ?ㅻ같??(Wrangler deploy)

## 5. 2026-02-19 추가 작업 (Google 로그인)
- [x] `@supabase/supabase-js` 설치
- [x] `src/App.jsx`에 Google 로그인/로그아웃 버튼 추가
- [x] Supabase 세션 감지(`getSession`, `onAuthStateChange`) 연결
- [ ] 교수용 Google Sheet 응답 가져오기(다음 작업)
- [x] Supabase Google OAuth scope 확장(`spreadsheets.readonly`)
- [x] Google Sheet URL/ID 입력 후 Sheets API로 응답 데이터 가져오기
- [x] 컬럼 자동매핑(이름/학번/학과/자기소개/선호역할/협업스타일/가능시간)
- [x] 가져온 응답을 참가자 목록에 중복 제거 후 자동 반영
- [x] 가져오기 통계/오류 메시지/재로그인 안내 UI 추가
- [x] Google Picker(시트 선택 팝업) 기능 추가
- [x] 선택한 시트 ID로 즉시 참가자 자동 가져오기 연동
- [x] Node 20 빌드로 dist 생성
- [x] Cloudflare Pages `teambuilder` 프로덕션 배포 완료
- [x] Google Picker 의존 제거
- [x] Drive API 시트 목록 직접 조회 + 클릭 선택 UI 구현
- [x] 깨진 번역 문자열/구문 오류 복구 후 빌드 통과
- [x] 프로덕션 재배포 완료 (482ea996)
- [x] App.jsx 전면 UTF-8 문자열 복구
- [x] 깨진 한글 UI 텍스트 정상화
- [x] 빌드/배포 완료 (8d54cf66)
- [x] 구글시트 선택 방식 -> 구글폼 선택 방식으로 전환
- [x] Forms API(form metadata/responses)로 참가자 매핑 구현
- [x] 프로덕션 배포 완료 (98c0f3ec)

## 6. 2026-02-19 Forms 怨좊룄???묒뾽
- [x] 吏덈Ц=?뱀꽦 ??features) 援ъ“ 諛섏쁺
- [x] ?앸퀎 湲곗? ?좏깮 UI(?쇰뵒??泥댄겕) 異붽?
- [x] ?앸퀎 湲곗? 誘몄꽑????遺꾩꽍 ?쒖옉 李⑤떒
- [x] ?뱀꽦 ?곸쐞 N媛?+ ?쇱퀜蹂닿린 UI 異붽?
- [x] assign API ?꾨＼?꾪듃??features ?ы븿
- [ ] 諛고룷 寃利?


## 7. 2026-02-19 UI/UX 고도화 작업
- [x] 입력 화면을 대시보드형으로 재구성
- [x] 참가자 테이블 검색 기능 추가
- [x] 표시 특성 수 조절 기능 추가
- [x] 전체보기 기준을 필터 결과 기준으로 개선
- [x] sticky 액션바 적용
- [x] 빌드 검증 완료

## 8. 2026-02-19 Assign 구조 리팩터링
- [x] OpenAI 호출을 참가자별 N회 -> 1회로 전환
- [x] 응답 스키마/팀 구성 검증 로직 추가
- [x] 검증 실패/AI 실패 시 기본 배정 폴백 추가
- [x] 빌드 검증 완료
- [ ] 배포 확인

## 9. 2026-02-19 페이지 리디자인 작업
- [x] 랜딩 페이지 구현
- [x] 로그인 페이지 구현
- [x] 입력 페이지 흐름 유지 + 재배치
- [x] 분석중 페이지 구현
- [x] 결과 페이지 전환 구조 개선
- [x] 빌드 검증 완료
- [ ] 배포 확인
## 10. 2026-02-20 Assign 결과 안정화 (이름 누락/검증 실패 개선)
- [x] `functions/api/assign.js` 재정리: 참가자 `name` 보존 및 단일 호출 유지
- [x] AI 응답 팀 검증 후 누락 인원 자동 보정 로직 적용
- [x] 역할(leader/supporter) 의존 출력 제거
- [x] `src/App.jsx` 결과 화면을 `name` 중심으로 단순화
- [x] CSV 내보내기 포맷을 `Team,Identifier,Analysis`로 변경
- [ ] 빌드/배포 검증

## 11. 2026-02-20 나머지 인원 배분 규칙 수정
- [x] spread 모드 팀 수를 ceil이 아닌 floor 기준으로 고정
- [x] 나머지 인원은 기존 팀에 랜덤 배정으로 변경
- [x] AI 출력이 팀 수를 초과하면 초과 팀 멤버를 기존 팀으로 재분배
- [x] 프롬프트 규칙에 spread/keep_partial 정책 명시
- [ ] 배포 검증

## 12. 2026-02-20 업로드 정책 단순화 (CSV Only)
- [x] 엑셀(xlsx/xls) 분기 제거
- [x] CSV 업로드 파서를 공통 행->참가자 매핑 로직으로 통합
- [x] 업로드 후 식별 기준 후보(feature key) 자동 갱신
- [x] UI 파일 선택 제한을 .csv로 고정
- [ ] 배포 검증

## 13. 2026-02-20 중복 식별값 허용 구조 개선
- [x] 팀배정 ID를 사용자 식별값과 분리(internalId 기반) 
- [x] 식별값 중복 시 차단 제거, 경고만 노출
- [x] 구글폼/CSV/수기 추가 참가자에 internalId 자동 생성
- [x] 수기 추가를 식별기준 선택 전에도 가능하도록 완화
- [ ] 배포 검증

## 14. 2026-02-20 열 순서 기반 식별기준 자동화
- [x] 열 순서(columnOrder) 상태 추가
- [x] 첫 번째 열 자동 식별기준 지정
- [x] 열 좌/우 이동 버튼 구현
- [x] 열 이동 시 식별기준 자동 재지정
- [x] 제외특성/테이블 표시도 열 순서 기준으로 동기화
- [ ] 배포 검증

## 15. 2026-02-20 특성(열) CRUD 및 셀 편집
- [x] 특성(열) 추가 UI/로직 구현
- [x] 특성(열) 삭제 UI/로직 구현
- [x] 식별열/일반열 셀 값을 테이블에서 직접 편집 가능하도록 구현
- [x] 구글폼/CSV/수기 추가 데이터 모두 동일한 열 관리 체계로 통합
- [ ] 배포 검증

## 16. 2026-02-20 수기 입력 메모 제거
- [x] 수기 입력 UI에서 메모 필드 제거
- [x] manualIntro 상태/로직 제거
- [x] 수동메모 feature 저장 제거
- [ ] 배포 검증

## 17. 2026-02-20 CSV 한글 깨짐 방지
- [x] CSV 업로드 시 BOM(UTF-8/UTF-16) 자동 감지
- [x] UTF-8/EUC-KR 디코딩 자동 비교 보정 로직 추가
- [x] 인코딩 자동보정 적용 시 사용자 메시지 노출
- [ ] 배포 검증

## 18. 2026-02-20 결제검증/배정안정/열 UX 최적화
- [x] /api/assign에서 checkout_id 기반 결제 완료 재검증 강제
- [x] 나머지 인원 배분 랜덤을 seed 기반으로 고정(재현 가능)
- [x] 구글폼 추가 불러오기 시 열 목록 merge 처리로 기존 열 보존
- [x] 열 순서 변경을 드래그 앤 드롭으로 지원
- [x] 식별 기준 선택 블록 제거 후 열 관리로 통합
- [ ] 배포 검증

## 19. 2026-02-20 수기 입력 UX 단순화
- [x] 인원추가 앞 입력칸 제거
- [x] 인원추가 클릭 시 빈 행 추가로 변경
- [x] 식별* 용어 제거 및 안내 문구 단순화
- [x] 열 관리 안내를 맨 앞 열을 기준으로 팀을 나눕니다.로 통일
- [ ] 배포 검증

## 20. 2026-02-20 UX 추가 단순화
- [x] KR/EN 토글 제거(현재 한글 고정 UX)
- [x] 드래그와 중복되는 열 좌/우 이동 버튼 제거
- [x] 제외할 특성 ON/OFF 토글 제거, 단일 선택 UI로 단순화
- [x] 경고 alert 다수를 인라인 메시지(setMessage)로 전환
- [x] 인원추가 버튼 명칭을 빈 행 추가로 변경
- [ ] 배포 검증

## 21. 2026-02-20 데이터 입력 UX 통합
- [x] 구글폼/CSV 업로드 기능을 데이터 가져오기 한 블록으로 통합
- [x] 지원 기능 안내 문구 추가(구글폼 연결, CSV 업로드, 빈 행 추가)
- [x] 버튼 문구 단순화(Google에서 폼 선택 -> 내 구글폼 목록)
- [x] 섹션 흐름 번호 정리(3) 열 관리, 4) 참가자 데이터)
- [ ] 배포 검증

## 22. 2026-02-21 결과 보고서 분리 구현
- [x] `functions/api/assign.js`에 `report` 생성 로직 추가
- [x] 성비 관련 사용자 프롬프트 감지 및 팀별 상태 산출
- [x] 성별 키 자동 탐지 + 팀별 성비 증거(evidence) 생성
- [x] `src/App.jsx` 결과 페이지에 전체 보고서 섹션 추가
- [x] 각 팀 카드에 "팀 편성 근거" 및 evidence 렌더링
- [x] CSV 내보내기에 `TeamReason` 컬럼 추가
- [ ] 빌드 검증
- [ ] 배포 검증

## 23. 2026-02-21 프롬프트 제약 기반 체크리스트 확장
- [x] 같은 팀/분리 조건 파서 추가
- [x] 팀 결과 대비 조건 충족 판정 로직 추가
- [x] 체크리스트를 요청된 항목만 동적 렌더용 데이터로 생성
- [x] 팀별 근거(evidence)에 조건 판정 문구 연결
- [ ] 빌드 검증
- [ ] 배포 검증

## 24. 2026-02-21 제약 엔진 1차 구현
- [x] 사용자 프롬프트 제약 구조화(AI+룰 파서) 추가
- [x] 제약 정규화 및 priority 추론 로직 추가
- [x] 사전 가능성 검사 및 불가능 수치 계산 추가
- [x] AI 누락 보정 시 하드 제약 우선 배치 로직 추가
- [x] 폴백 배정 후 min_per_team 보정 로직 추가
- [x] 결과 report 표준 필드(checklist/constraints/feasibility/warnings/actionHint) 추가
- [x] 입력 화면 프롬프트 해석 미리보기 + 실행 전 확인 다이얼로그 추가
- [x] 결과 화면 제약 상세 판정/경고 표시 추가
- [ ] 빌드 검증
- [ ] 배포 검증

## 25. 2026-02-21 제약 엔진 2차 고도화
- [x] `max_per_team` 제약 타입 파서/정규화/검증/리포트 반영
- [x] 속성 키 일반화 매칭(`resolveAttributeKey`) 추가
- [x] 하드 min/max 동시 고려 배정 타깃 선택 개선
- [x] 배정 후 max 보정 + local search 스왑 개선 추가
- [x] 미지원 제약 수집 및 report 메타/경고 노출
- [x] 회귀 테스트 스크립트(`scripts/constraints-regression.mjs`) 추가
- [x] npm 스크립트(`test:constraints`) 추가
- [x] 테스트 실행 통과
- [ ] 빌드 검증(환경 이슈로 EXIT_CODE -1073740791 지속)
- [ ] 배포 검증

## 26. 2026-02-21 제약 엔진 3차 (정성 목표 + 판단로그)
- [x] `soft_objective`, `ambiguity_note` 타입 추가
- [x] 정성 문장(다양성/유사성/분산) 룰 파서 추가
- [x] AI 제약 파서 프롬프트 확장
- [x] 정성 목표 점수 함수(`softObjectivePenalty`) 추가
- [x] 미배정 인원 배치 시 정성 목표 점수 반영
- [x] 요청 충돌/모호성 분석기 추가
- [x] report에 conflicts/ambiguities/decisionLog/interpretation 추가
- [x] 결과 화면에 충돌/모호성/자동판단로그 렌더링 추가
- [x] 회귀 테스트 스크립트 UTF-8 재작성
- [x] 테스트 실행 통과
- [ ] 빌드 검증
- [ ] 배포 검증

## 27. 2026-02-22 DDD 1차 구조 분리 (프론트 도메인/애플리케이션)
- [x] `src/App.jsx`의 폼 ID 파싱/CSV 디코딩/참가자 매핑 순수 로직 분리
- [x] `src/domain/*`에 도메인 규칙(`formId`, `internalId`, CSV 참가자 매핑, normalize) 이동
- [x] `src/application/import/*`에 외부 입력 해석 로직(CSV 디코딩, Google Form 응답 매핑) 이동
- [x] `App.jsx`를 오케스트레이션(UI + 흐름 제어) 중심으로 정리
- [ ] 빌드 검증

## 28. 2026-02-22 DDD 2차 구조 분리 (백엔드 assign 계층화)
- [x] `functions/shared/*` 공통 유틸 분리(`http`, `text`)
- [x] `functions/domain/participants/participantSanitizer.js`로 참가자 정규화 규칙 분리
- [x] `functions/domain/teams/teamFormation.js`로 팀 기본 구성/seed 랜덤 규칙 분리
- [x] `functions/infrastructure/polar/checkoutVerification.js`로 결제 검증 어댑터 분리
- [x] `functions/api/assign.js`를 import 기반 오케스트레이션 중심으로 정리
- [x] `node --check functions/api/assign.js` 통과
- [x] `npm run test:constraints` 통과
- [ ] 빌드 검증

## 29. 2026-02-22 DDD 3차 구조 분리 (제약 엔진/AI 정규화 모듈화)
- [x] `functions/domain/constraints/constraintEngine.js`로 제약 파싱/정규화/가능성 판정/리포트/OpenAI 호출 로직 분리
- [x] `functions/domain/teams/aiNormalization.js`로 AI 팀 결과 정규화/누락 인원 배치 로직 분리
- [x] `functions/api/assign.js`를 얇은 애플리케이션 오케스트레이터로 재작성
- [x] `__test__` 공개 인터페이스 유지(회귀 스크립트 호환)
- [x] `node --check` (constraintEngine, aiNormalization, assign) 통과
- [x] `npm run test:constraints` 통과
- [ ] 빌드 검증

## 30. 2026-02-22 DDD 4차 구조 분리 (constraintEngine 내부 세분화)
- [x] `functions/domain/constraints/common.js`로 공통 제약 유틸/매칭 규칙 분리
- [x] `functions/domain/constraints/parser.js`로 제약 파싱/정규화 계층 분리
- [x] `functions/domain/constraints/evaluator.js`로 가능성 판정/패널티/로컬서치 분리
- [x] `functions/domain/constraints/reporter.js`로 리포트 생성 책임 분리
- [x] `functions/domain/constraints/openaiClient.js`로 배정 OpenAI 호출 책임 분리
- [x] `functions/domain/constraints/constraintEngine.js`를 export aggregator로 단순화
- [x] `node --check` (constraints 하위 모듈 + assign) 통과
- [x] `npm run test:constraints` 통과
- [ ] 빌드 검증

## 31. 2026-02-22 빌드 비정상 종료코드 안전 조치
- [x] 원인 분리: Node 24에서는 `vite build`가 `EXIT_CODE=-1073740791`로 비정상 종료됨
- [x] 교차 검증: Node 20(`npx -p node@20 node ...`)에서는 빌드 정상 완료(`EXIT_CODE=0`)
- [x] `package.json` 빌드 스크립트를 Node 20 경로로 고정
- [x] `package.json`에 `engines.node = 20.x` 명시
- [x] `npm run build` 재검증 통과 (`EXIT_CODE=0`)

## 10. 2026-02-22 Attio 레퍼런스 디자인 작업
- [x] 메인 랜딩 페이지 디자인
- [x] 로그인 페이지 디자인
- [x] 데이터 입력 페이지 디자인
- [x] Polar 결제 대기 페이지 디자인
- [x] 결과 리포트 페이지 디자인
- [x] 공통 디자인 토큰(index.css) 재정의
- [ ] 실제 백엔드/결제 플로우와 UI 연결(후속)
- [ ] 사용자 데이터 기반 실제 리포트 연동(후속)

## 11. 2026-02-22 라우팅/실플로우 재연결
- [x] eact-router-dom 설치
- [x] BrowserRouter 적용 (src/main.jsx)
- [x] URL 경로 기반 페이지 전환(/, /login, /input, /checkout/pending, /report)
- [x] 로그인/로그아웃 시 경로 동기화
- [x] 결제 대기 -> 결제 검증 -> 결과 리포트 경로 동기화
- [x] 보호 경로 인증 가드(미로그인 시 /login 리다이렉트)
- [x] 빌드 검증 통과 (
pm run build)

## 12. 2026-02-22 번들 분할/리포트 영속화
- [x] ite.config.js manualChunks 설정으로 번들 분할
- [x] 결과 리포트(sessionStorage) 저장/복구
- [x] 로그아웃 시 리포트 캐시 삭제
- [x] 재배정 버튼에서 결과/캐시 초기화
- [x] 빌드 검증 통과 (
pm run build)

## 13. 2026-02-22 프론트 미동작 요소 정비
- [x] 정책 페이지 한글 깨짐(인코딩) 수정
- [x] 정책 페이지 KO/EN 전환 UI 추가
- [x] 정책 페이지 URL 라우팅(/legal/*, /en/legal/*) 전환
- [x] 결과 리포트 캐시 사용자 스코프 분리
- [x] /report 직진입 데이터 없음 가드 추가
- [x] /checkout/pending 무한 로딩 가드 + 복구 액션 추가
- [x] 랜딩 CTA 동작과 실제 접근 정책 정합화
- [x] 빌드 검증 통과 (
pm run build)

## 14. 2026-02-22 결제/OAuth 복귀 안정화
- [x] Polar success URL을 /checkout/pending 라우트 기반으로 수정
- [x] OAuth 세션 복원 시 불필요한 강제 /input 이동 조건 보정
- [x] 빌드 검증 통과 (
pm run build)

## 15. 2026-02-22 디자인/카피 재정렬 (노이즈 제거)
- [x] 랜딩의 불필요 설명 문구 제거
- [x] 실시간 스냅샷 섹션 제거
- [x] 랜딩 우측을 3단계 핵심 플로우 카드로 교체
- [x] 전체 UI 텍스트/에러 메시지 영문 토글 반영
- [x] ?lang=en 쿼리 동기화 구현
- [x] 로고 클릭 랜딩 이동 고정
- [x] 빌드 검증 통과 (
pm run build)

## 16. 2026-02-22 정책 문서 글로벌 스탠다드 정비 + 정책 링크 동작 안정화
- [x] 이용약관 KO/EN 전문 확장 (적용범위, 금지행위, 책임제한, 준거법, 문의)
- [x] 개인정보처리방침 KO/EN 전문 확장 (처리항목/목적/보관기간/국외이전/권리)
- [x] 환불정책 KO/EN 전문 확장 (환불 가능/불가 사유, 기한, 처리기간)
- [x] 정책 화면 언어 토글/뒤로가기 버튼 type 지정으로 폼 오작동 방지
- [x] 정책 라우트 인식 로직에 trailing slash 정규화 반영
- [ ] 배포 검증

## 17. 2026-02-22 shadcn/ui 도입 및 UI 고도화
- [x] `npx shadcn@latest init -d`로 Vite 프로젝트 초기화
- [x] `components.json`, `src/lib/utils.js`, `jsconfig.json` 생성 및 `@/*` alias 구성
- [x] `npx shadcn@latest add button card input badge table tabs separator` 적용
- [x] `tailwind.config.js`를 ESM 기준으로 정비(`tailwindcss-animate` 플러그인)
- [x] `vite.config.js` alias + ESM 경로 계산(fileURLToPath) 보강
- [x] `src/App.jsx`에 shadcn 컴포넌트 적용(헤더/랜딩 CTA/로그인/입력 폼/참가자 테이블/결과 버튼/푸터 링크)
- [x] 빌드 검증 통과 (`npm run build`)

## 18. 2026-02-22 입력 화면 정보구조 최적화 (App-like)
- [x] 랜딩 중복 CTA 제거(시작하기 단일화)
- [x] 입력 화면을 탭 구조로 분리 (데이터/규칙/검토/실행)
- [x] 검토 탭에 실행 전 체크 요약(참가자 수, 기준 열, 중복 식별값) 추가
- [x] 실행 탭에서 실행 가능 조건 가드(열/참가자 미충족 시 실행 비활성화)
- [x] 미충족 상태에서 데이터 탭 이동 버튼 제공
- [x] 빌드 검증 통과 (`npm run build`)

## 19. 2026-02-22 로그인 화면 1스크린 최적화
- [x] 로그인 2패널 레이아웃 제거
- [x] 행동 중심 단일 카드(로그인 버튼 + 랜딩 복귀)로 재구성
- [x] 로그인에서 사용하지 않는 설명 텍스트 키 제거
- [x] 입력 상단 요약 카드에서 불필요 항목(맞춤프롬프트 ON/OFF) 제거
- [x] 빌드 검증 통과 (`npm run build`)

## 20. 2026-02-22 추가 UX 안정화 (자동 탭 이동 + 실행 가드)
- [x] Google Form/CSV import 성공 시 `rules` 탭 자동 이동
- [x] 실행 전 검증 실패 시 `review` 탭 자동 이동
- [x] 검토 탭 체크 카드에 문제 항목별 탭 이동 버튼 추가
- [x] 실행 중복 클릭 방지 락(`runAssignLockRef`) 추가
- [x] OAuth/권한 오류를 사용자 친화 문구로 정규화
- [x] 빌드 검증 통과 (`npm run build`)

## 21. 2026-02-22 대량 붙여넣기 + Undo/Redo 구현
- [x] 테이블 셀에서 TSV(엑셀/시트 복사값) 대량 붙여넣기 지원
- [x] 시작 셀 기준으로 행/열 매핑하여 다중 셀 반영
- [x] 붙여넣기 범위가 현재 표시 행을 넘으면 새 참여자 행 자동 생성
- [x] Undo/Redo 스냅샷 히스토리 엔진 추가
- [x] 단축키 지원: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y
- [x] UI 버튼 지원: Undo/Redo
- [x] 주요 데이터 변경 액션을 히스토리 대상에 포함(행 편집/삭제, 열 추가/삭제, import, 제외 토글 등)
- [x] 빌드 검증 통과 (`npm run build`)

## 22. 2026-02-22 입력페이지 실행영역 하단 고정 + 안내문구 제거
- [x] 실행 버튼 블록(`결제 후 팀 배정 실행`)을 입력페이지 맨 아래 순서로 이동
- [x] 실행 전 점검 요약 블록을 입력페이지 맨 아래 순서로 이동
- [x] `데이터 불러오기와 식별 열 설정을 먼저 완료하세요.` 안내문구 렌더링 제거
- [x] 빌드 검증 통과 (`npm run build`)
