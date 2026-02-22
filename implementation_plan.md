# Implementation Plan - TeamBuilder

## 1. 媛쒖슂
`?꾩씠?붿뼱.md`瑜?諛뷀깢?쇰줈 ?ъ슜?먭? ?낅젰??鍮꾩젙???곗씠?곕? GPT濡?遺꾩꽍?섍퀬, ?뺥빐吏?洹쒖튃???곕씪 ????먮룞 諛곗젙?섎뒗 SaaS瑜?援ы쁽?⑸땲?? `3二쇱감_aistylist`???꾪궎?띿쿂(Cloudflare Pages + React + OpenAI + Polar)瑜?怨꾩듅?⑸땲??

## 2. 湲곗닠 ?ㅽ깮
- **Frontend:** React 19 (Vite), Tailwind CSS, Lucide React
- **Backend:** Cloudflare Pages Functions
- **AI:** OpenAI GPT-4o-mini (?띿뒪???뺢퇋??諛??ㅽ궎留?異붿텧)
- **Payment:** Polar.sh (SaaS ?섏씡??

## 3. ?듭떖 湲곕뒫 ?곸꽭
### 3.1 ?띿뒪???뺢퇋??(GPT)
- ?ъ슜?먯쓽 ?먯쑀 ?쒖닠???뚭컻湲??遺꾩꽍?섏뿬 ?ㅼ쓬 ??ぉ 異붿텧:
  - ?좏샇 ??븷 (由щ뜑, 遺꾩꽍, ?ㅽ뻾, 諛쒗몴 ??
  - ?묒뾽 ?ㅽ???(吏곸꽕?? ?고쉶?? 留덇컧 以묒떆 ??
  - ?숇젴??湲곗닠 ?ㅽ깮

### 3.2 ? 諛곗젙 ?뚭퀬由ъ쬁 (Deterministic)
- ?숈씪???낅젰???????긽 ?숈씪??寃곌낵瑜?蹂댁옣?섎룄濡??쒕쾭 痢?JavaScript濡?援ы쁽.
- **諛곗젙 ?먯튃:**
  1. ????몄썝???쒗븳 以??
  2. ??븷 洹좏삎 理쒖쟻??(?留덈떎 由щ뜑/諛쒗몴??理쒖냼 1紐낆뵫 諛곗튂).
  3. ?깊뼢 ?ㅼ뼇???좎궗???ㅼ젙???곕Ⅸ 媛以묒튂 遺??
  4. ?쒖빟 ?ы빆 泥섎━ (?뱀젙 ?몄썝 遺꾨━/寃고빀).

### 3.3 UI/UX
- ?④퀎蹂??낅젰 ??(?ㅻЦ吏 ?뺥깭).
- ?ㅼ떆媛?泥섎━ ?곹깭 ?몃뵒耳?댄꽣.
- ?쒓컖?붾맂 ? 援ъ꽦 寃곌낵 諛?PDF/Excel ?대낫?닿린 湲곕뒫(異뷀썑 ?뺤옣 怨좊젮).

## 4. ?④퀎蹂??묒뾽 怨꾪쉷
1. **?섍꼍 援ъ텞:** `frontend` ?대뜑 ?댁쓽 ?뚯씪??猷⑦듃濡??대룞?섍굅??援ъ“瑜??듭씪?섍퀬, ?꾩슂???⑦궎吏瑜??ㅼ튂?⑸땲??
2. **諛깆뿏??濡쒖쭅 援ы쁽:** `functions/api/assign.js`瑜??묒꽦?섏뿬 GPT ?꾨＼?꾪듃 ?ㅺ퀎 諛?諛곗젙 ?뚭퀬由ъ쬁??援ы쁽?⑸땲??
3. **?꾨줎?몄뿏??UI 媛쒕컻:** ?ㅻЦ ?낅젰 ?쇨낵 寃곌낵 ??쒕낫?쒕? 留뚮벊?덈떎.
4. **寃곗젣 ?곕룞:** Polar SDK/API瑜??ъ슜?섏뿬 ?좊즺 湲곕뒫???쒗븳?섍굅??寃곗젣 ?좊룄 濡쒖쭅??異붽??⑸땲??
5. **寃利?諛??대━??** ?ㅼ뼇???쒕굹由ъ삤濡?? 諛곗젙???뚯뒪?명븯怨?UI瑜??ㅻ벉?듬땲??

## 5. 2026-02-19 Google Login Scope
- Supabase Google OAuth 로그인 버튼 추가
- 로그인 세션 감지 및 로그아웃 동작 추가
- 패키지 의존성 `@supabase/supabase-js` 추가
- 다음 단계: 교수 계정의 Google Sheet 응답 목록/선택/가져오기 UI 구현
- Google OAuth scope를 `spreadsheets.readonly`로 확장하여 교수 계정 시트 읽기 지원
- 입력 화면에 Google Sheet URL/ID 기반 Import 블록 추가
- Sheets API 메타데이터/값 조회 후 헤더 별칭 매핑으로 참가자 데이터 자동 생성
- 중복 참가자 제거, 매핑/스킵 통계 노출, 권한 토큰 누락 시 재로그인 가이드 제공
- Google Picker API 연동으로 URL 붙여넣기 없이 시트 선택 가능하도록 개선
- Cloudflare Pages 프로젝트 `teambuilder`에 프로덕션 배포 완료 (deployment id: 379bd820-22c2-43e1-9aae-a5c6a13aacd5)
- Google Picker key 오류를 회피하기 위해 Drive API 기반 시트 목록 선택 방식으로 구조 변경
- 손상된 App.jsx 문자열 구문 복구(번역 블록, CSV 컬럼 키, 헤더 버튼/통계 문자열)
- Cloudflare Pages 프로덕션 배포 완료: 482ea996-01ee-4c5a-9585-abf125ae9583
- 한글 깨짐 이슈를 해결하기 위해 App.jsx를 UTF-8 기준으로 재작성
- Google 시트 불러오기/팀배정 핵심 플로우 유지 상태로 배포
- 프로덕션 배포: 8d54cf66-c63d-44cd-bd2c-5f853e02787f
- 연결 대상 전환: Google Sheet 선택에서 Google Form 선택으로 변경
- Forms API 기반 응답 파싱 로직 추가(이름/학번/학과/자기소개 매핑)
- 배포: 98c0f3ec-4079-4ae6-87c4-cb6977eae61c

## 6. 2026-02-19 Forms 怨좊룄???앸퀎 湲곗?/?뱀꽦 ??
- Google Form 吏덈Ц???먮룞?쇰줈 ?뱀꽦 ??features)濡????- 援먯닔(?ъ슜??媛 ?앸퀎 湲곗?(?대쫫/?숇쾲/?щ쾲/?대찓??????吏곸젒 泥댄겕?섎룄濡?UI 異붽?
- ?앸퀎 湲곗? 誘몄껜????? 諛곗젙 ?ㅽ뻾 李⑤떒
- 李멸??먮퀎 ?뱀꽦? ?곸쐞 4媛쒕쭔 癒쇱? ?몄텧?섍퀬 "?쇱퀜蹂닿린"濡??꾩껜 ?뺤씤 媛??- 湲?吏덈Ц紐??듬?? 留먯쨪??泥섎━濡?媛?낆꽦 ?좎?
- 諛깆뿏??assign API?먯꽌 features瑜?GPT ?낅젰?쇰줈 ?ъ슜?섎룄濡?媛쒖꽑

## 7. 2026-02-19 UI/UX 怨좊룄??- ?鍮뚮뵫 ??쒕낫??移대뱶(李멸??????앸퀎湲곗?/?꾨＼?꾪듃 ?곹깭/吏꾪뻾 ?곹깭) 異붽?
- ?곗씠??遺덈윭?ㅺ린/??ㅼ젙/?앸퀎湲곗? ?낅젰 援ъ뿭 ?щ같移섎줈 ?묒뾽 ?쒖꽌 紐낇솗??- 李멸????쒖뿉 寃??湲곕뒫 異붽?
- 李멸??????쒖떆 ?뱀꽦(?? ??議곗젅 湲곕뒫 異붽?
- ?섎떒 ?≪뀡 ?곸뿭??sticky 泥섎━?섏뿬 湲?紐⑸줉?먯꽌???ㅽ뻾 踰꾪듉 ?묎렐??媛쒖꽑

## 8. 2026-02-19 Assign 援ъ“ 由ы뙥?곕쭅 (Subrequest ?쒗븳 ???
- 李멸??먮퀎 ?ㅼ쨷 OpenAI ?몄텧 ?쒓굅
- 李멸????꾩썝???⑥씪 OpenAI ?붿껌?쇰줈 泥섎━ (??븷 異붿텧 + ?諛곗젙 ?숈떆 ?섑뻾)
- OpenAI ?묐떟 寃利??꾨씫/以묐났/? ?ш린 洹쒖튃) ?ㅽ뙣 ??deterministic 諛곗젙?쇰줈 ?먮룞 ?대갚
- ?낅젰 ?곗씠???뺤텞(?뚭컻/?뱀꽦 湲몄씠 ?쒗븳)?쇰줈 ?좏겙 ?덉젙??- Cloudflare Too many subrequests 洹쇰낯 李⑤떒

## 9. 2026-02-19 ?섏씠吏 援ъ“ 由щ뵒?먯씤 (?쒕뵫/濡쒓렇???낅젰/遺꾩꽍/寃곌낵)
- Motion 湲곕컲 ?섏씠吏 ?꾪솚(AnimatePresence) 異붽?
- ?쒕뵫 ?섏씠吏 ?좉퇋 援ъ꽦(媛移??쒖븞/CTA/?좊ː 移대뱶)
- 濡쒓렇???섏씠吏 遺꾨━(?쒕뵫 -> 濡쒓렇??-> ?낅젰 ?먮쫫)
- 遺꾩꽍以??꾩슜 ?섏씠吏(濡쒕뵫 紐⑥뀡/?곹깭 ?덈궡)
- 寃곌낵 ?섏씠吏 紐⑥뀡 ?꾪솚 諛??ъ떎???숈꽑 ?뺣━

## 10. 2026-02-20 Root Cause Fix Plan (AI fallback overuse / missing names)
- Problem 1: Result cards expected m.name, but server-side transformation could lose direct name linkage in prior flow.
- Problem 2: Validation path tended to fall back too aggressively, so AI result quality looked degraded.
- Fix 1: Keep stable identifier + display name in assign pipeline and always return member name.
- Fix 2: Normalize AI teams, deduplicate member IDs, then auto-fill unassigned members before fallback.
- Fix 3: Remove role-centric rendering from result/CSV so output matches current product requirement.
- Verification:
  - npm run build succeeds
  - /api/assign response includes teams[].members[].name
  - Result page renders participant names consistently

## 11. 2026-02-20 Remainder Distribution Policy Fix
- Goal: spread 모드는 팀 수를 loor(total/teamSize)로 고정하고 나머지만 기존 팀에 추가한다.
- Why: 기존 로직의 ceil 기반 분배는 사용자가 의도한 기존 팀에만 나머지 배분과 다름.
- Changes:
  - Fallback 배정에서 spread 전용 팀 생성 규칙 분리
  - AI 결과 정규화에서 spread 모드 시 초과 팀 제거 후 멤버 재분배
  - 누락 인원 보정 시 spread는 항상 기존 팀 랜덤 추가
  - 프롬프트에 spread/keep_partial 정책을 명확히 전달
- Verification:
  - 예시 50명, 4명 => 12개 팀 + 2명 랜덤 추가(새 팀 없음)

## 12. 2026-02-20 CSV Only Upload Strategy
- Decision: 정확도/안정성 우선으로 파일 업로드를 CSV 단일 경로로 고정.
- Reason:
  - 파싱 경로가 1개면 장애 지점이 줄어듦
  - 사용자 안내/테스트 케이스가 단순해짐
  - 인코딩 이슈(한글) 대응을 CSV 기준으로 집중 가능
- Applied:
  - xlsx 의존 제거
  - 업로드 핸들러를 CSV 전용으로 단순화
  - 행 데이터를 features 중심 구조로 변환해 기존 팀빌딩 플로우와 동일하게 연결

## 13. 2026-02-20 Identifier Collision Safe Plan
- Problem: 이름/학번/사번 등 사용자 식별값은 중복될 수 있어 기존 id=식별값 모델과 충돌.
- Principle: 표시용 식별값과 시스템 배정용 키를 분리.
- Applied Design:
  - 입력 단계에서 각 참가자에 internalId(고유값) 생성
  - assign API는 internalId로만 팀 배정
  - 사용자 식별값 중복은 허용, UI에서 경고만 표시
  - 수기 참가자 추가는 식별 기준 선택 이전에도 허용
- Effect: 실데이터 중복 상황에서도 배정 실패 없이 안정적으로 처리

## 14. 2026-02-20 Column-first Identifier UX
- Goal: 첫 번째 열을 식별기준으로 자동 인식하고, 사용자가 열 이동으로 기준을 결정할 수 있게 함.
- Applied:
  - columnOrder 상태 도입
  - 데이터 키 변경 시 columnOrder 자동 동기화
  - selectedIdentifierKey를 columnOrder[0]으로 강제 동기화
  - 식별 기준 UI를 라디오 선택 -> 열 이동 컨트롤로 전환
  - 제외 특성 및 테이블 컬럼 계산도 columnOrder 기반으로 전환
- Effect: 사용자가 직관적으로 맨 앞 열=식별기준 규칙을 제어 가능

## 15. 2026-02-20 Feature Column CRUD Plan
- Goal: 행(참가자)뿐 아니라 열(특성)도 사용자가 직접 추가/삭제/편집 가능하게 확장.
- Applied:
  - 새 특성명 입력 후 열 추가(addFeatureColumn)
  - 기존 열 삭제(removeFeatureColumn), 참가자 feature 객체에서도 동기 삭제
  - 테이블 셀 인라인 편집(updateParticipantFeature) 도입
  - 식별열(첫 열)도 입력 셀로 편집 가능
- Coverage: 구글폼/CSV/수기 입력 후 동일한 열 관리 인터페이스에서 후편집 가능

## 16. 2026-02-20 Manual Input Simplification
- Goal: 수기 등록에서 불필요한 메모 입력을 제거해 입력 부담과 혼란을 줄임.
- Applied: manualIdentifier 단일 입력만 유지, manualIntro/수동메모 관련 상태 및 저장 제거.
- Effect: 수기 등록 흐름이 핵심값 입력 중심으로 단순화됨.

## 17. 2026-02-20 Korean CSV Encoding Safety
- Problem: 한글 CSV가 UTF-8이 아닐 때(예: EUC-KR/CP949) 글자 깨짐 발생.
- Applied:
  - 파일 바이트에서 BOM(UTF-8/UTF-16LE/UTF-16BE) 우선 감지
  - BOM이 없으면 UTF-8과 EUC-KR 디코딩 결과를 품질 점수로 비교
  - 더 자연스러운 결과를 자동 채택하고 보정 여부를 안내 메시지로 표시
- Effect: 한국어 CSV 업로드 시 깨짐 가능성을 크게 낮춤

## 18. 2026-02-20 Paid Guard + Seeded Allocation + Drag UX
- Payment Guard: assign API가 checkout_id를 서버에서 Polar 재검증 후에만 실행되도록 변경.
- Deterministic Random: spread 모드 랜덤 배분을 seed 기반 RNG로 전환해 재현 가능성 확보.
- Data Merge: Google Form 추가 import 시 식별/특성 열 목록을 덮어쓰지 않고 병합.
- UX Simplification:
  - 식별 기준 선택 별도 카드 제거
  - 열 관리 카드에서 첫 열=식별열 규칙 + 드래그 재정렬 + 좌우 이동 + 삭제 통합
- Effect: 결제 우회 차단, 운영 디버깅 용이성 향상, 사용자 조작 흐름 단순화.

## 19. 2026-02-20 Row-first Input UX
- Goal: 값을 먼저 입력하게 하는 흐름을 제거하고, 행 추가 -> 표에서 입력 흐름으로 단순화.
- Applied:
  - manualIdentifier 입력 UI 제거
  - addEmptyParticipantRow 도입(버튼 클릭 시 빈 참가자 행 생성)
  - 식별/식별값 용어 제거, 안내를 맨 앞 열을 기준으로 팀을 나눕니다.로 통일
- Effect: 초보 사용자 기준 입력 동선 단축, 용어 혼동 최소화.

## 20. 2026-02-20 Interaction Simplification Pass
- Goal: 조작 포인트를 줄여 입력 실수와 학습 비용을 낮춤.
- Applied:
  - 언어 토글 제거(현재 제품 문구는 한국어 단일 운영)
  - 열 이동 UI를 드래그 중심으로 정리(중복 화살표 버튼 제거)
  - 특성 제외 기능을 단일 체크 UI로 고정(ON/OFF 토글 제거)
  - 다수 alert를 setMessage 기반 인라인 안내로 전환
  - 빈 행 추가 용어로 행동 의도 명확화
- Effect: 화면 내 결정 지점 감소, 흐름 단순화, 오해 가능성 축소.

## 21. 2026-02-20 Unified Data Intake UX
- Goal: 동일 목적(참가자 데이터 입력) 기능인 Google Form/CSV를 한 위치에서 제공해 탐색 비용 감소.
- Applied:
  - 데이터 가져오기 섹션으로 Google Form + CSV 업로드 통합
  - 기능 가이드 문구를 섹션 상단에 명시
  - 섹션 레이블/버튼 명칭을 사용자 언어로 단순화
  - 단계 번호를 팀 설정 -> 데이터 가져오기 -> 열 관리 -> 참가자 데이터로 정렬
- Effect: 사용자가 어떤 입력 방법을 써야 하는지 즉시 이해 가능.

## 22. 2026-02-21 결과 보고서 분리 (팀별 근거 + 전체 요약)
- Goal: 팀 카드의 단문 분석 누락 문제를 제거하고, 사용자 프롬프트 반영 근거를 팀 단위로 항상 노출.
- Applied Design:
  - /api/assign 응답에 `report` 객체 추가
  - report.summary: 전체 팀 구성 요약
  - report.checklist: 사용자 요구사항(예: 성비) 반영 상태
  - report.teamReports[]: 팀별 편성 사유 + 근거(evidence) 목록
- Backend Rules:
  - AI가 analysis를 비워도 서버가 팀별 reason을 강제 생성
  - 성별 키 자동 탐지(성별/gender/sex/남녀) 후 팀별 성비 분포 계산
  - 성비 요청 여부를 customPrompt에서 감지하고 적용/부분충족/검증불가 상태 산출
- Frontend Rendering:
  - 결과 페이지 상단에 전체 보고서 카드 추가
  - 각 팀 카드에 "팀 편성 근거" 박스 + evidence 라인 표시
  - CSV 내보내기에 TeamReason 컬럼 추가
- Verification Plan:
  - npm run build 통과
  - /api/assign 응답에 report 포함 확인
  - 결과 화면에서 모든 팀에 팀 편성 근거가 표시되는지 확인

## 23. 2026-02-21 사용자 프롬프트 제약 기반 체크리스트 확장
- Goal: 체크리스트에 성비만 고정 노출하지 않고, 프롬프트에서 요청된 제약만 표시.
- Applied:
  - 같은 팀 제약 파싱: "A와 B 같은 팀", "A,B 같은 팀", "A and B same team"
  - 분리 제약 파싱: "A와 B 분리", "A,B 다른 팀", "A and B different/separate team"
  - 제약별 판정: 충족 / 미충족 / 검증 불가
  - 체크리스트 항목은 요청된 제약만 동적 생성
  - 팀별 evidence에 관련 제약 판정 문구 연결
- Notes:
  - 이름 중복/미매칭 시 해당 제약은 검증 불가로 처리
  - 제약이 없으면 "검증 가능한 제약 조건 없음" 요약만 표시

## 24. 2026-02-21 제약 엔진 1차 구현 (AI 해석 + 서버 판정)
- Goal: 사용자 프롬프트를 구조화한 제약으로 변환하고, 서버에서 가능성 판정/최선안 배정을 수행.
- Applied:
  - `assign.js`에 제약 스키마 파서 추가(AI 파서 + 룰 기반 파서 병행)
  - 제약 정규화(`same_team`, `separate_team`, `min_per_team`, `balance`) 및 priority 추론
  - 사전 가능성 검사(`satisfied`, `impossible`, `not_verifiable`) + 수치 근거 포함
  - AI 팀안의 누락 인원 보정 시 제약 점수 반영(하드 min_per_team 우선)
  - AI 실패 폴백에도 동일 제약 보정 적용
  - 결과 report에 checklist/constraints/feasibility/warnings/actionHint 표준 반환
- Frontend:
  - 프롬프트 해석 미리보기 블록 추가
  - 실행 직전 confirm으로 해석 결과 확인 후 진행
  - 결과 보고서에 불가능 경고/warnings/제약 상세 판정 노출
  - CTA를 "프롬프트 수정 후 다시 배정"으로 변경

## 25. 2026-02-21 제약 엔진 2차 고도화 (일반화 + 로컬탐색 + 회귀테스트)
- Goal: 1차 제약 엔진의 성별 편향/휴리스틱 한계를 줄이고, 정확도 우선으로 배정 품질을 향상.
- Applied:
  - `max_per_team` 타입 지원 추가(파싱/정규화/가능성검사/사후판정)
  - 속성 키 해석 일반화(`resolveAttributeKey`)로 성별 외 열도 매칭 가능
  - 하드 max/min 제약을 함께 고려한 미배정 인원 타깃 팀 선택 보강
  - 배정 후 `enforceMaxPerTeamConstraints` + `localSearchImprove`(스왑 탐색) 적용
  - 미지원 제약(unsupported) 수집 및 report 경고/메타 반영
  - 테스트 훅(`__test__`) 노출 및 `scripts/constraints-regression.mjs` 추가
  - npm 스크립트 `test:constraints` 추가
- Verification:
  - node --check functions/api/assign.js 통과
  - npm run test:constraints 통과

## 26. 2026-02-21 제약 엔진 3차 (정성 목표 최적화 + 모호성/충돌 리포트)
- Goal: 사용자 자유 프롬프트의 정성 요청까지 실제 배정 점수에 반영하고, 모호/충돌을 결과에 명시.
- Applied:
  - 제약 타입 확장: `soft_objective`, `ambiguity_note` 지원
  - 룰 파서 확장: 다양성/유사성/분산 정성 문장을 `soft_objective`로 구조화
  - AI 파서 지시 확장: 정성목표/모호성 노트를 JSON으로 보존
  - 점수 엔진 확장: `softObjectivePenalty`로 정성 목표를 패널티 함수에 반영
  - 배정 보정 확장: 미배정 인원 배치 시 soft objective 점수까지 동시 고려
  - 일관성 분석기 추가: 요청 충돌(same vs separate), 모호성(raw/ambiguity) 자동 수집
  - 결과 보고서 확장: `conflicts`, `ambiguities`, `decisionLog`, `interpretation` 필드 추가
  - 프론트 결과 화면에 충돌/모호성/자동 판단 로그 렌더링 추가
  - 회귀 테스트 스크립트 UTF-8 재작성 및 soft objective 케이스 추가
- Verification:
  - `npm.cmd run test:constraints` 통과

## 27. 2026-02-22 DDD 1차 리팩터링 계획/적용
- Goal: 거대한 `App.jsx`의 도메인 규칙/입력 해석 로직을 분리해 유지보수 가능한 계층 구조로 전환.
- DDD 계층 분리:
  - Domain:
    - `src/domain/forms/formId.js` (Google Form ID 식별 규칙)
    - `src/domain/participants/internalId.js` (참가자 내부 식별자 생성 규칙)
    - `src/domain/participants/csvParticipantMapper.js` (CSV row -> Participant 엔티티 매핑 규칙)
    - `src/domain/shared/normalize.js` (도메인 공통 정규화 규칙)
  - Application:
    - `src/application/import/csvTextDecoder.js` (CSV 인코딩 감지/디코딩 유스케이스)
    - `src/application/import/googleFormParticipantMapper.js` (Google Form 응답 -> Participant 변환 유스케이스)
  - Presentation:
    - `src/App.jsx`는 사용자 인터랙션/흐름 제어 오케스트레이션에 집중
- Verification:
  - 프론트 빌드 통과로 import path/함수 시그니처/런타임 참조 안정성 확인

## 28. 2026-02-22 DDD 2차 리팩터링 계획/적용 (assign 계층화)
- Goal: 거대 `functions/api/assign.js`에서 도메인 규칙과 인프라 의존을 분리해 변경 충격을 줄인다.
- Applied:
  - Shared:
    - `functions/shared/text.js` (`parseJsonSafe`, `trimText`, `norm`)
    - `functions/shared/http.js` (`jsonResponse`)
  - Domain:
    - `functions/domain/participants/participantSanitizer.js` (`compactParticipant`, `ensureUniqueIds`)
    - `functions/domain/teams/teamFormation.js` (`createSeededRandom`, `pickRandomIndex`, `createSpreadTeams`, `buildBaseTeams`, `annotateTeams`)
  - Infrastructure:
    - `functions/infrastructure/polar/checkoutVerification.js` (`verifyPaidCheckout`)
  - API(Application Orchestration):
    - `functions/api/assign.js`는 제약 해석/최적화 오케스트레이션 중심으로 유지
    - 분리된 모듈 import 기반으로 책임 경계 명확화
- Verification:
  - `node --check functions/api/assign.js` 통과
  - `npm run test:constraints` 통과
  - `npm run build`는 기존과 동일하게 transform 완료 후 환경종료코드 `-1073740791`

## 29. 2026-02-22 DDD 3차 리팩터링 계획/적용 (제약 엔진 분해)
- Goal: `assign.js` 내부 핵심 복잡도(제약 엔진 + AI 팀 정규화)를 도메인 모듈로 분리해 유지보수성과 테스트 독립성을 높인다.
- Applied:
  - Domain/Constraints:
    - `functions/domain/constraints/constraintEngine.js`
    - 포함 범위: 제약 파싱(rule+AI), 정규화, 가능성 평가, 패널티/로컬서치, 리포트 생성, OpenAI 호출 래퍼
  - Domain/Teams:
    - `functions/domain/teams/aiNormalization.js`
    - 포함 범위: AI 팀 출력 정규화, 누락 인원 타깃 팀 배치
  - API(Application):
    - `functions/api/assign.js`는 입력 검증/유스케이스 오케스트레이션/응답 포맷만 담당
    - `__test__` 계약은 기존 키를 그대로 재노출
- Verification:
  - `node --check functions/domain/constraints/constraintEngine.js` 통과
  - `node --check functions/domain/teams/aiNormalization.js` 통과
  - `node --check functions/api/assign.js` 통과
  - `npm run test:constraints` 통과
  - `npm run build`는 기존과 동일하게 transform 완료 후 종료코드 `-1073740791`

## 30. 2026-02-22 DDD 4차 리팩터링 계획/적용 (constraintEngine 내부 세분화)
- Goal: 제약 엔진 내부 결합도를 줄이기 위해 parser/evaluator/reporter/openaiClient 계층으로 분리.
- Applied:
  - `functions/domain/constraints/common.js`
    - 우선순위/속성키 해석/성별 추론/값 매칭 등 공통 규칙
  - `functions/domain/constraints/parser.js`
    - AI 제약 파서 호출, 룰 파서, normalize, unsupported 수집
  - `functions/domain/constraints/evaluator.js`
    - feasibility, min/max 보정, soft objective 패널티, local search, 판정 요약
  - `functions/domain/constraints/reporter.js`
    - assignment report 생성 전담
  - `functions/domain/constraints/openaiClient.js`
    - 팀 배정 OpenAI 프롬프트 빌드/호출 전담
  - `functions/domain/constraints/constraintEngine.js`
    - 외부 공개 계약용 re-export aggregator
- Compatibility:
  - `functions/api/assign.js` import 경로 유지
  - `__test__`가 참조하는 공개 함수 계약 유지
- Verification:
  - `node --check` (constraints 하위 모듈, `assign.js`) 통과
  - `npm run test:constraints` 통과
  - `npm run build`는 기존과 동일하게 transform 완료 후 `EXIT_CODE=-1073740791`

## 31. 2026-02-22 빌드 종료코드 이슈 원인 고정 및 안전 조치
- Symptom:
  - `vite build` 실행 후 transform 완료에도 `EXIT_CODE=-1073740791` 비정상 종료.
- Root cause:
  - 현재 환경(Node v24.12.0)과 Vite/esbuild 조합에서 프로세스가 비정상 종료.
  - 동일 코드베이스를 Node 20으로 실행하면 정상 종료 확인.
- Applied fix (safe, low-risk):
  - `package.json`의 `build` 스크립트를 Node 20 실행 경로로 고정:
    - `npx -p node@20 node node_modules/vite/bin/vite.js build`
  - `engines.node`를 `20.x`로 명시해 런타임 기대 버전 고정.
- Verification:
  - `npm run build` => `EXIT_CODE=0` 확인
  - 출력 아티팩트(dist) 정상 생성 확인
- Notes:
  - 첫 실행 시 `node@20` 설치 경고가 뜰 수 있으나, 이후 동일 경로에서 안정적으로 재사용됨.

## 10. 2026-02-22 Attio Reference Multi-Page Design
- Reference direction: Attio + Mobbin web app visual density and data-first cards
- Scope: Main landing, login, data input, Polar payment pending, result report pages
- Build approach: React single-shell multi-page preview with motion transitions
- Design system: neutral base palette, panel/card hierarchy, expressive typography, responsive layout
- Validation: local production build pass (npm run build)


## 11. 2026-02-22 URL Routing + Real Flow Reconnect
- Objective: keep multi-page UX while restoring real login/import/payment/report runtime behavior
- Added dependency: react-router-dom
- Routing paths: /, /login, /input, /checkout/pending, /report`r
- Integration: OAuth login redirect path, payment pending path, payment verification -> report path
- Guard: unauthenticated access to protected pages redirects to /login`r
- Validation: local production build pass (npm run build)

## 12. 2026-02-22 Bundle Split + Report Persistence
- Build optimization: Vite manualChunks for react/ui/data/vendor separation
- Result persistence: store teams/report in sessionStorage and restore on refresh
- UX safety: clear cached report on logout and when starting re-assignment
- Validation: local production build pass with split chunks (all < 500k warning threshold)

## 13. 2026-02-22 Frontend Dead-UI Remediation
- Replaced broken legal-policy text with UTF-8 compliant KO/EN content
- Migrated policy screens from local state to routable pages: /legal/*, /en/legal/*`r
- Added language toggle for policy pages and footer link language consistency
- Fixed report cache risk by scoping cache key by user id (or anon partition)
- Added report-route guard: /report without data now redirects to /input`r
- Added checkout-pending guard and fallback UI to prevent indefinite spinner state
- Updated landing CTA behavior to align with public demo flow (/input direct)
- Validation: local production build pass (
pm run build)

## 14. 2026-02-22 Callback Reliability Hardening
- Polar success_url changed from root query return to dedicated pending route: /checkout/pending?checkout_success=true&checkout_id={CHECKOUT_ID}`r
- Auth session restore navigation refined to avoid forced redirect from non-login/landing routes
- Validation: local production build pass (
pm run build)

## 15. 2026-02-22 Attio-style Full UX Refine (Noise Reduction)
- Removed non-essential landing copy and snapshot blocks that did not contribute to user task completion
- Replaced landing right panel with a concise 3-step action flow (Import -> Set rules -> Confirm)
- Expanded language handling to whole UI text and status/error feedback with ?lang=en sync
- Added persistent brand click behavior to route back to landing from any page
- Validation: local production build pass (
pm run build)

## 16. 2026-02-22 Legal Standardization + Route Hardening
- Goal:
  - 정책 페이지가 "클릭해도 아무 화면이 안 뜨는" 체감 문제를 제거하고, 글로벌 서비스 기준의 정책 문서 본문을 제공.
- Applied:
  - `src/LegalPages.jsx` 전면 교체
    - 이용약관/개인정보처리방침/환불정책 KO/EN 전문 작성
    - Last Updated 및 법률 문의 이메일 명시
    - 언어 전환/뒤로가기 버튼 `type="button"` 명시
  - `src/App.jsx` 라우트 정규화 보강
    - `normalizeRoutePath()` 추가로 trailing slash 및 `/en/*` 경로 인식 일관화
    - `goPage`, `goPolicy`의 현재 경로 비교도 동일 정규화 적용
    - 푸터 정책 버튼 `type="button"` 지정 및 호버 상태 보강
- Verification:
  - 정책 라우팅 매핑 확인: `/legal/*`, `/en/legal/*`
  - 빌드 검증 예정

## 17. 2026-02-22 shadcn/ui Installation-Guide 기반 적용
- Skill usage:
  - `shadcn-ui` 스킬 사용. 공식 설치 흐름(init -> add components)을 그대로 적용.
- Setup:
  - `npx shadcn@latest init -d` 성공
  - `components.json` 생성, `@` alias 경로(`jsconfig.json`, `vite.config.js`) 구성
  - 생성 파일: `src/lib/utils.js`, `src/components/ui/*`
- Installed components:
  - button, card, input, badge, table, tabs, separator
- Integration changes:
  - `src/App.jsx`에 Button/Card/Input/Badge/Table 적용해 핵심 화면의 디자인 언어 통일
  - header, landing hero CTA, login actions, input form controls, participant table, result actions, footer legal links 반영
- Stability fixes:
  - `tailwind.config.js`의 ESM + plugin import 정비
  - `vite.config.js`에서 `fileURLToPath(import.meta.url)`로 alias 안정화
- Verification:
  - `npm run build` 성공

## 18. 2026-02-22 Information Architecture Optimization
- Goal:
  - "문서형 나열 UI"를 작업 단계형 UI로 전환하고, 중복/불필요 노출을 축소.
- Applied:
  - `src/App.jsx`
    - 랜딩 CTA를 단일 primary 액션으로 정리
    - input 화면에 `Tabs` 도입 (`data`, `rules`, `review`, `run`)
    - 섹션 노출을 탭별로 분리
    - `reviewItems` + `canRunAssignment` 기반 사전 점검/실행 가드 추가
    - 실행 미충족 시 데이터 탭 이동 액션 제공
- Verification:
  - `npm run build` 성공

## 19. 2026-02-22 Login Screen Compression
- Goal:
  - 로그인 페이지를 "설명형"에서 "즉시 행동형"으로 축소.
- Applied:
  - `src/App.jsx`
    - login 영역을 단일 카드(제목/짧은 안내/Google 로그인/랜딩 복귀)로 교체
    - 사용하지 않는 workspace 설명 텍스트 키 제거
    - input 상단 summary 카드 4개 -> 3개로 축소(불필요 상태 제거)
- Verification:
  - `npm run build` 성공

## 20. 2026-02-22 UX Hardening (Auto Navigation + Guard)
- Applied:
  - `src/App.jsx`
    - `toUserFacingError()` 추가: OAuth/token/권한 오류를 재로그인 유도 문구로 표준화
    - import 성공 시 `setInputTab('rules')`
    - run assign 검증 실패/checkout 실패 시 `setInputTab('review')`
    - `runAssignLockRef`로 중복 실행 차단
    - review 카드의 비정상 항목에 `Open tab` 액션 추가
- Verification:
  - `npm run build` 성공

## 21. 2026-02-22 Bulk Paste + Undo/Redo
- Applied in `src/App.jsx`:
  - History core:
    - `historyRef`, `isApplyingHistoryRef`, `buildDataSnapshot`, `recordHistorySnapshot`, `undoDataChange`, `redoDataChange`
  - Keyboard shortcuts:
    - Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y
  - Bulk paste:
    - `handleTablePaste(event, startRowIndex, startColumnKey)`
    - tab/newline 포함 클립보드만 인터셉트
    - 테이블 시작 셀 기준으로 다중 값 반영
    - 표시 행 초과 시 새 participant 행 자동 생성
  - UI integration:
    - 테이블 툴바 `Undo/Redo` 버튼 추가
    - 각 셀 Input에 `onPaste` 연결
    - 행 삭제를 `removeParticipantRow`로 분리하여 히스토리 반영
- Safety notes:
  - 단일값 paste는 기본 브라우저 입력 동작 유지
  - 실행 로직(run/checkout)은 기존과 충돌 없음
- Verification:
  - `npm run build` 성공

## 22. 2026-02-22 Input Page Bottom Placement + Hint Removal
- Goal:
  - 입력페이지에서 실행 전 점검 요약과 결제 후 실행 버튼을 시각적으로 항상 최하단에 배치.
  - 실행 불가 시 노출되던 고정 힌트 문구(`데이터 불러오기와 식별 열 설정을 먼저 완료하세요.`) 제거.
- Applied:
  - `src/App.jsx`
    - 실행 버튼 섹션 컨테이너 클래스에 `order-3` 지정
    - 점검 요약 섹션 컨테이너 클래스에 `order-3` 지정
    - `!canRunAssignment` 조건의 경고 박스 렌더링 제거
- Verification:
  - `npm run build` 성공
