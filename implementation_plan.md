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

## 23. 2026-02-22 Data Import Integration Into Participant Table
- Goal:
  - 데이터 가져오기 기능을 별도 섹션이 아니라 참가자 테이블 내부 기능으로 통합.
- Applied:
  - `src/App.jsx`
    - 독립 `import data` 카드 제거
    - 테이블 툴바에 `데이터 가져오기` 토글 버튼 추가
    - import 패널(`Google Form URL`, `불러오기`, `내 구글폼`, `CSV 업로드`)을 테이블 카드 내부로 이동
    - `sheetListOpen` 목록 렌더링을 동일 패널 내부로 이동
    - 패널 접기 시 sheet list 자동 닫힘 처리
- Verification:
  - `npm run build` 성공

## 24. 2026-02-22 Bottom Execution Order + Section Number Cleanup
- Goal:
  - 사용자가 `실행 전 점검 요약`을 읽은 뒤에 `결제 후 팀 배정 실행` 버튼을 누를 수 있도록 하단 순서를 재배치.
  - 기능 섹션 제목의 번호 접두사(1), 4) 등)를 제거.
- Applied:
  - `src/App.jsx`
    - 하단 블록 순서를 `점검 요약 -> 결제 실행 버튼`으로 재배치
    - 텍스트 키 번호 제거
      - `teamSettings`: `1) ...` -> `...`
      - `columnMgmt`: `3) ...` -> `...`
      - `tableTitle`: `4) ...` -> `...`
- Verification:
  - `npm run build` 성공

## 25. 2026-02-22 Input Page UX Overhaul (10 Requested Items)
- Goal:
  - 입력 페이지의 상단→하단 흐름을 사용자가 즉시 이해할 수 있게 단순화하고, 팀 실행 전 점검/실행 동선을 명확히 분리.
- Applied:
  - `src/App.jsx`
    - 상단 안내 문구 제거(`inputFlowGuide` 렌더링 삭제)
    - 검색 입력을 테이블 헤더 첫 줄(`No` 헤더 위)로 이동
    - 열 제외 체크 UI 제거, 열 헤더 액션(`이름변경`, `삭제`) 중심으로 전환
    - 핀 아이콘 기반 식별열 지정 제거, `기준 열` 드롭다운 선택 방식으로 교체
    - 식별열 강제(첫 열 고정) effect를 선택 유지 방식으로 변경
    - 팀 인원 입력의 `|| 4` fallback 제거, 범위 클램프 방식으로 보정
    - 나머지 처리 라디오를 `나머지 존재 + 기본 팀 1개 이상` 조건에서만 노출
    - 실행 전 점검 요약을 요구 항목 6개로 재구성
    - 요약 영역의 action message 노출 제거
    - 실행 버튼 컨테이너 박스 제거, 우측 하단 정렬로 이동
- Verification:
  - `npm run build` 성공

## 26. 2026-02-22 Input UX Follow-up Fixes (7 items)
- Goal:
  - 재요청된 입력 UX 7개 항목을 누락 없이 반영하고, 사용 흐름(가져오기 -> 편집 -> 점검 -> 실행)의 직관성을 강화.
- Applied:
  - `src/App.jsx`
    - `importPanelOpen` 초기값 `false`로 변경(기본 닫힘)
    - `외부데이터 가져오기` 버튼을 테이블 제목 줄 우측으로 이동
    - 검색/행추가/열추가를 동일 툴바 행으로 재배치
    - 열 헤더 `이름변경` 버튼 제거
    - 열 편집을 `더블클릭 진입 + onBlur 저장`으로 변경
    - `teamSizeInput` 문자열 상태 도입으로 팀 인원 입력 자유 편집/백스페이스 허용
    - 맞춤프롬프트 토글 UI 추가 및 `isCustomPromptActive` 기준으로 요약/실행 payload 연동
- Verification:
  - `npm run build` 성공

## 27. 2026-02-22 Input Follow-up (3 requested fixes)
- Goal:
  - 안내 문구 제거, 팀 인원 입력 기본값 제거, 맞춤 프롬프트 판단 로직 단순화.
- Applied:
  - `src/App.jsx`
    - 기준열/열편집 안내 문구 렌더 제거
    - `teamSizeInput` 초기값을 빈 문자열로 변경
    - `config.teamSize` 기본값을 `0`으로 변경하고 blur 시 빈 값은 `0` 유지
    - `사용자 맞춤 프롬프트 사용` 체크 UI 제거
    - `isCustomPromptActive = customPrompt.trim().length > 0`로 단일화
    - 실행 payload/점검요약을 동일 기준으로 연동
    - 팀 인원 2 미만 실행 차단 가드 추가
- Verification:
  - `npm run build` 성공

## 28. 2026-02-22 Input UX Tweaks (import panel + identifier reset + team size range)
- Goal:
  - 외부데이터 패널의 시각적 위치를 버튼 직하단으로 맞추고, 열/기준열/팀인원 입력 UX를 더 간결하게 개선.
- Applied:
  - `src/App.jsx`
    - 외부데이터 패널 렌더 순서를 제목줄 바로 아래로 이동
    - import hint에서 `빈 행 추가` 문구 제거
    - 열 삭제 컨트롤을 소형 `Trash2` 아이콘 버튼으로 변경
    - 기준 열 섹션에 `초기화` 버튼 추가(참가자 데이터 존재 시에만 표시)
    - 식별열 자동 재선택 effect를 보정해 수동 초기화 상태 유지
    - 팀인원 입력 커밋 로직(`commitTeamSizeInput`) 추가
      - blur/Enter 시 공통 적용
      - 입력 범위를 `1..validParticipants.length`(데이터 없으면 1)로 제한
    - 실행 전 팀인원 유효성 가드를 1 이상 기준으로 변경
- Verification:
  - `npm run build` 성공

## 29. 2026-02-22 Language Toggle Race Fix (EN -> KO one-click issue)
- Root cause:
  - `updateLang()`에서 `setUiLang('ko')`를 먼저 실행한 뒤 URL 쿼리(`?lang=en`)가 아직 남아있는 짧은 구간에서,
    언어 동기화 effect가 다시 query 값을 우선 적용해 `uiLang`을 `en`으로 되돌리는 레이스가 발생.
- Applied:
  - `src/App.jsx`
    - 언어 동기화 effect dependency에서 `uiLang` 제거
    - location(query/path) 변경 시점에만 동기화하도록 조정
- Result:
  - 영어 -> 한국어 전환 시 1회 클릭으로 즉시 반영.
- Verification:
  - `npm run build` 성공

## 30. 2026-02-22 Import Reliability + Identifier/Reset/Enter Fixes
- Goal:
  - 구글폼 import 실패율을 낮추고, 식별열 가짜 컬럼/초기화 동작/팀인원 Enter UX 문제를 동시 해결.
- Applied:
  - `src/App.jsx`
    - `openSheets`, `importSheet`에 `refreshSession()` 기반 provider token fallback 추가
    - `importSheet` responses 조회를 `nextPageToken` 루프로 확장(최대 페이지 전부 수집)
    - import된 featureKey 존재 시 식별열 미선택 상태에서 첫 열 자동 선택
    - 테이블 식별열 헤더 fallback 문구 제거
    - `resetInputState()` 추가: 참가자/열/식별열/검색/프롬프트/히스토리 등 전체 초기 상태 복구
    - 기준열 영역 `초기화` 버튼을 `resetInputState`에 연결
    - 팀인원 Enter 시 `commitTeamSizeInput()` 후 `blur()` 처리
- Verification:
  - `npm run build` 성공

## 31. 2026-02-22 Add `Set in custom prompt` remainder mode
- Goal:
  - 나머지 인원 처리 방식을 사용자 맞춤 프롬프트 지시로 결정할 수 있는 3번째 옵션 제공.
- Applied:
  - `src/App.jsx`
    - remainder mode 라디오에 `맞춤프롬프트에 입력하기` 추가
    - `config.remainderMode === 'prompt'`일 때 점검 요약에 프롬프트 기반 처리 문구 표시
  - `functions/api/assign.js`
    - `remainderModeRaw` 도입(`spread|keep_partial|prompt`)
    - OpenAI 호출에는 raw mode 전달, 내부 폴백 배정은 안전하게 spread/keep_partial만 사용
  - `functions/domain/constraints/openaiClient.js`
    - prompt 모드 규칙 추가(프롬프트 지시 우선, 미명시 시 spread)
- Verification:
  - `npm run build` 성공

## 32. 2026-02-22 Checkout Pending Page Recovery + Result Transition Hardening
- Goal:
  - 결제대기페이지(`checkout/pending`)에서 결과페이지로 전환이 끊기는 문제를 복구하고, 자동/수동 복귀 경로를 모두 안정화.
- Applied:
  - `src/App.jsx`
    - `PENDING_CHECKOUT_ID_KEY` 추가, 결제 세션 생성 시 `checkout_id` 저장
    - 결제 후 복귀(`checkout_success=true`) 시 실행되는 로직을 `runPaidAssignment` 공통 함수로 분리
    - 결제대기페이지에 `결제 완료 확인` 버튼 추가(저장된 `checkout_id` 기반 수동 검증/배정 재개)
    - 성공 시 pending 데이터(`assign/url/id`)를 일괄 제거하는 `clearPendingCheckoutState` 추가
    - 결제 확인 실패 시 즉시 `input`으로 강제 이동하지 않고 `polar`에서 재시도 가능하도록 오류 흐름 개선
    - query 파라미터 기반 자동 복귀 후 URL 정리 로직 유지
- Verification:
  - `npm run build` 성공

## 33. 2026-02-22 Result Output Quality + Spread Consistency + UX Additions
- Goal:
  - 입력 점검값과 실제 팀 결과 불일치(특히 spread 나머지 몰림)를 제거하고, 결과 페이지를 사용자 중심으로 단순/강화.
- Applied:
  - `functions/domain/teams/teamFormation.js`
    - `buildSpreadTargetSizes(total, teamSize)` 추가
    - spread 기본 배정 로직을 랜덤 추가 방식에서 목표 팀 크기 기반 균등 배치로 변경
  - `functions/domain/teams/aiNormalization.js`
    - AI 결과 정규화 후 spread 목표 크기(`buildSpreadTargetSizes`) 기준 재균등화(`rebalanceSpreadTeams`) 추가
    - unassigned 배정 후에도 2차 재균등화 수행
  - `functions/domain/constraints/reporter.js`
    - 결과 요약 문구를 사용자용 요약 중심으로 단순화
    - 팀별 사유 생성 로직 강화(기본 사유 + AI 코멘트 + 성비 불가피 사유 자동 멘트)
    - 내부 진단 값은 `debug` 필드로 분리(기본 UI 노출 제거용)
  - `functions/api/assign.js`
    - `buildAssignmentReport`에 `customPrompt` 전달
    - 결과 응답에서 상세 `meta` 제거(불필요 노출 최소화)
  - `src/App.jsx`
    - 결과 화면 상단에 `이미지로 저장`, `공유하기` 버튼 추가
    - `프롬프트 수정 후 다시 배정` 버튼 제거
    - 결과 상세 내부 진단 블록(제약 로그/판정 상태/파싱 메타 등) 렌더 제거
    - 구성원 클릭 시 특성 상세 펼침/접기 UI 추가
    - 결과 영역 이미지 캡처(외부 라이브러리 없이 SVG foreignObject + canvas) 구현
- Verification:
  - `node` 스모크 테스트:
    - spread: `10/4 -> [5,5]`, `14/4 -> [5,5,4]`, `13/4 -> [5,4,4]`
    - keep_partial: `13/4 -> [4,4,4,1]`
    - AI 정규화 재균등화: 비정상 AI 입력에서도 `[5,5,4]` 보정 확인
  - `npm run build` 성공

## 34. 2026-02-22 Report Narrative Upgrade + Image Save Reliability
- Goal:
  - 결과 페이지 텍스트를 사용자 관점의 해설형 보고서로 개선하고, 이미지 저장 기능 실패를 구조적으로 제거.
- Applied:
  - `functions/domain/constraints/reporter.js`
    - 전체 보고서를 `요청사항 / 반영된 항목 / 미충족 항목 / 미충족 사유 / 최선안 판단` 구조로 재작성
    - 팀 보고서에 `반영 내용`과 `완전 충족 어려운 부분`을 문장형으로 포함
    - MBTI 요청 감지 시 팀별 MBTI 조합 해설 자동 추가
    - 성비 요청이 있는 상황에서 데이터 부족 시 불가피 사유 멘트 자동 추가
    - 기술 용어 정리(`폴백`, `fallback`, 내부 모드 표기 완화)
  - `functions/api/assign.js`
    - 자동 보정 사유 문구를 사용자 친화 표현으로 정리
  - `src/App.jsx`
    - 이미지 저장 로직을 `foreignObject DOM 캡처` 방식에서 `캔버스 직접 렌더` 방식으로 교체
    - 결과 요약/팀 사유를 캔버스에 텍스트로 렌더한 PNG 생성
- Verification:
  - `npm run build` 성공

## 35. 2026-02-22 Root-Cause Fix for `balance` Label, Prompt Remainder, and Gender Balance Quality
- Goal:
  - `balance` 기술 라벨 노출 제거, prompt 나머지 배정 지시 미반영 문제, 성비 균형 반영 약화 문제를 루트 원인 기준으로 수정.
- Applied:
  - `functions/domain/teams/aiNormalization.js`
    - prompt 모드에서 미배정 인원을 처리할 때 신규 팀을 생성하지 않도록 로직 변경
    - prompt 텍스트에서 `첫번째팀/마지막팀` 지시를 해석하는 정책(`first_last`, `first_only`, `last_only`, `smallest_first`) 추가
    - prompt 모드에서도 기본 팀 개수(`floor(n/teamSize)`)로 정규화하도록 보정
  - `functions/api/assign.js`
    - AI 정규화 호출 시 `customPrompt` 전달
    - AI 결과 이후 `enforceMinPerTeamConstraints`, `enforceMaxPerTeamConstraints`, `localSearchImprove`를 순차 적용해 제약 반영 강도 강화
  - `functions/domain/constraints/evaluator.js`
    - `balance` 패널티를 단순 “값 존재 여부”가 아닌 실제 남/여 불균형(팀 내 편차 + 팀간 비율 편차) 기준으로 재정의
    - `balance` 판정 상세를 완전균형/근접균형/불균형 팀 수 기반으로 변경
  - `functions/domain/constraints/reporter.js`
    - 요청 라벨 변환 시 `balance` 타입을 사용자 문구 `성비 균형`으로 매핑
- Verification:
  - 스모크 재현:
    - 조건: 50명, teamSize=4, remainderMode=prompt, 프롬프트 `첫번째팀 1명 마지막팀 1명`
    - 결과: 팀 수 12 유지, 팀 크기 `[5,5,4,4,4,4,4,4,4,4,4,4]`
  - `npm run build` 성공

## 36. 2026-02-22 Final Architecture Shift: GPT-First Decision + Strict Quantitative Validation
- Goal:
  - 예시 하드코딩 없이 GPT가 나머지/충돌 판단을 수행하고, 서버는 정합성 검증 및 자동 재시도로 품질을 보장.
- Applied:
  - `functions/domain/constraints/openaiClient.js`
    - 출력 스키마에 `remainder_decision` 강제 추가
    - prompt 모드에서 팀 수 변경 시 `allowed_team_count_change=true` 명시 지시 추가
  - `functions/domain/teams/aiNormalization.js`
    - prompt 예시 기반 분배 하드코딩 제거
    - spread만 분포 강제, prompt/keep_partial은 AI 초안 존중 + 미배정 보정
  - `functions/api/assign.js`
    - `validateQuantitative`를 하드(중복/누락/유효id) + 형태(팀수/분포) 검증 구조로 개편
    - 1차 실패 사유를 피드백으로 포함해 2차 AI 재요청 수행
    - prompt 모드 팀 수 변경 허용 조건:
      - 프롬프트에 팀 수 변경 명시 의도 존재
      - AI `remainder_decision.allowed_team_count_change=true`
      - AI `remainder_decision.mode==='new_team'`
    - 검증 실패 시 fallback 후 정량 리포트로 상태 명시
  - `functions/domain/constraints/reporter.js`
    - 리포트에 `remainderDecision` 포함
  - `src/App.jsx`
    - 결과 화면에 `나머지 인원 처리 판단` 블록 추가
- Verification:
  - `npm run build` 성공

## 37. 2026-02-23 Recomposition: Assign Logic From Scratch (Pipelineized)
- Goal:
  - `assign` 진입점 과밀을 해소하고, 배정 로직을 독립 엔진으로 분리해 재시도/검증/폴백 경로를 명확화.
- Applied:
  - `functions/api/assign.js`
    - 요청 파싱/필수 검증/결제 검증만 담당하도록 축소.
    - 실제 배정은 `assignTeamsWithValidation` 호출로 위임.
  - `functions/domain/assignment/engine.js` (new)
    - 4단계 파이프라인 구성:
      - 입력 정규화(참가자 컴팩트/ID 고유화/목표 팀 크기 계산)
      - AI 1차 시도
      - 정량 검증 실패 또는 프롬프트 불일치 시 피드백 포함 2차 시도
      - 실패 시 deterministic fallback 확정
    - 기존 응답 포맷(`teams`, `report`)과 리포트 구성 호환 유지.
  - `functions/domain/assignment/quantitative.js` (new)
    - 정량 무결성 검증(중복/누락/invalid id/팀수/팀크기 분포) 분리.
    - AI 재요청용 피드백 문자열 생성 분리.
- Verification:
  - `npm run build` 성공 (2026-02-23)

## 38. 2026-02-23 Architecture Change: AI-Only Assignment (No Server Validation)
- Goal:
  - 서버의 정량 검증/재시도/폴백을 제거하고, 모델이 최종 팀 배정을 단독 결정하도록 전환.
- Applied:
  - `functions/domain/assignment/engine.js`
    - 기존 `AI 1차 -> 검증 -> 2차 -> fallback` 파이프라인 제거.
    - `AI 1회 호출 -> 응답 팀 매핑 -> 결과 반환` 흐름으로 단순화.
    - 서버는 AI 출력의 팀 구성 결과를 신뢰해 그대로 반환.
  - `functions/domain/constraints/openaiClient.js`
    - 시스템 지침을 무결성 강제 중심에서 "모델 자율 배정" 중심으로 수정.
    - 규칙에서 서버 검증 전제를 제거하고 사용자 요청 반영 우선으로 재조정.
- Verification:
  - 진행 예정 (`npm run build`)

## 39. 2026-02-23 Data Fidelity Update: Remove Participant Compression Caps
- Goal:
  - 사용자 특성 반영 정확도를 높이기 위해 OpenAI 입력 단계에서 속성 손실을 제거.
- Applied:
  - `functions/domain/participants/participantSanitizer.js`
    - `features` 상한(기존 12개) 제거
    - `intro/displayName/identifierKey` 길이 절단 제거
    - 공백 정리 + 빈 key/value 제거만 수행
- Verification:
  - 진행 예정 (`npm run build`)

## 40. 2026-02-23 Remainder Policy Redesign: spread / new_team / custom
- Goal:
  - 나머지 인원 처리 방식을 사용자 친화적으로 고정 선택(UI) + 숫자 입력(커스텀)으로 단순화.
- Applied:
  - `src/App.jsx`
    - 나머지 처리 옵션을 3종(`기본팀에 균등 배분`, `새 팀 만들기`, `커스텀`)으로 재구성.
    - `커스텀` 선택 시 팀별 추가 인원 입력 UI 제공.
    - 실시간 잔여 인원 표시 및 `커스텀 배분 합계 === 나머지 인원` 검증 추가.
    - 결제 전 API payload의 `config`를 `remainderPolicy/customRemainderPlan` 구조로 정리.
  - `functions/domain/assignment/engine.js`
    - `remainderPolicy`(`spread|new_team|custom`) 해석 로직 추가.
    - `customRemainderPlan`을 사용한 목표 팀 크기 계산 및 합계 불일치 에러 처리 추가.
  - `functions/domain/constraints/openaiClient.js`
    - OpenAI 프롬프트 컨텍스트를 새 정책명(`remainderPolicy`) 기준으로 갱신.
    - `customRemainderPlan`을 모델 입력에 포함.
- Verification:
  - `npm run build` 성공

## 41. 2026-02-23 Custom Allocation UX Upgrade: +1/-1 Card Interaction
- Goal:
  - 커스텀 나머지 배분을 비전공자 기준으로 더 직관적인 조작 방식으로 단순화.
- Applied:
  - `src/App.jsx`
    - 팀별 숫자 입력 필드를 제거하고 팀 카드 `+1/-1` 버튼 방식으로 교체.
    - 팀별 배분 수(`Assigned`) 및 전체 남은 인원 표시를 유지.
    - 커스텀 배분값 일괄 초기화 버튼 추가.
- Verification:
  - 진행 예정 (`npm run build`)

## 42. 2026-02-23 Custom Allocation Status Badge (Done/Pending)
- Goal:
  - 커스텀 배분 완료 여부를 즉시 식별할 수 있도록 상단 상태 배지를 추가.
- Applied:
  - `src/App.jsx`
    - 커스텀 배분 카드 상단에 `완료/미완료` 배지 추가.
    - 남은 인원(`customRemainingCount`)이 0이면 `완료`, 아니면 `미완료`로 자동 전환.
- Verification:
  - 진행 예정 (`npm run build`)

## 44. 2026-02-23 Prompt Checklist Reporting (Collapsible on Result Page)
- Goal:
  - 맞춤 프롬프트를 요청 항목 단위로 분해하여 결과 페이지에서 검토 가능한 체크리스트로 제공.
- Applied:
  - `functions/domain/constraints/reporter.js`
    - 프롬프트 텍스트를 항목화(parse)하는 함수 추가.
    - `requestReview`와 매칭해 체크리스트별 상태/사유를 생성.
    - 리포트 스키마에 `originalPrompt`, `promptChecklist` 필드 추가.
  - `src/App.jsx`
    - 결과 보고서에 접힘/펼침 UI 추가.
    - 버튼 클릭 시 사용자 원문 프롬프트 + 체크리스트 항목(상태/사유) 표시.
- Verification:
  - `npm run build` 성공

## 45. 2026-02-23 Two-Stage Inference Split: Request Extraction -> Team Assignment
- Goal:
  - 단일 AI 호출에서 요청 해석과 팀 배정을 분리해 품질/디버깅 가능성을 높인다.
  - 1단계 출력(요청 체크리스트)을 2단계 입력으로 강제 연결해 맞춤 프롬프트 반영률을 개선한다.
- Scope:
  - Backend only (API pipeline + OpenAI prompt contracts + report linkage)
  - UI는 기존 체크리스트 표시를 재사용하되 1단계 추출 결과 기준으로 표기
- Plan:
  1. `functions/domain/constraints/openaiClient.js`
     - 1단계 전용 함수 추가: `callOpenAIRequestExtractor`
     - 2단계 배정 함수는 `customPrompt` 직해석 대신 `requestChecklist`를 입력받아 배정
     - 두 단계의 JSON 스키마를 분리하고, 각 단계 실패 메시지를 명확히 분기
  2. `functions/domain/assignment/engine.js`
     - 파이프라인 순서 변경:
       - 1단계: 맞춤 프롬프트 -> 요청 체크리스트 추출
       - 2단계: 팀 틀(`targetTeamSizes`) + 참가자 데이터 + 요청 체크리스트로 배정
     - 1단계 산출물이 없거나 파싱 실패 시 방어 로직(빈 체크리스트 + 경고) 적용
  3. `functions/domain/constraints/reporter.js`
     - 결과 리포트의 체크리스트를 “프롬프트 문자열 파싱”이 아니라 “1단계 추출 결과”를 우선 사용하도록 변경
     - 항목별 상태(`충족/부분/미충족`) 매핑 로직을 2단계 결과와 동기화
  4. 회귀 검증
     - 케이스 A: 프롬프트 없음
     - 케이스 B: 단일 요청(예: 성비 최대한 균형)
     - 케이스 C: 다중 요청(예: 특정 인원 함께 + MBTI 유사)
     - 빌드 검증: `npm run build`
- Acceptance Criteria:
  - 배정 API 호출 시 1단계 추출과 2단계 배정이 분리 실행된다.
  - 2단계 입력에 1단계 체크리스트가 포함된다.
  - 결과 페이지 체크리스트가 1단계 추출 항목을 기준으로 표시된다.
  - 빌드가 성공한다.
- Verification:
  - 진행 예정 (`npm run build`)

## 46. 2026-02-23 Plan Update: Hard Template Slotting + Conditional Retry Gate
- Goal:
  - 팀 크기/팀 수 틀(`targetTeamSizes`)을 절대 위반하지 않도록 서버에서 슬롯 강제 배치를 적용.
  - 재시도는 무조건 수행하지 않고, 무결성 실패 시에만 조건부로 수행.
- Applied to Plan (not code yet):
  1. Hard template slotting:
     - 2단계 배정 결과를 그대로 신뢰하지 않고, 서버가 `targetTeamSizes` 슬롯에 맞춰 최종 팀을 구성.
     - 슬롯 구성 규칙:
       - 전체 인원 정확히 1회 배정
       - 팀별 인원수는 `targetTeamSizes`와 1:1 일치
  2. Integrity-first gating:
     - 중복/누락/invalid id/팀크기 불일치가 있으면 결과를 “무효” 처리.
  3. Conditional retry only:
     - 무결성 실패 시에만 1회 재시도.
     - 2차 결과가 무결성 통과 + 품질 점수 개선일 때만 채택.
     - 2차가 나쁘면 1차 유지(roll-back).
  4. Partial-fix safety:
     - 재시도 시 전체 재생성보다 문제 구간 중심 보정 우선.
     - 이미 안정적인 팀/제약은 잠금(lock)하여 변동 최소화.
- Acceptance Criteria:
  - 팀 틀 위반 결과가 최종 응답으로 반환되지 않는다.
  - 재시도는 무결성 실패 조건에서만 발생한다.
  - 2차 결과가 품질 열화 시 자동 롤백된다.
- Verification:
  - 1차 적용 완료:
    - `targetTeamSizes` 슬롯 강제 배정 로직 적용
    - 무결성 실패 시에만 1회 재시도 적용
  - `npm run build` 성공
  - 남은 작업:
    - 2차 결과 품질 열화 시 1차 롤백 게이트
    - 문제 구간 중심 부분 보정/잠금 전략

## 47. 2026-02-26 Report Format Migration: Checklist-first Detailed Reflection
- Goal:
  - 전역 서술 필드(`global_report/full_report/summary`) 중심 리포트에서 벗어나,
    체크리스트 항목마다 "어떻게 반영되었는지"를 구체적으로 설명하는 포맷으로 전환.
- Applied:
  - `functions/domain/constraints/openaiClient.js`
    - 배정 출력 규칙에서 `global_report/full_report/report/summary` 비출력을 명시.
    - `prompt_checklist` 항목에 `applied_detail`, `evidence[]` 필드를 스키마로 추가.
    - 항목별 상세 설명(관련 항목은 최소 2문장) + 근거 배열(관련 항목은 최소 2개) 작성 규칙 추가.
  - `functions/domain/assignment/engine.js`
    - 사전 relevance 체크리스트가 최종 결과 체크리스트를 덮어쓰던 경로 수정.
    - 배정 단계에서 생성된 체크리스트가 있으면 이를 우선 사용하고, 없을 때만 사전 체크리스트 사용.
  - `functions/domain/constraints/reporter.js`
    - summary 생성에서 `global_report/full_report/report` 후보를 제거.
    - 체크리스트 항목 기반 내러티브(summary)로 재구성.
    - `appliedRequests` 생성 시 `applied_detail` 우선 사용.
  - `src/App.jsx`
    - 결과 체크리스트 카드에 항목별 `반영 상세`, `근거` 섹션 렌더링 추가.
- Acceptance Criteria:
  - 결과 리포트가 전역 텍스트 없이 체크리스트 상세 중심으로 제공된다.
  - 각 항목에 반영 상세(`applied_detail`) 및 근거(`evidence[]`)가 노출된다.
  - 사전 체크리스트가 배정 결과 체크리스트를 덮어쓰지 않는다.
- Verification:
  - `npm run build` 성공
