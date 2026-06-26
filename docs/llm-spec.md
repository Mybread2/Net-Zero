# WalkMate — LLM 기능 명세 (AWS Bedrock / Amazon Nova Lite)

> LLM 기능별 입출력 스키마, 프롬프트 설계 방향, Bedrock 연동, JSON 강제·폴백·캐싱 전략.
> 관련: [api-spec](./api-spec.md)(엔드포인트), [infra](./infra.md)(IAM/리전), [PRD](./PRD.md).

## 0. 공통 연동 정보

| 항목 | 값 |
| --- | --- |
| 모델 ID | **`us.amazon.nova-lite-v1:0`** (us-* cross-region inference profile) |
| 리전 | **`us-east-1`** |
| API | **Converse API** (`bedrockruntime.converse`) — 멀티모달·툴 지원 |
| SDK | AWS SDK for Java v2 — `software.amazon.awssdk:bedrockruntime` (BOM 관리) |
| 자격증명 | **IAM Role only** — EC2 instance profile `SafeInstanceProfile-{username}` → `DefaultCredentialsProvider`(instance metadata 자동 획득) |

> **보안 하드룰**: Access Key/Secret를 코드·환경변수·설정파일에 **절대 하드코딩/주입 금지**.
> 모든 Bedrock 호출은 IAM Role 기반. 상세는 [infra](./infra.md).

### 0.1 모듈 구조 (`ai` 패키지에 집약)
LLM 호출은 도메인에 흩지 않고 `com.inha.netzero.ai` 한 곳에 모은다.
```
ai/
├── client/   BedrockClient        # Converse 호출 래퍼 (모델ID/리전/타임아웃)
├── service/  LlmService           # 기능별 메서드(generateSellDraft, recommendProducts, summarizeLowCarbon)
├── prompt/   PromptTemplates      # 시스템/유저 프롬프트 템플릿
└── dto/      SellDraft, Recommendation, ...  # LLM 입출력 DTO + JSON 매핑
```
도메인 서비스(market/marketplace)는 `LlmService` 인터페이스만 호출한다.

### 0.2 공통 전략
- **출력 JSON 강제**: 프롬프트로 JSON 스키마를 명시 + 시스템 지시("JSON만 출력"). 가능하면
  Converse `toolConfig`(tool-use)로 스키마 강제. 응답은 안전 파싱(코드블록/잡텍스트 제거 후 파싱).
- **타임아웃**: Bedrock 호출 타임아웃(예: 8s) 설정. 초과 시 폴백.
- **폴백**: 파싱 실패/타임아웃/예외 시 기능별 **빈 결과**(빈 초안/빈 추천)를 반환해 본 기능(글쓰기·매칭)을
  막지 않는다. 컨트롤러는 `502 LLM_UNAVAILABLE`로 실패시키지 말고 빈 데이터 + message로 응답.
- **캐싱**: 저탄소 한 줄 요약 등 결과는 DB에 저장해 **요청마다 호출 금지**. Nova Lite는 저비용·저지연이나
  불필요한 반복 호출은 금지.
- **enum 강제**: 카테고리류 출력은 서버에서 enum 매핑 검증(미일치 시 `ETC` 등 안전값으로 정규화).

---

## 1. LLM-1 — 중고거래 "팔아요" 판매글 자동 작성

엔드포인트: `POST /api/market/items/draft` ([api-spec](./api-spec.md) 6.4).

### 1.1 입력
| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `image` | multipart file 또는 `imageBase64` | ✅ | 상품 사진. Nova Lite 멀티모달로 inline 전달(업로드 전 바이트 사용 가능) |
| `keywords` | string[]/comma | ❌ | 보조 키워드(예: "방석","극세사") |

### 1.2 출력 스키마
```json
{
  "title": "string (간결한 판매 제목)",
  "description": "string (상태/특징/사용감 등 상세설명)",
  "suggestedPrice": 15000,
  "suggestedCategory": "FOOD|TOY|DAILY|CLOTHING|ETC"
}
```
- `suggestedPrice`: **참고용**(환각 위험 → 응답 message·문서에 명시). 정수(원).
- `suggestedCategory`: `MarketCategory` enum 중 하나로 **강제**(서버 검증, 미일치 시 `ETC`).

### 1.3 프롬프트 설계 방향
- **시스템**: "너는 중고거래 판매글 작성 도우미다. 입력 이미지를 보고 한국어로 매력적이고 정직한
  판매글 초안을 만든다. 반드시 아래 JSON 스키마로만 응답한다. 카테고리는 주어진 enum 중 하나."
- **유저**: 이미지(inline) + `keywords` + 스키마/enum 목록 명시. 가격은 "대략적 참고가, 모르면 보수적
  추정" 지시. 과장/허위 금지.
- 멀티모달: Converse `content`에 `image`(bytes, format=jpeg/png) + `text` 블록을 함께 전달.

### 1.4 동작 / 폴백
- 성공: 위 JSON 파싱 → 그대로 반환(`message`에 "추천 가격은 참고용" 안내).
- 실패/타임아웃: `{ "title":"", "description":"", "suggestedPrice":null, "suggestedCategory":"ETC" }`
  형태의 빈 초안 + message. 사용자가 직접 작성 가능(글쓰기 비차단).
- 결과는 **초안**일 뿐, 실제 등록은 사용자가 수정 후 `POST /api/market/items`로 제출.

---

## 2. LLM-2 — 저탄소 마켓플레이스 추천 / 코멘트

### 2.1 (a) 상품별 "왜 저탄소인지" 한 줄 요약 — 시드 1회 생성·캐싱
- **시점**: 시드 데이터 적재(부트스트랩/배치) 시 상품별 1회 생성 → `MarketplaceProduct.lowCarbonSummary`에 저장.
- **요청마다 LLM 호출 금지** — 목록 조회(`GET /api/marketplace/products`)는 캐싱된 값을 그대로 반환.
- 입력: 상품 메타(회사/제목/카테고리/설명 등). 출력: 한 문장(한국어) 요약 문자열.
- 프롬프트 방향: "다음 상품이 왜 저탄소·친환경인지 보호자가 이해하기 쉽게 한 문장으로 설명." 과장 금지.
- 구현 위치: 시드 로더 또는 선택적 Lambda 배치([infra](./infra.md)). 실패 시 `null` 저장 후 추후 재생성.

### 2.2 (b) 추천 — `POST /api/marketplace/recommendations`
- 입력: `{ "query": "사용자 질의" }` + 서버가 **본인 강아지 프로필**과 **상품 카탈로그(소규모 전체)** 자동 주입.
- 카탈로그가 작으므로 **전체를 프롬프트에 grounding**으로 주입(벡터DB/RAG 불필요).

#### 출력 스키마
```json
{
  "recommendations": [
    { "productId": 1, "reason": "string (추천 이유, 한국어 한두 문장)" }
  ]
}
```
- `productId`는 **주입한 카탈로그에 존재하는 id만** 허용(서버 검증으로 환각 id 제거).
- 응답 조립 시 서버가 `productId`로 상품을 조인해 `title` 등을 채워 반환([api-spec](./api-spec.md) 7.3).

#### 프롬프트 설계 방향
- **시스템**: "너는 반려견 저탄소 용품 추천 도우미다. 주어진 카탈로그 안에서만 추천한다.
  카탈로그에 없는 상품/ID는 만들지 마라. JSON 스키마로만 응답."
- **유저**: 강아지 프로필(품종/나이/성향/알러지 등 가용 정보) + 사용자 query + 카탈로그 목록
  (`id|company|title|category|price|lowCarbonSummary`) + 스키마.
- 추천 개수 상한(예: 3~5개) 지시.

#### 동작 / 폴백
- 실패/타임아웃/파싱 실패: `{ "recommendations": [] }` + message → 화면은 빈 상태로 처리(비차단).
- 카탈로그에 없는 `productId`는 필터링.

---

## 3. 비용·지연 가이드
- Nova Lite는 저비용·저지연이라 실시간 보조(글쓰기/추천)에 적합. 단:
  - 저탄소 요약은 **시드 1회**만(캐싱).
  - 추천은 사용자 트리거 시에만 호출(자동 폴링/반복 호출 금지).
  - 타임아웃 + 폴백으로 사용자 대기·실패 전파를 차단.
- 모니터링(선택): 호출 수/지연/실패율 로깅. 키 없이 IAM Role로만 호출되는지 점검.
