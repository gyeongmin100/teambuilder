# TeamBuilder AI

> 1초 만에 끝내는 랜덤 배정부터, AI가 설계하는 데이터 기반 팀 빌딩까지.

**Live demo → https://teambuilder-5je.pages.dev/**

---

## 어떤 서비스인가요?

학교 조별 과제, 사내 프로젝트, 해커톤, 스터디 등 **팀을 나눠야 하는 모든 상황**에서 사용할 수 있는 AI 팀 배정 도구입니다.

참가자 목록과 각자의 특성(역할, 성별, 실력, 성격 등)을 입력하면 GPT가 균형 잡힌 팀을 자동으로 구성합니다. 단순 랜덤 배정은 물론, "특정 두 사람은 같은 팀", "각 팀 성별 균형 맞추기" 같은 **자연어 제약 조건**도 지정할 수 있습니다.

### 사용 흐름

1. **참가자 입력** — 직접 입력하거나 CSV 파일로 한 번에 업로드
2. **특성 열 설정** — 성별, 역할, 실력 등 원하는 컬럼을 자유롭게 추가
3. **팀 설정** — 1팀당 인원 수 지정
4. **맞춤 프롬프트 (유료)** — 자연어로 제약 조건 입력
   - 예: "김민지와 김철수는 같은 팀으로, 각 팀 성별은 최대한 균형 있게, 성향 다른 사람끼리 섞기"
5. **실행 전 점검** — 데이터 수, 팀 수, 중복 식별값 자동 확인
6. **팀 배정** — GPT가 최적 팀 구성 결과 반환

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| AI 팀 배정 | 참가자 특성을 분석해 GPT가 균형 잡힌 팀 자동 구성 |
| CSV 업로드 | 기존 명단을 CSV로 한 번에 가져오기 |
| 커스텀 특성 컬럼 | 역할·성별·실력 등 원하는 항목 자유롭게 추가/삭제 |
| 맞춤 프롬프트 | 자연어로 팀 구성 제약 조건 지정 (유료 플랜) |
| 실행 전 점검 요약 | 데이터 수·팀 수·중복값 사전 확인 |
| Undo / Redo | 참가자 데이터 변경 이력 되돌리기 |
| 다국어 | 한국어 / English 전환 |
| 결제 연동 | Polar를 통한 유료 플랜 결제 |

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React, Vite, Tailwind CSS, shadcn/ui |
| Backend | Cloudflare Pages Functions |
| AI | OpenAI API (GPT) |
| 결제 | Polar |
| 배포 | Cloudflare Pages |

## 구조

```
src/                  # React 프론트엔드
  components/         # UI 컴포넌트
  domain/             # 도메인 로직
  lib/                # 유틸리티
functions/            # Cloudflare Pages Functions (서버사이드)
  api/                # API 엔드포인트
  domain/             # 서버 도메인 로직
  infrastructure/     # 외부 서비스 연동 (OpenAI, Polar)
  shared/             # 공통 유틸
```

## 로컬 실행

```bash
cp .env.example .env   # 환경변수 설정
npm install
npm run dev
```

`.env.example`에서 필요한 키 목록 확인.
