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
