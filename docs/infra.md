# WalkMate — AWS 배포 구성 / 제약사항

> 해커톤 환경의 **하드 제약**을 반드시 준수한다. 관련: [llm-spec](./llm-spec.md)(Bedrock),
> [api-spec](./api-spec.md)(S3 presign). `{username}`은 팀이 실제 값으로 치환하는 **플레이스홀더**.

## 0. 하드 제약 (반드시 준수)

1. **사용 가능한 서비스만 사용**: `EC2`, `Lambda`, `RDS`, `DynamoDB`, `S3`, `API Gateway`,
   `Amplify`, `SQS`, `SNS`, `Bedrock`. **그 외 서비스 사용 금지.**
2. **리전: `us-east-1`** (버지니아 북부). Bedrock 모델은 **us-* cross-region inference profile** 사용.
3. **AWS Access Key 발급·사용 절대 금지. IAM Role만 사용.**
   - EC2(백엔드 앱): instance profile **`SafeInstanceProfile-{username}`**.
   - Lambda 등 EC2 외: **`SafeRole-{username}`**.
   - **코드/환경변수/설정파일에 Access Key·Secret 하드코딩·주입 금지.** AWS SDK의
     `DefaultCredentialsProvider`가 **instance metadata에서 자동 획득**하게 한다.
4. **S3 버킷 이름은 항상 `{username}`으로 시작.**

---

## 1. 권장 배포 구성

```
[Client / Next.js]
      │  HTTPS, /api/*
      ▼
[EC2  t3.small~t3.medium]  ← instance profile: SafeInstanceProfile-{username}
   Spring Boot 단일 앱 (prod 프로파일, port 8080)
      ├──(JDBC)────────────► [RDS PostgreSQL, Free Tier]  (퍼블릭 액세스, 수동 SG/접속정보)
      ├──(SDK v2, IAM Role)► [Bedrock  us.amazon.nova-lite-v1:0 @ us-east-1]
      └──(SDK v2, IAM Role)► [S3  {username}-... 버킷]  (이미지, presigned URL)
```

- **메인 앱은 EC2 권장.** Spring Boot는 콜드스타트가 커서 Lambda는 메인 앱에 부적합.
  Lambda는 **배치성/이벤트 처리에만 선택적** 사용(아래 5장).
- 앱 실행: `prod` 프로파일, DB 접속정보는 환경변수(`DB_URL`,`DB_USERNAME`,`DB_PASSWORD`)로 주입.
  AWS 자격증명은 **주입하지 않는다**(IAM Role 자동).

---

## 2. IAM Role (자격증명)

| 대상 | Role/Profile | 용도 |
| --- | --- | --- |
| EC2(백엔드 앱) | `SafeInstanceProfile-{username}` | Bedrock 호출, S3 read/write |
| Lambda 등 EC2 외 | `SafeRole-{username}` | 배치/이벤트 처리 시 Bedrock/S3/SQS 접근 |

- 필요한 정책(예시 권한, 실제 정책은 팀/운영자 구성):
  - Bedrock: `bedrock:InvokeModel` (대상: `us.amazon.nova-lite-v1:0` inference profile).
  - S3: `s3:GetObject`, `s3:PutObject` (버킷 `{username}-*`).
  - (선택) SQS/SNS/DynamoDB: 사용 시 해당 액션.
- **Access Key 미사용 검증**: 코드/`application-*.yaml`/CI에 `aws_access_key_id`, `secret` 류가
  존재하면 안 된다. SDK는 인자 없이 기본 클라이언트로 생성 → metadata에서 role 자동 획득.

---

## 3. RDS (PostgreSQL)

- Free Tier, **퍼블릭 액세스 허용**. EC2 자동 연결은 없으므로 **접속정보·보안그룹을 수동 구성**.
- 보안그룹: EC2의 SG(또는 EC2 퍼블릭 IP)에서 5432 inbound 허용. 가급적 소스 제한.
- 접속정보는 EC2 환경변수로 주입(`prod` 프로파일이 `${DB_URL}` 등 참조 — `backend/src/main/resources/application-prod.yaml`).
- 스키마: `ddl-auto=validate`(prod). 초기 스키마/시드는 마이그레이션 또는 부트스트랩 로더로 적재.
- (가정) 로컬 개발은 H2(인메모리, PostgreSQL 호환 모드) — RDS 불필요.

---

## 4. S3 (이미지 저장)

- **버킷명은 `{username}`으로 시작** (예: `{username}-walkmate-media`).
- 업로드 방식: **presigned URL 권장**([api-spec](./api-spec.md) 6.6) — 클라이언트가 S3로 직접 PUT,
  EC2 대역폭 절감. 백엔드는 URL 발급/검증만.
- DB에는 객체 URL만 저장(이미지 바이트 저장 안 함).
- 키 구조(예): `market/{uuid}.jpg`, `profile/{userId}.jpg`, `marketplace/{productId}.jpg`.
- LLM-1 draft는 **업로드 전 이미지 바이트를 Bedrock에 inline** 전달 가능(S3 경유 불필요).
- 공개 정책: 이미지 조회는 presigned GET 또는 제한적 public-read(팀 정책에 따름).

---

## 5. 선택적 구성요소 (필요 시에만, 근거 명시)

| 서비스 | 용도(선택) | 근거 |
| --- | --- | --- |
| **DynamoDB** | 실시간 위치/접속상태 같은 **고빈도 쓰기** 분리 | MVP는 RDS의 `User.lat/lng/lastActiveAt`로 충분. 트래픽 증가 시 위치만 DynamoDB로 분리 검토 |
| **Lambda** | 시드 저탄소 요약 생성, SQS 소비 등 **배치/이벤트** | 메인 앱(EC2)과 분리된 단발/비동기 작업에만 |
| **SQS/SNS** | 비동기 작업 큐 / 알림 fan-out | MVP 필수 아님. 채팅 알림·배치 트리거 확장 시 |
| **API Gateway** | Lambda 노출 또는 외부 엔드포인트 | 메인 트래픽은 EC2 직결이므로 MVP 기본 미사용 |
| **Amplify** | 프론트(Next.js) 호스팅 | 프론트 배포 옵션(백엔드 범위 외) |

> **MVP 기본값**: EC2 + RDS + S3 + Bedrock. 위 선택 요소는 필요성이 확인될 때만 도입하고,
> 도입 시 본 문서에 근거를 추가한다.

---

## 6. 환경변수 (EC2, `prod`)

| 변수 | 예시 | 비고 |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` | |
| `DB_URL` | `jdbc:postgresql://<rds-host>:5432/netzero` | RDS 엔드포인트 |
| `DB_USERNAME` / `DB_PASSWORD` | (시크릿) | 환경변수/파라미터스토어로 주입, 코드 하드코딩 금지 |
| `APP_S3_BUCKET` | `{username}-walkmate-media` | S3 버킷명 |
| `AWS_REGION` | `us-east-1` | (SDK 기본 리전; 자격증명은 미주입) |

> **금지**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` 등 자격증명 환경변수 주입 금지.
> 비밀값(DB 비밀번호 등)은 환경변수 또는 SSM Parameter Store로 관리.

---

## 7. 체크리스트
- [ ] 모든 AWS 호출이 IAM Role 기반(코드/설정에 Access Key 없음).
- [ ] 리전 `us-east-1`, Bedrock 모델 `us.amazon.nova-lite-v1:0`(us-* profile).
- [ ] S3 버킷명 `{username}` 시작.
- [ ] RDS 퍼블릭 액세스 + SG에서 EC2만 5432 허용, 접속정보는 환경변수.
- [ ] EC2 instance profile = `SafeInstanceProfile-{username}` 부착.
- [ ] 사용 서비스가 허용 목록(EC2/Lambda/RDS/DynamoDB/S3/API Gateway/Amplify/SQS/SNS/Bedrock) 내.
