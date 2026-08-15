# Local Flag

잘 알려지지 않은 로컬 명소를 발견하고 현장에서 인증해 포인트와 깃발 기록을 쌓는 위치 기반 관광 PWA입니다.

프로젝트의 제품·협업·API 기준은 [LOCAL_FLAG_PROJECT.md](./LOCAL_FLAG_PROJECT.md)를 참고하세요.

## 저장소 구조

```text
.
├─ apps/
│  ├─ web/                 # React + Vite 모바일 우선 PWA
│  └─ api/                 # Express + TypeScript REST API
├─ packages/
│  └─ contracts/           # OpenAPI 3.1 계약
├─ supabase/
│  └─ migrations/          # PostgreSQL + PostGIS 스키마
├─ docs/
│  └─ decisions/           # 기술·정책 결정 기록(ADR)
└─ LOCAL_FLAG_PROJECT.md   # 프로젝트 기획 및 개발 명세
```

## 시작하기

### 요구 사항

- Node.js 22 이상
- npm 10 이상
- 선택: Supabase CLI 또는 Supabase 프로젝트

### 설치

```bash
npm install
```

### 환경변수

```bash
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

Windows PowerShell에서는 다음 명령을 사용합니다.

```powershell
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item apps/api/.env.example apps/api/.env
```

### 개발 서버

터미널 두 개에서 각각 실행합니다.

```bash
npm run dev:web
npm run dev:api
```

- Web: <http://localhost:5173>
- API: <http://localhost:4000/api/v1/health>
- OpenAPI: `packages/contracts/openapi.yaml`

## 검증 명령

```bash
npm run typecheck
npm test
npm run build
```

## 현재 구현 범위

- 3탭 탐색·현장 인증·마이 플래그 UI 셸
- 개발용 장소 목록과 API 클라이언트 fallback
- Express 상태 확인, 장소 조회, 인증 사전 검사 골격
- 공통 오류 형식과 요청 추적 ID
- OpenAPI 3.1 기본 계약
- PostGIS, RLS, 포인트 원장을 포함한 초기 Supabase 마이그레이션

실제 지도, TourAPI 동기화, Supabase Auth, 포인트 트랜잭션은 환경 키를 연결한 뒤 단계적으로 구현합니다.
