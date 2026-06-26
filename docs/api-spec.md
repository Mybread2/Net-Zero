# WalkMate — REST API 명세

> 본문 한국어, 식별자는 영어. 도메인별로 묶고, 각 엔드포인트는 메서드·경로·인증 필요여부·
> 요청·응답(JSON 예시)·주요 에러를 표기한다. 데이터 모델은 [domain-model](./domain-model.md),
> LLM 엔드포인트 상세는 [llm-spec](./llm-spec.md) 참조.

## 0. 공통 규약

- Base path: `/api`. 응답 `Content-Type: application/json; charset=utf-8`.
- 인증: `Authorization: Bearer <JWT>`. 표의 **Auth** 열이 `✅`면 토큰 필수.
- 본인(현재 사용자)은 JWT의 subject(userId)로 식별 → 요청 바디에 `userId`를 받지 않는다.

### 0.1 공통 응답 래퍼 `ApiResponse<T>`
```json
{ "status": "success", "data": { }, "message": null }
```
- `status`: `"success"` | `"error"`.
- 실패 시: `{ "status": "error", "data": null, "message": "사람이 읽는 메시지", "code": "ERROR_CODE" }`.

### 0.2 페이징 응답 `PageResponse<T>`
```json
{
  "status": "success",
  "data": {
    "content": [],
    "page": 0,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0,
    "hasNext": false
  },
  "message": null
}
```
- 페이징 파라미터: `?page=0&size=20&sort=createdAt,desc` (기본 page=0, size=20).

### 0.3 공통 에러 코드
| HTTP | code | 의미 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 요청 검증 실패(@Valid) |
| 401 | `UNAUTHORIZED` | 토큰 없음/만료 |
| 403 | `FORBIDDEN` | 권한 없음 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `CONFLICT` | 중복(이메일/요청/하트 등) |
| 502 | `LLM_UNAVAILABLE` | Bedrock 호출 실패(폴백 동작과 함께 사용) |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

---

## 1. auth — 인증

| # | 메서드 | 경로 | Auth | 설명 |
| --- | --- | --- | --- | --- |
| 1.1 | POST | `/api/auth/signup` | ❌ | 회원가입 |
| 1.2 | POST | `/api/auth/login` | ❌ | 로그인(JWT 발급) |

### 1.1 회원가입 — `POST /api/auth/signup`
요청:
```json
{ "email": "a@b.com", "password": "secret123" }
```
응답 `201`:
```json
{ "status": "success", "data": { "userId": 1, "accessToken": "eyJ...", "onboarded": false }, "message": null }
```
- `onboarded`: 온보딩(닉네임/성별/hasDog) 완료 여부. false면 클라이언트가 온보딩 유도.
- 에러: `409 CONFLICT`(이메일 중복), `400 VALIDATION_ERROR`.

### 1.2 로그인 — `POST /api/auth/login`
요청: `{ "email": "a@b.com", "password": "secret123" }`
응답 `200`: `{ "status":"success", "data": { "userId":1, "accessToken":"eyJ...", "onboarded": true }, "message": null }`
- 에러: `401 UNAUTHORIZED`(자격 불일치).

---

## 2. user — 사용자 / 온보딩 / 위치

| # | 메서드 | 경로 | Auth | 설명 |
| --- | --- | --- | --- | --- |
| 2.1 | GET | `/api/users/me` | ✅ | 본인 전체 정보(사용자+강아지) |
| 2.2 | PATCH | `/api/users/me` | ✅ | 온보딩/프로필 수정 |
| 2.3 | PATCH | `/api/users/me/location` | ✅ | 위치 갱신(lat,lng) |
| 2.4 | PATCH | `/api/users/me/ghost-mode` | ✅ | 고스트모드 토글 |
| 2.5 | GET | `/api/users/{id}` | ✅ | 공개 프로필 조회 |

### 2.1 본인 정보 — `GET /api/users/me`
응답 `200`:
```json
{
  "status": "success",
  "data": {
    "id": 1, "email": "a@b.com", "nickname": "멍멍이아빠", "gender": "MALE",
    "hasDog": true, "ghostMode": false, "profileImageUrl": "https://...",
    "lastActiveAt": "2026-06-27T08:00:00Z",
    "dogs": [
      { "id": 10, "name": "콩이", "gender": "FEMALE", "breed": "포메라니안",
        "age": 3, "temperament": "FRIENDLY", "imageUrl": "https://..." }
    ]
  },
  "message": null
}
```
- `hasDog == false` 이면 `dogs: []`.

### 2.2 온보딩/수정 — `PATCH /api/users/me`
요청(부분 수정 가능, 온보딩 시 닉네임/성별/hasDog 필수):
```json
{
  "nickname": "멍멍이아빠", "gender": "MALE", "hasDog": true,
  "dog": { "name": "콩이", "gender": "FEMALE", "breed": "포메라니안", "age": 3, "temperament": "FRIENDLY" }
}
```
- `hasDog == true` 이면 `dog` 필수(name/gender/breed/temperament 필수, age 선택).
- `hasDog == false` 이면 `dog`는 무시/null.
- 응답 `200`: 갱신된 `users/me` 형태. 에러: `400 VALIDATION_ERROR`.

### 2.3 위치 갱신 — `PATCH /api/users/me/location`
요청: `{ "lat": 37.4506, "lng": 126.6543 }`
- 동작: 좌표 저장 + `lastActiveAt` 현재시각으로 갱신. 클라이언트가 주기적 호출(폴링).
- 응답 `200`: `{ "status":"success", "data": { "lat":37.4506, "lng":126.6543, "lastActiveAt":"..." }, "message": null }`

### 2.4 고스트모드 — `PATCH /api/users/me/ghost-mode`
요청: `{ "enabled": true }`
- 응답 `200`: `{ "status":"success", "data": { "ghostMode": true }, "message": null }`

### 2.5 공개 프로필 — `GET /api/users/{id}`
- 지도 핀/근처목록에서 타인 프로필 진입 시. 응답: 닉네임, 프로필이미지, 강아지 요약, `online`.
- 고스트모드 사용자라도 직접 id 조회는 프로필 자체는 노출(위치는 미포함). 에러: `404 NOT_FOUND`.

---

## 3. walk — 산책 매칭 (위치/근처)

| # | 메서드 | 경로 | Auth | 설명 |
| --- | --- | --- | --- | --- |
| 3.1 | GET | `/api/walk/nearby` | ✅ | 근처 사람 목록 |
| 3.2 | GET | `/api/walk/map-users` | ✅ | 지도 실시간 핀 |

### 3.1 근처 사람 목록 — `GET /api/walk/nearby?radius=2000`
- 쿼리: `radius`(미터, 기본 2000), 본인 좌표 기준(서버가 본인 `lat/lng` 사용).
- 조건: 반경 내 + `lastActiveAt` **24시간 이내** + **비고스트** + 본인 제외.
- 응답 `200`:
```json
{
  "status": "success",
  "data": [
    { "userId": 5, "nickname": "초코맘", "profileImageUrl": "https://...",
      "lastActiveAt": "2026-06-27T07:50:00Z", "distanceMeters": 320, "online": true }
  ],
  "message": null
}
```
- `profileImageUrl`: 사용자 또는 강아지 첫 이미지. 에러: `400`(본인 좌표 없음 → 위치 먼저 갱신 안내).

### 3.2 지도 실시간 핀 — `GET /api/walk/map-users?radius=2000`
- 조건: 반경 내 + **online(최근 5분)** + 비고스트 + 본인 제외. 지도 핀 렌더용(좌표 포함).
```json
{
  "status": "success",
  "data": [
    { "userId": 5, "nickname": "초코맘", "profileImageUrl": "https://...",
      "lat": 37.4510, "lng": 126.6550, "online": true }
  ],
  "message": null
}
```

---

## 4. friends — 친구

| # | 메서드 | 경로 | Auth | 설명 |
| --- | --- | --- | --- | --- |
| 4.1 | POST | `/api/friends/requests` | ✅ | 친구 요청 보내기 |
| 4.2 | POST | `/api/friends/requests/{id}/accept` | ✅ | 친구 요청 수락 |
| 4.3 | POST | `/api/friends/requests/{id}/reject` | ✅ | 친구 요청 거절 |
| 4.4 | GET | `/api/friends/requests/sent` | ✅ | 보낸 요청 목록 |
| 4.5 | GET | `/api/friends/requests/received` | ✅ | 받은 요청 목록 |
| 4.6 | GET | `/api/friends` | ✅ | 친구 목록(online 우선) |
| 4.7 | GET | `/api/friends/{userId}` | ✅ | 친구 프로필 상세 |

### 4.1 친구 요청 — `POST /api/friends/requests`
요청: `{ "addresseeId": 5 }`
- 응답 `201`: `{ "status":"success", "data": { "requestId": 100, "status": "PENDING" }, "message": null }`
- 에러: `409 CONFLICT`(이미 요청/친구), `404`(상대 없음), `400`(본인에게 요청).

### 4.2 / 4.3 수락 / 거절
- `POST /api/friends/requests/{id}/accept` → `status: ACCEPTED`(친구 성립).
- `POST /api/friends/requests/{id}/reject` → `status: REJECTED`.
- 권한: 해당 요청의 `addressee` 본인만 가능. 에러: `403 FORBIDDEN`, `404 NOT_FOUND`.

### 4.4 / 4.5 보낸/받은 요청 목록
- `sent`: 본인이 requester인 `PENDING`. `received`: 본인이 addressee인 `PENDING`.
```json
{ "status":"success", "data": [
  { "requestId":100, "user": { "userId":5, "nickname":"초코맘", "profileImageUrl":"https://..." }, "createdAt":"..." }
], "message": null }
```

### 4.6 친구 목록 — `GET /api/friends`
- 정렬: **online(true) 친구가 먼저**, 그다음 닉네임/최근접속 순.
```json
{ "status":"success", "data": [
  { "userId":5, "nickname":"초코맘", "profileImageUrl":"https://...", "online": true },
  { "userId":8, "nickname":"바둑이", "profileImageUrl":"https://...", "online": false }
], "message": null }
```

### 4.7 친구 상세 — `GET /api/friends/{userId}`
- 친구 관계인 사용자만 상세 반환(아니면 `403`). 응답은 `users/{id}` 공개 프로필 + `online`.

---

## 5. chat — 1:1 채팅

| # | 메서드 | 경로 | Auth | 설명 |
| --- | --- | --- | --- | --- |
| 5.1 | GET | `/api/chat/rooms` | ✅ | 대화방 목록 |
| 5.2 | POST | `/api/chat/rooms` | ✅ | 대화방 생성/조회(메시지 보내기) |
| 5.3 | GET | `/api/chat/rooms/{roomId}/messages` | ✅ | 메시지 조회(페이징/폴링) |
| 5.4 | POST | `/api/chat/rooms/{roomId}/messages` | ✅ | 메시지 전송(REST 폴백) |
| 5.5 | WS | `/ws` (STOMP) | ✅ | 실시간 송수신(권장) |

### 5.1 대화방 목록 — `GET /api/chat/rooms`
- `lastMessageAt desc` 정렬. 상대 정보 + 마지막 메시지 미리보기 포함.
```json
{ "status":"success", "data": [
  { "roomId":3, "partner": { "userId":5, "nickname":"초코맘", "profileImageUrl":"https://..." },
    "lastMessage": "안녕하세요!", "lastMessageAt": "2026-06-27T08:10:00Z" }
], "message": null }
```

### 5.2 대화방 생성/조회 — `POST /api/chat/rooms`
요청: `{ "targetUserId": 5 }`
- **idempotent**: 두 사용자 간 방이 있으면 반환, 없으면 생성. "메시지 보내기" 진입에 사용.
- 응답 `200/201`: `{ "status":"success", "data": { "roomId": 3 }, "message": null }`

### 5.3 메시지 조회 — `GET /api/chat/rooms/{roomId}/messages?after=&page=&size=`
- `after`(메시지 id 또는 timestamp): 지정 시 그 이후 메시지만(폴링 폴백용).
- 미지정 시 최신순 페이징.
```json
{ "status":"success", "data": {
  "content": [
    { "messageId":501, "senderId":1, "content":"안녕하세요!", "createdAt":"2026-06-27T08:10:00Z" }
  ],
  "page":0, "size":20, "totalElements":1, "totalPages":1, "hasNext": false
}, "message": null }
```
- 권한: 방 참여자만. 에러: `403`, `404`.

### 5.4 메시지 전송(REST) — `POST /api/chat/rooms/{roomId}/messages`
요청: `{ "content": "안녕하세요!" }`
- 응답 `201`: 저장된 메시지. WebSocket 미사용 환경의 **폴백** 경로.

### 5.5 STOMP WebSocket (권장)
- 연결: `ws(s)://<host>/ws` (SockJS 허용). 핸드셰이크 시 JWT 전달(쿼리/헤더).
- 전송: `SEND /app/chat.send` body `{ "roomId":3, "content":"..." }`.
- 구독: `SUBSCRIBE /topic/rooms/{roomId}` (또는 `/user/queue/messages`)로 수신.
- 폴백: WebSocket 불가 시 5.4 전송 + 5.3 `?after=` 폴링으로 동일 기능. (PRD Q9)

---

## 6. market — 중고거래

| # | 메서드 | 경로 | Auth | 설명 |
| --- | --- | --- | --- | --- |
| 6.1 | GET | `/api/market/items` | ✅ | 목록(필터, 유형별 필드 차이) |
| 6.2 | GET | `/api/market/items/{id}` | ✅ | 상세(SELL만) |
| 6.3 | POST | `/api/market/items` | ✅ | 글쓰기(유형별 바디) |
| 6.4 | POST | `/api/market/items/draft` | ✅ | **LLM-1** 판매글 자동작성 초안 |
| 6.5 | POST | `/api/market/items/{id}/heart` | ✅ | 하트 토글 |
| 6.6 | POST | `/api/uploads/presign` | ✅ | S3 presigned URL 발급 |

### 6.1 목록 — `GET /api/market/items?tradeType=SELL&category=TOY&status=ON_SALE`
- 쿼리(모두 선택): `tradeType`(BUY/SELL), `category`('전체'=미지정), `status`(ON_SALE/SOLD), 페이징.
- **응답 필드는 `tradeType`에 따라 다르다.**

SELL 목록 항목:
```json
{ "itemId":11, "tradeType":"SELL", "title":"강아지 방석 팝니다",
  "price":15000, "thumbnailUrl":"https://...", "heartCount":4, "createdAt":"2026-06-26T..." }
```
BUY 목록 항목:
```json
{ "itemId":12, "tradeType":"BUY", "title":"노즈워크 매트 구해요",
  "content":"중고도 괜찮아요", "author": { "userId":7, "nickname":"두부집사" } }
```
- 응답은 `PageResponse`. 혼합 조회 시 각 항목이 자신의 `tradeType` 필드셋을 가진다.

### 6.2 상세 — `GET /api/market/items/{id}`
- **SELL만** 제공. BUY id 요청 시 `404 NOT_FOUND`(또는 `400`).
```json
{ "status":"success", "data": {
  "itemId":11, "tradeType":"SELL", "title":"강아지 방석 팝니다", "price":15000,
  "images":["https://img1","https://img2"], "heartCount":4, "hearted": false,
  "status":"ON_SALE", "content":"거의 새것입니다", "createdAt":"2026-06-26T...",
  "author": { "userId":7, "nickname":"두부집사", "profileImageUrl":"https://..." }
}, "message": null }
```
- `hearted`: 현재 사용자가 하트 눌렀는지.

### 6.3 글쓰기 — `POST /api/market/items`
- 진입 시 `tradeType` 선택. 바디가 유형별로 다름.

BUY 요청:
```json
{ "tradeType":"BUY", "category":"TOY", "title":"노즈워크 매트 구해요", "content":"중고도 괜찮아요" }
```
SELL 요청:
```json
{ "tradeType":"SELL", "category":"DAILY", "title":"강아지 방석 팝니다",
  "price":15000, "content":"거의 새것입니다", "imageUrls":["https://...","https://..."] }
```
- `imageUrls`: 6.6 presign으로 업로드 후 받은 URL 목록.
- 검증: SELL은 `price`·`imageUrls` 권장(가격 필수), `category`는 `MarketCategory` enum 강제.
- 응답 `201`: `{ "status":"success", "data": { "itemId": 11 }, "message": null }`

### 6.4 판매글 자동작성(LLM-1) — `POST /api/market/items/draft`
- 입력: 상품 사진(+키워드). 출력: 초안 JSON. **상세는 [llm-spec](./llm-spec.md) LLM-1.**
- 요청(`multipart/form-data`): `image`(file), `keywords`(선택, comma) — 또는 `{ "imageBase64":"...", "keywords":["방석","극세사"] }`.
- 응답 `200`:
```json
{ "status":"success", "data": {
  "title":"극세사 강아지 방석",
  "description":"거의 사용하지 않은 극세사 방석입니다. 세탁 가능...",
  "suggestedPrice":15000,
  "suggestedCategory":"DAILY"
}, "message": "추천 가격은 참고용입니다." }
```
- `suggestedCategory`는 `MarketCategory` enum 중 하나로 강제. **결과는 초안** → 사용자가 수정 후 6.3으로 제출.
- 폴백: LLM 실패/타임아웃 시 빈 초안 반환(`502`가 아닌 빈 값 + message) → 글쓰기 비차단.

### 6.5 하트 토글 — `POST /api/market/items/{id}/heart`
- 토글: 없으면 추가, 있으면 제거. SELL 글만 대상.
- 응답 `200`: `{ "status":"success", "data": { "hearted": true, "heartCount": 5 }, "message": null }`

### 6.6 이미지 업로드(presign) — `POST /api/uploads/presign`
요청: `{ "fileName":"cushion.jpg", "contentType":"image/jpeg" }`
응답 `200`:
```json
{ "status":"success", "data": {
  "uploadUrl":"https://{username}-bucket.s3.amazonaws.com/...&X-Amz-Signature=...",
  "fileUrl":"https://{username}-bucket.s3.amazonaws.com/market/uuid.jpg",
  "expiresInSeconds": 300
}, "message": null }
```
- 클라이언트가 `uploadUrl`로 직접 PUT 업로드 후 `fileUrl`을 글쓰기에 사용. (PRD Q8, [infra](./infra.md))

---

## 7. marketplace — 저탄소 마켓

| # | 메서드 | 경로 | Auth | 설명 |
| --- | --- | --- | --- | --- |
| 7.1 | GET | `/api/marketplace/products` | ✅ | 상품 목록(필터) |
| 7.2 | GET | `/api/marketplace/products/{id}` | ✅ | 상세 (**추후**) |
| 7.3 | POST | `/api/marketplace/recommendations` | ✅ | **LLM-2(b)** 추천 |

### 7.1 상품 목록 — `GET /api/marketplace/products?category=FOOD`
- 쿼리: `category`('전체'=미지정, `MarketplaceCategory`), 페이징.
```json
{ "status":"success", "data": {
  "content": [
    { "productId":1, "company":"그린펫", "title":"저탄소 사료 2kg", "imageUrl":"https://...",
      "rating":4.5, "ratingCount":120, "price":29000,
      "lowCarbonSummary":"식물성 단백질 비중을 높여 탄소발자국을 30% 줄였습니다." }
  ],
  "page":0, "size":20, "totalElements":1, "totalPages":1, "hasNext": false
}, "message": null }
```
- `lowCarbonSummary`는 시드 적재 시 LLM으로 1회 생성·캐싱된 값(요청마다 LLM 호출 없음).

### 7.2 상세 — `GET /api/marketplace/products/{id}` (추후)
- MVP 범위 밖. 구현 시 목록 필드 + 추가 상세를 반환할 예정.

### 7.3 추천(LLM-2) — `POST /api/marketplace/recommendations`
요청: `{ "query": "알러지 있는 강아지한테 좋은 사료 추천해줘" }`
- 서버가 **본인 컨텍스트(강아지 프로필)** 와 카탈로그를 자동 주입(grounding). 상세는 [llm-spec](./llm-spec.md) LLM-2.
- 응답 `200`:
```json
{ "status":"success", "data": {
  "recommendations": [
    { "productId":1, "title":"저탄소 사료 2kg", "reason":"곡물 프리 구성이라 알러지 견에게 적합하고 저탄소 인증 제품입니다." }
  ]
}, "message": null }
```
- 폴백: LLM 실패/타임아웃 시 `recommendations: []` + message(빈 추천) → 비차단.

---

## 8. common

| 메서드 | 경로 | Auth | 설명 |
| --- | --- | --- | --- |
| GET | `/api/health` | ❌ | 헬스체크(DB 불필요). `{ "status":"success", "data": { "status":"UP" } }` |

> 커뮤니티 API는 본 백엔드 범위 외(Out of Scope, [PRD](./PRD.md) 7장).
