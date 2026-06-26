# netzero

백엔드(Spring Boot)와 프론트엔드(Next.js)를 함께 두는 단일 레포지토리.

## 구조

```
4zero/
├── backend/    # Spring Boot 4 (Java 21, Gradle) — REST API
└── frontend/   # Next.js (App Router, TypeScript) — 웹 UI
```

## 사전 요구사항

- JDK 21
- Node.js LTS (20+)
- PostgreSQL (운영 프로파일에서만 필요. 로컬 개발은 H2 인메모리라 불필요)

## 로컬 개발 실행

두 개를 각각 실행한다.

### 1) 백엔드 (포트 8080)

루트가 Gradle 멀티프로젝트라 루트에서 바로 실행할 수 있다. IDE도 루트(`4zero/`)를 열면 Gradle로 임포트된다.

```bash
# 루트에서 (권장)
./gradlew :backend:bootRun        # Windows PowerShell: .\gradlew.bat :backend:bootRun

# 또는 backend 폴더에서
cd backend && ./gradlew bootRun
```

- 기본 프로파일은 `local` → H2 인메모리 DB 사용 (별도 설치 불필요)
- H2 콘솔: http://localhost:8080/h2-console (JDBC URL `jdbc:h2:mem:netzero`)
- 헬스 체크: http://localhost:8080/api/health

### 2) 프론트엔드 (포트 3000)

```bash
cd frontend
npm install
npm run dev
```

- http://localhost:3000 접속
- `/api/*` 호출은 `next.config.ts`의 rewrites로 백엔드(8080)에 프록시됨 → 개발 중 CORS 불필요
- 백엔드 주소는 `frontend/.env.local`의 `BACKEND_URL`로 변경 가능 (`.env.example` 참고)

## API

| 메서드 | 경로            | 설명                    |
| ------ | --------------- | ----------------------- |
| GET    | `/api/health`   | 연결 확인 (DB 불필요)   |

## 운영 배포

백엔드를 `prod` 프로파일로 기동하고 PostgreSQL 접속 정보를 환경변수로 주입한다.

```bash
SPRING_PROFILES_ACTIVE=prod \
DB_URL=jdbc:postgresql://<host>:5432/<db> \
DB_USERNAME=<user> \
DB_PASSWORD=<password> \
./gradlew bootRun
```

## 아직 안 된 것 (추후)

Docker Compose, CI(GitHub Actions), 인증(Spring Security), DB 마이그레이션(Flyway) 등은 연결 토대 검증 후 별도 단계로 진행.

> 참고: `frontend_old_vite/`는 교체 전 Vite 템플릿 백업이다. 새 Next.js 동작 확인 후 삭제해도 된다.
