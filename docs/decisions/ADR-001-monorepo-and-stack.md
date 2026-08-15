# ADR-001: npm workspaces 기반 단일 저장소

- 상태: 승인
- 날짜: 2026-08-16

## 배경

프론트엔드 1명과 백엔드 1명이 OpenAPI 계약을 중심으로 병렬 개발해야 하며, 전체 팀은 4명으로 작다.

## 결정

- npm workspaces를 사용한다.
- `apps/web`은 React, Vite, TypeScript로 구성한다.
- `apps/api`는 Express, TypeScript로 구성한다.
- API 계약은 `packages/contracts/openapi.yaml`에서 관리한다.
- 데이터베이스 변경은 `supabase/migrations`의 순차 마이그레이션으로 관리한다.

## 결과

설치와 CI는 단순해지고 API 계약을 한 저장소에서 리뷰할 수 있다. 워크스페이스 규모가 크게 성장하면 빌드 캐시 도구 도입을 다시 검토한다.

