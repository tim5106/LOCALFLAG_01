# Local Flag API Contracts

`openapi.yaml`이 프론트엔드와 백엔드 사이의 기준 계약입니다.

API를 변경할 때는 다음 순서를 지킵니다.

1. OpenAPI 스키마와 오류 코드를 먼저 수정합니다.
2. 프론트엔드와 기획·도메인 리뷰를 받습니다.
3. 서버 구현과 클라이언트 타입을 갱신합니다.
4. contract test를 추가합니다.

