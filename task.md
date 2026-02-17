# 팀 자동 배정 SaaS (TeamBuilder) 구현 작업

## 1. 초기 설정
- [x] `task.md` 및 `implementation_plan.md` 작성
- [x] 필요한 라이브러리 설치 (Lucide-react, Tailwind CSS v4, Framer-motion 등)
- [x] 프로젝트 구조 정리 (frontend -> root 이동)

## 2. 백엔드 구현 (Cloudflare Pages Functions)
- [x] `functions/api/assign.js`: 팀 배정 로직 및 GPT 연동 (완료)
- [x] `functions/api/checkout.js`: Polar 결제 세션 생성 (완료)
- [x] 팀 배정 알고리즘 (Deterministic Algorithm) 개발 (완료)

## 3. 프론트엔드 구현 (React + Vite)
- [x] 랜딩 페이지 및 입력 폼 (이름, 역할, 협업 스타일 등) (완료)
- [x] 결과 표시 페이지 (팀 구성표, 배정 근거 요약) (완료)
- [x] Polar 결제 연동 (Redirect Flow 구현) (완료)
- [x] 로딩 및 에러 핸들링 (완료)

## 4. 통합 및 배포 준비
- [x] 빌드 검증 (Vite build 성공)
- [ ] 환경 변수 설정 (OPENAI_API_KEY, POLAR_ACCESS_TOKEN 등) - 사용자 설정 필요
- [ ] 실배포 (Wrangler deploy)
