# CLAUDE.md — WalkMate (repo: netzero)

> 이 파일은 **규칙과 진입점**만 담는다. 상세 스펙은 `docs/`로 위임한다(아래 [문서 맵](#문서-맵)).

## 프로젝트 한 줄 요약
반려견 보호자를 위한 통합 앱 **WalkMate**(레포·패키지명 `netzero`). 3축: **산책 매칭(핵심)** ·
**중고거래/저탄소 마켓** · 커뮤니티(백엔드 범위 외). 가칭이며 패키지/레포명은 `netzero` 유지.

## 기술 스택
- **Java 21**, **Spring Boot 4.1.0**, Gradle. Boot 4 모듈형 스타터(`spring-boot-starter-webmvc`,
  `...-data-jpa`, `...-validation`).
- **DB: PostgreSQL** (운영 RDS, 로컬 H2 PostgreSQL 호환 모드). 근처 조회는 **Haversine 쿼리**(PostGIS 미사용).
- 인증: **JWT**(email/password). 실시간: 위치=폴링, 채팅=**STOMP WebSocket**(폴백 폴링).
- LLM: **AWS Bedrock + Amazon Nova Lite**(`us.amazon.nova-lite-v1:0`, `us-east-1`).
- (추가 예정 의존성) `spring-boot-starter-websocket`, `software.amazon.awssdk:bedrockruntime`/`s3`, `io.jsonwebtoken:jjwt*`.

## AWS 배포 한 줄 요약
**EC2 + RDS(PostgreSQL) + S3 + Bedrock @ us-east-1.** 상세·제약은 [docs/infra.md](docs/infra.md).

---

## 디렉토리 / 패키지 구조

```
4zero/
├── backend/     # Spring Boot 4 (Java 21, Gradle) — REST API
├── frontend/    # Next.js (App Router, TS) — 웹 UI (커뮤니티는 프론트만)
├── docs/        # 명세 문서 (PRD / api-spec / domain-model / llm-spec / infra)
└── CLAUDE.md
```

**도메인형 패키지 구조** (`com.inha.netzero.*`):
```
com.inha.netzero
├── global/       # config, response(ApiResponse/PageResponse), exception(handler/error code), security(JWT)
├── auth/         # 회원가입/로그인, JWT 발급
├── user/         # 사용자/온보딩/강아지(Dog)/위치/고스트모드
├── walk/         # 산책 매칭: 근처 사람, 지도 핀, 친구(FriendRequest)
├── chat/         # 1:1 채팅(ChatRoom/ChatMessage), STOMP
├── market/       # 중고거래(MarketItem/Image/Heart)
├── marketplace/  # 저탄소 마켓(MarketplaceProduct)
└── ai/           # LLM/Bedrock: BedrockClient, LlmService, PromptTemplates
```
각 도메인은 `controller / service / repository / domain(entity) / dto` 하위로 나눈다.

---

## 빌드 / 실행 / 테스트
```bash
cd backend
./gradlew bootRun        # Windows: .\gradlew.bat bootRun  (기본 프로파일 local = H2 인메모리)
./gradlew test           # 테스트
./gradlew build          # 빌드(jar)
```
- 프로파일: `local`(H2, 기본) / `prod`(RDS, `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` 환경변수).
- 헬스체크: `GET /api/health`. 프론트는 `cd frontend && npm install && npm run dev`(포트 3000, `/api/*` 프록시).

---

## 코딩 컨벤션
- **계층 분리**: `Controller`(요청/응답·검증) → `Service`(트랜잭션·비즈니스) → `Repository`(영속).
  컨트롤러에 비즈니스 로직, 리포지토리에 도메인 규칙을 두지 않는다.
- **Entity ↔ DTO 분리**: 엔티티를 API로 직접 노출 금지. 요청 `*Request`, 응답 `*Response` DTO 사용.
- **네이밍**: 클래스 `PascalCase`, 메서드/필드 `camelCase`, 상수 `UPPER_SNAKE`, enum 값 `UPPER_SNAKE`.
  컨트롤러 `XxxController`, 서비스 `XxxService`, 리포지토리 `XxxRepository`, DTO `XxxRequest/XxxResponse`.
- 경로는 `/api/{domain}/...` (kebab/소문자). 검증은 `spring-boot-starter-validation`(`@Valid`).
- 시각은 UTC(`Instant`)로 저장, 금액은 정수(원).

## 공통 API 응답 포맷
- 래퍼 `ApiResponse<T>`: `{ "status": "success"|"error", "data": T, "message": string|null }`.
  실패 시 `code`(에러 코드) 포함.
- 페이징 `PageResponse<T>`: `{ content, page, size, totalElements, totalPages, hasNext }`.
- 상세·예시는 [docs/api-spec.md](docs/api-spec.md) §0.

## 예외 처리 전략
- 전역 핸들러 `@RestControllerAdvice` 하나로 모든 예외 → `ApiResponse(error)`로 변환.
- 도메인 예외는 공통 `ErrorCode`(enum: HTTP status + code + 기본 message)로 표현.
- 공통 코드: `VALIDATION_ERROR`(400), `UNAUTHORIZED`(401), `FORBIDDEN`(403), `NOT_FOUND`(404),
  `CONFLICT`(409), `LLM_UNAVAILABLE`(502), `INTERNAL_ERROR`(500). ([api-spec](docs/api-spec.md) §0.3)
- **LLM 실패는 본 기능을 막지 않는다**: 빈 초안/빈 추천으로 폴백(에러로 전파 금지). ([llm-spec](docs/llm-spec.md))

---

## 보안 하드룰 (반드시 준수)
- **AWS Access Key 사용 금지.** 모든 AWS 호출은 **IAM Role 기반**.
  - EC2: instance profile **`SafeInstanceProfile-{username}`**, EC2 외: **`SafeRole-{username}`**.
  - SDK는 `DefaultCredentialsProvider`로 instance metadata에서 자격증명 자동 획득.
- **Access Key/Secret를 코드·환경변수·설정파일에 하드코딩/주입 금지.**
- 비밀값(DB 비밀번호 등)은 **환경변수 또는 SSM Parameter Store**로 관리.
- **S3 버킷명은 `{username}`으로 시작.** 리전 **`us-east-1`** 고정.
- 비밀번호는 BCrypt 해시 저장(평문 금지). `{username}`은 팀이 치환할 플레이스홀더.

---

## Git 커밋 컨벤션
- 형식: `type: 제목` (예: `feat: 근처 사람 목록 API 추가`).
- type: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- 제목은 한국어/명령형, 본문에 변경 이유. 한 커밋은 한 가지 변경.

---

## 핵심 도메인 용어집
| 용어 | 의미 |
| --- | --- |
| 고스트모드(ghost mode) | ON이면 본인 위치가 지도·근처목록에 노출 안 됨, OFF면 노출 |
| 근처 사람(nearby) | 반경(기본 2km) 내 + 최근 24시간 활동 + 비고스트 사용자 |
| 온라인(online) | `lastActiveAt`이 최근 5분 이내(친구 목록 초록 원 표시) |
| 사요(BUY) / 팔아요(SELL) | 중고거래 글 유형(`TradeType`). 노출/입력 필드가 다름 |
| 하트(heart) | 팔아요 글 좋아요 토글 + 개수 집계 |
| 저탄소 마켓(marketplace) | 운영자/시드 큐레이션 친환경 상품 마켓(별점 시드값, 작성 기능 없음) |
| 한 줄 요약(lowCarbonSummary) | "왜 저탄소인지" 문장. 시드 적재 시 LLM 1회 생성·DB 캐싱 |
| 초안(draft) | LLM-1이 만든 판매글 초안. 사용자가 수정 후 실제 작성 API로 제출 |

---

## 작업 범위 / 가정
- **커뮤니티는 백엔드 범위 외**(프론트 화면만). 저탄소 마켓 상세/구매·리뷰 작성도 범위 외.
- 강아지 1마리(설계는 1:N 여지). 위험 가정은 [docs/PRD.md](docs/PRD.md) §1 Open Questions 참조.

## 문서 맵
| 문서 | 내용 |
| --- | --- |
| [docs/PRD.md](docs/PRD.md) | 기능 명세·사용자 흐름·수용 기준·Open Questions |
| [docs/domain-model.md](docs/domain-model.md) | 엔티티·enum·관계·ERD |
| [docs/api-spec.md](docs/api-spec.md) | REST API(도메인별 요청/응답/에러) |
| [docs/llm-spec.md](docs/llm-spec.md) | Bedrock/Nova Lite 입출력·프롬프트·폴백·캐싱 |
| [docs/infra.md](docs/infra.md) | AWS 배포·IAM Role·RDS/S3·제약 |
