# TourAPI → Local Flag 데이터 계약

## 1. 필드 매핑

| TourAPI 원본 | Local Flag 응답 | 변환·검증 규칙 |
| --- | --- | --- |
| `contentid` | `id` | 문자열을 정수로 변환 |
| `title` | `title` | 공백 제거 후 빈 값이면 제외 |
| `addr1`, `addr2` | `address`, `addressDetail` | 빈 문자열은 `null` |
| `mapy` | `location.lat` | 숫자로 변환, 한국 범위 초안 33~39 |
| `mapx` | `location.lng` | 숫자로 변환, 한국 범위 초안 124~132 |
| `contenttypeid` | `contentTypeId` | 문자열을 정수로 변환 |
| `cat1`, `cat2`, `cat3` | `category.cat1~3` | 원본 코드 보존 |
| `areacode`, `sigungucode` | `areaCode`, `sigunguCode` | 종로구 목록은 각각 `1`, `23` 검증 |
| `firstimage` | `imageUrl` | 빈 값은 `null`; 로드 실패는 UI 대체 이미지 |
| `firstimage2` | `thumbnailUrl` | 빈 값은 `null` |
| `tel` | `telephone` | 빈 문자열은 `null` |
| `mlevel` | `mapLevel` | 숫자로 변환, 참고 정보 |
| `cpyrhtDivCd` | `copyrightType` | 이미지 출처 관리용으로 보존 |
| `createdtime`, `modifiedtime` | `sourceCreatedAt`, `sourceModifiedAt` | `yyyyMMddHHmmss`를 ISO 8601로 변환 |

## 2. 사용자 제공 샘플의 정규화 결과

```json
{
  "id": 129838,
  "title": "성균관대학교 인문사회과학캠퍼스박물관",
  "address": "서울특별시 종로구 성균관로 25-2 (명륜3가)",
  "addressDetail": null,
  "location": {
    "lat": 37.5849607702,
    "lng": 126.9969632609
  },
  "contentTypeId": 14,
  "category": {
    "cat1": "A02",
    "cat2": "A0206",
    "cat3": "A02060100"
  },
  "areaCode": 1,
  "sigunguCode": 23,
  "imageUrl": "http://tong.visitkorea.or.kr/cms/resource/09/3556509_image2_1.jpg",
  "thumbnailUrl": "http://tong.visitkorea.or.kr/cms/resource/09/3556509_image3_1.jpg",
  "telephone": null,
  "mapLevel": 6,
  "geometryType": "POINT",
  "checkInEnabled": false,
  "checkInRadiusM": 100,
  "reviewStatus": "PENDING_ACCESS",
  "grade": "UNRATED",
  "rewardPoints": null
}
```

`geometryType`과 `reviewStatus`는 TourAPI 값이 아니라 팀장이 검수하여 추가하는 도메인 정보다. 이 장소는 좌표와 이미지가 존재하지만 외부인 출입 가능 여부와 실제 입구 좌표가 확인되지 않았으므로 인증을 비활성화한다.

## 3. 목록 응답 형식

```json
{
  "data": [],
  "meta": {
    "count": 0,
    "source": "tour-api",
    "areaCode": 1,
    "sigunguCode": 23
  }
}
```

프론트엔드는 `meta.source`로 실제 TourAPI 데이터와 개발용 fallback 데이터를 구분한다.

## 4. 제외 및 검토 규칙

즉시 제외:

- 제목이 없거나 위·경도가 숫자로 변환되지 않는 데이터
- 좌표가 허용 범위를 벗어난 데이터
- 종로구 요청인데 지역 코드가 일치하지 않는 데이터
- 여행코스처럼 단일 좌표 인증이 본질적으로 부적합한 유형

응답은 가능하지만 인증은 차단:

- 외부인 접근 가능 여부가 확인되지 않은 학교·기관 내부 시설
- 여러 입구를 가진 전통마을·관광단지
- 운영 종료 또는 행사 기간이 확인되지 않은 장소
- 대표 좌표가 실제 방문 지점과 다를 가능성이 큰 장소
