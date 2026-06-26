# 백엔드 도메인 병렬 세션 프롬프트 (§2–5)

> WalkMate 백엔드 `§2 user · §3 walk · §4 friends · §5 chat` 를 **여러 Claude Code 세션에서 병렬**로 구현하기 위한
> 복붙용 프롬프트 모음. 각 세션 블록은 **자기완결**이라 그대로 복사해 새 세션에 붙여넣으면 된다.

## 사용법
1. **Session 0(공통 토대)은 이미 완료됨** (아래 "완료 상태" 참고). A~D 는 그 위에서 동작한다.
2. 아래 **A / B / C / D 각 블록을 서로 다른 세션에 하나씩** 붙여넣어 **병렬** 실행한다.
3. 각 세션 종료 시 빌드 통과 → 네 세션 머지 후 루트에서 `./gradlew :backend:build` 한 번 더(통합 컴파일).

> **빌드 주의**: Gradle 이 JDK 17+ 를 잡아야 한다(기본이 JVM 8 이면 실패). 이 PC 엔 JDK 21 이 `C:\Users\good\.jdks\ms-21.0.10` 에 있다.
> Git Bash 예: `export JAVA_HOME="/c/Users/good/.jdks/ms-21.0.10" && ./gradlew :backend:build`.

## 충돌 방지 (반드시 준수)
- 각 세션은 **자기 도메인 패키지 파일만** 생성/수정한다.
- 공유 파일 **`UserRepository` / `UserService`(§2 제외) / `SecurityConfig` / 엔티티** 는 **수정 금지**(읽기 전용 의존). 커스텀 쿼리는 자기 패키지에 새 리포지토리 인터페이스로.
- **B(walk)와 C(friends)는 같은 `domain.walk` 패키지**를 공유하되 **파일명 접두사로 분리**: walk=`Walk*/Nearby*/MapUser*`, friends=`Friend*`. 서로의 파일을 절대 만지지 않는다.
- friends 를 별도 `domain.friends` 패키지로 빼고 싶으면 C 블록의 경로만 치환(엔티티는 그대로 `domain.walk.entity` 사용).

## Session 0 완료 상태 (A~D 가 의존하는 것 — 이미 존재)
- `global.response.ApiResponse<T>`: `success(T)` / `success(T,String)` / `error(ErrorCode,String)`
- `global.response.PageResponse<T>`: `of(Page<T>)`
- `global.exception.ErrorCode`: `VALIDATION_ERROR,UNAUTHORIZED,FORBIDDEN,NOT_FOUND,CONFLICT,LLM_UNAVAILABLE,INTERNAL_ERROR`
- `global.exception.BusinessException(ErrorCode)` / `(ErrorCode,String)` + 강화된 `GlobalExceptionHandler`
- `global.security.CurrentUserId` (+ ArgumentResolver) → 컨트롤러 파라미터 `@CurrentUserId Long userId`
- `SecurityConfig` permitAll 에 `/ws/**` 추가됨(chat STOMP 용)

---

## A — user §2

```text
[프로젝트] WalkMate 백엔드. repo: netzero, package com.inha.netzero. Java 21 / Spring Boot 4.1.0 / Gradle 멀티프로젝트(:backend).
[규칙] CLAUDE.md 준수: Controller→Service→Repository 계층 분리, Entity 직접 노출 금지(*Request/*Response DTO),
경로 /api/{domain}, @Valid 검증, 시각 Instant(UTC). 시작 전 docs/api-spec.md §2 와 User.java/Dog.java 를 읽어라.

[인증 — 완성됨, 수정 금지] 컨트롤러에서 본인 id 는 `@CurrentUserId Long userId`(com.inha.netzero.global.security.CurrentUserId)로 주입.
[공통 토대 — 완성됨, 그대로 사용]
- global.response.ApiResponse<T>: success(T)/success(T,String)/error(ErrorCode,String). 모든 컨트롤러는 ApiResponse<...> 반환.
- global.response.PageResponse<T>: of(Page<T>).
- global.exception.ErrorCode: VALIDATION_ERROR,UNAUTHORIZED,FORBIDDEN,NOT_FOUND,CONFLICT,INTERNAL_ERROR.
- global.exception.BusinessException(ErrorCode)/(ErrorCode,String): 도메인 오류는 throw 만 하면 핸들러가 ApiResponse(error)+status 로 변환. try/catch 직접 응답 금지.
[엔티티 — 수정 금지, 읽기 전용]
- User 메서드: updateProfile(String nickname,Gender gender,boolean hasDog), addDog(Dog), clearDogs(), updateLocation(double lat,double lng,Instant at), setGhostMode(boolean), changeProfileImage(String), isOnboarded().
  getter: getId/getEmail/getNickname/getGender/isHasDog/isGhostMode/getLat/getLng/getLastActiveAt/getProfileImageUrl/getDogs.
- Dog 생성자: new Dog(String name, Gender gender, String breed, Integer age, DogTemperament temperament, String imageUrl); User.addDog(dog) 로 연결.
- enum: Gender{MALE,FEMALE,UNKNOWN}, DogTemperament{ACTIVE,CALM,FRIENDLY,SHY,INDEPENDENT,ETC}.
- domain.user.repository.UserRepository: JpaRepository<User,Long>+findByEmail/existsByEmail. (이 도메인 소유이므로 finder 추가는 가능)
[공통 규칙] online = lastActiveAt!=null && lastActiveAt.isAfter(Instant.now().minusSeconds(300)). profileImageUrl 폴백 = user.getProfileImageUrl(), 없으면 첫 dog imageUrl. 응답 JSON 은 docs/api-spec.md §2 예시와 정확히 일치.

[작업] docs/api-spec.md §2(user) 구현. domain/user 아래 controller/service/dto 생성, 기존 UserService.java 이어쓰기.
엔드포인트(모두 인증 필요, @CurrentUserId Long userId):
- 2.1 GET /api/users/me → 본인+강아지. data:{id,email,nickname,gender,hasDog,ghostMode,profileImageUrl,lastActiveAt,dogs:[{id,name,gender,breed,age,temperament,imageUrl}]}. hasDog=false면 dogs:[].
- 2.2 PATCH /api/users/me → 온보딩/프로필 부분수정. 요청 {nickname,gender,hasDog,dog:{name,gender,breed,age,temperament}}.
    규칙: hasDog=true면 dog 필수(name/gender/breed/temperament 필수, age 선택) → updateProfile 후 clearDogs()+addDog(new Dog(...)). hasDog=false면 dog 무시 + clearDogs(). @Valid 로 검증(실패는 자동 VALIDATION_ERROR). 응답은 2.1 형태(갱신본).
- 2.3 PATCH /api/users/me/location → {lat,lng}. user.updateLocation(lat,lng,Instant.now()) (lastActiveAt 동시 갱신). 응답 data:{lat,lng,lastActiveAt}.
- 2.4 PATCH /api/users/me/ghost-mode → {enabled}. 응답 data:{ghostMode}.
- 2.5 GET /api/users/{id} → 공개 프로필 {userId,nickname,profileImageUrl,dogs 요약,online}. lat/lng 미포함. 고스트모드여도 프로필 자체는 노출. 없으면 BusinessException(ErrorCode.NOT_FOUND).

DTO 는 domain/user/dto 에 분리(UserMeResponse/UserUpdateRequest(+DogRequest)/LocationUpdateRequest/LocationResponse/GhostModeRequest/GhostModeResponse/UserProfileResponse 등).
필요시 domain/user/repository/DogRepository 생성. 다른 도메인 패키지/SecurityConfig 는 건드리지 마라.
[검증] JAVA_HOME 을 JDK21 로 두고 루트에서 ./gradlew :backend:build 통과(Windows: .\gradlew.bat).
```

---

## B — walk §3

```text
[프로젝트] WalkMate 백엔드. repo: netzero, package com.inha.netzero. Java 21 / Spring Boot 4.1.0 / Gradle 멀티프로젝트(:backend).
[규칙] CLAUDE.md 준수: 계층 분리, Entity 직접 노출 금지(DTO), 경로 /api/{domain}, @Valid, Instant(UTC). 시작 전 docs/api-spec.md §3 과 User.java 를 읽어라.

[인증/토대 — 완성됨, 수정 금지] @CurrentUserId Long userId 로 본인 주입.
- global.response.ApiResponse<T>: success(T)/error(ErrorCode,String). 모든 컨트롤러는 ApiResponse<...> 반환.
- global.exception.ErrorCode{VALIDATION_ERROR,UNAUTHORIZED,FORBIDDEN,NOT_FOUND,CONFLICT,INTERNAL_ERROR} + BusinessException(ErrorCode[,String]) throw → 핸들러가 ApiResponse(error)+status 변환.
- domain.user.repository.UserRepository: JpaRepository<User,Long>. 읽기 전용(수정 금지). 커스텀 쿼리는 네 패키지(domain.walk.repository)에 새 인터페이스로.
- User getter: getId/getNickname/getProfileImageUrl/getLat/getLng/getLastActiveAt/isGhostMode/getDogs.
[공통 규칙] online = lastActiveAt!=null && lastActiveAt.isAfter(Instant.now().minusSeconds(300)). profileImageUrl 폴백 = user.getProfileImageUrl(), 없으면 첫 dog imageUrl. 응답 JSON 은 §3 예시와 정확히 일치.

[파일 소유 경계] domain.walk 패키지를 쓰되 이름은 Walk*/Nearby*/MapUser* 접두사만 사용한다. 같은 패키지의 Friend* 파일은 friends 세션 소유이므로 절대 생성/수정하지 마라.

[작업] docs/api-spec.md §3(walk, 근처/지도) 구현(인증 필요, @CurrentUserId Long userId):
- 3.1 GET /api/walk/nearby?radius=2000 → 본인 좌표 기준 반경(m, 기본 2000) 내 + lastActiveAt 24시간 이내 + ghostMode=false + 본인 제외.
    응답 data:[{userId,nickname,profileImageUrl,lastActiveAt,distanceMeters,online}], 거리 오름차순.
    본인 lat/lng 가 null 이면 BusinessException(ErrorCode.VALIDATION_ERROR,"위치를 먼저 갱신하세요").
- 3.2 GET /api/walk/map-users?radius=2000 → 반경 내 + online(최근 5분) + ghostMode=false + 본인 제외.
    응답 data:[{userId,nickname,profileImageUrl,lat,lng,online}].

[구현 — 이식성 우선]
- domain/walk/repository/NearbyUserRepository: JPQL 로 후보 1차 필터만 DB 에서(ghostMode=false, lat/lng not null, id<>:me, lastActiveAt>=:threshold).
- 거리(Haversine)는 WalkService 의 Java 에서 계산해 radius 로 필터+정렬(H2/Postgres 함수 차이 회피). R=6371000m, distance = R*acos(sin(rad(lat1))*sin(rad(lat2)) + cos(rad(lat1))*cos(rad(lat2))*cos(rad(lng2)-rad(lng1))).
- nearby threshold = Instant.now().minus(24h), map-users threshold = Instant.now().minusSeconds(300).
DTO 는 domain/walk/dto 에 NearbyUserResponse/MapUserResponse. 다른 도메인 패키지/SecurityConfig/UserRepository 는 건드리지 마라.
[검증] JAVA_HOME 을 JDK21 로 두고 ./gradlew :backend:build 통과.
```

---

## C — friends §4

```text
[프로젝트] WalkMate 백엔드. repo: netzero, package com.inha.netzero. Java 21 / Spring Boot 4.1.0 / Gradle 멀티프로젝트(:backend).
[규칙] CLAUDE.md 준수: 계층 분리, Entity 직접 노출 금지(DTO), 경로 /api/{domain}, @Valid, Instant(UTC). 시작 전 docs/api-spec.md §4 와 FriendRequest.java/User.java 를 읽어라.

[인증/토대 — 완성됨, 수정 금지] @CurrentUserId Long userId 로 본인 주입.
- global.response.ApiResponse<T>: success(T)/error(ErrorCode,String). 모든 컨트롤러는 ApiResponse<...> 반환.
- global.exception.ErrorCode{VALIDATION_ERROR,UNAUTHORIZED,FORBIDDEN,NOT_FOUND,CONFLICT,INTERNAL_ERROR} + BusinessException(ErrorCode[,String]) throw → 핸들러가 ApiResponse(error)+status 변환.
- domain.user.repository.UserRepository: 읽기 전용. 상대 User 조회는 findById 사용.
- User getter: getId/getNickname/getProfileImageUrl/getLastActiveAt/getDogs.
[공통 규칙] online = lastActiveAt!=null && lastActiveAt.isAfter(Instant.now().minusSeconds(300)). profileImageUrl 폴백 = user.getProfileImageUrl(), 없으면 첫 dog imageUrl. 응답 JSON 은 §4 예시와 정확히 일치.

[엔티티 — 수정 금지] FriendRequest(domain.walk.entity): 생성자 new FriendRequest(User requester, User addressee)(status 기본 PENDING), accept()/reject(), getRequester/getAddressee/getStatus. 유니크 제약 (requester_id, addressee_id). enum FriendRequestStatus{PENDING,ACCEPTED,REJECTED}.
[파일 소유 경계] FriendRequest 는 domain.walk.entity 에 이미 있다(CLAUDE.md상 친구는 walk 도메인 소속). 새 파일은 domain.walk 패키지에 Friend* 접두사로만 만든다. Walk*/Nearby*/MapUser* 파일은 walk 세션 소유 — 만지지 마라.

[작업] docs/api-spec.md §4(friends) 구현(인증 필요, @CurrentUserId Long userId):
- 4.1 POST /api/friends/requests {addresseeId} → 201 data:{requestId,status:"PENDING"}. 본인에게 요청 400(VALIDATION_ERROR); 상대 없음 404; 이미 (me,other)/(other,me) PENDING 또는 ACCEPTED 존재 시 409 CONFLICT.
- 4.2 POST /api/friends/requests/{id}/accept → ACCEPTED. 4.3 POST .../reject → REJECTED. 권한: 해당 요청의 addressee 본인만(아니면 403 FORBIDDEN), 없으면 404. accept()/reject() 사용.
- 4.4 GET /api/friends/requests/sent → 본인=requester 인 PENDING. 4.5 GET .../received → 본인=addressee 인 PENDING.
    항목 data:[{requestId, user:{userId,nickname,profileImageUrl}, createdAt}] (sent→user=addressee, received→user=requester).
- 4.6 GET /api/friends → ACCEPTED 상대 목록. 정렬: online=true 먼저, 그다음 닉네임/최근접속. 항목 {userId,nickname,profileImageUrl,online}.
- 4.7 GET /api/friends/{userId} → 친구 관계인 경우만 상세(아니면 403). 응답은 §2.5 공개 프로필 + online.

[구현] domain/walk/repository/FriendRequestRepository: 중복요청 존재확인(양방향), sent/received 조회, ACCEPTED 친구 목록(requester=me 또는 addressee=me 인 ACCEPTED 에서 상대 추출). 상대 User 는 UserRepository 로 로드.
DTO 는 domain/walk/dto 에 Friend*(FriendRequestCreateRequest/FriendRequestResponse/FriendRequestItemResponse/FriendResponse 등). 다른 도메인 패키지/SecurityConfig/UserRepository/엔티티 는 건드리지 마라.
[검증] JAVA_HOME 을 JDK21 로 두고 ./gradlew :backend:build 통과.
```

---

## D — chat §5

```text
[프로젝트] WalkMate 백엔드. repo: netzero, package com.inha.netzero. Java 21 / Spring Boot 4.1.0 / Gradle 멀티프로젝트(:backend).
[규칙] CLAUDE.md 준수: 계층 분리, Entity 직접 노출 금지(DTO), 경로 /api/{domain}, @Valid, Instant(UTC). 시작 전 docs/api-spec.md §5 와 ChatRoom.java/ChatMessage.java 를 읽어라.

[인증/토대 — 완성됨, 수정 금지] REST 는 @CurrentUserId Long userId 로 본인 주입.
- global.response.ApiResponse<T>: success(T)/error(ErrorCode,String). REST 컨트롤러는 ApiResponse<...> 반환.
- global.response.PageResponse<T>: of(Page<T>) → {content,page,size,totalElements,totalPages,hasNext}.
- global.exception.ErrorCode{VALIDATION_ERROR,UNAUTHORIZED,FORBIDDEN,NOT_FOUND,CONFLICT,INTERNAL_ERROR} + BusinessException(ErrorCode[,String]) throw → 핸들러가 ApiResponse(error)+status 변환.
- global.security.JwtTokenProvider(@Component): generateToken(Long), getUserId(String), validate(String). STOMP 인증에 주입해서 사용.
- domain.user.repository.UserRepository: 읽기 전용. 상대/발신자 User 는 findById 로 로드.
- SecurityConfig 에 /ws/** 는 이미 permitAll 됨 — SecurityConfig 는 건드리지 마라.
[공통 규칙] profileImageUrl 폴백 = user.getProfileImageUrl(), 없으면 첫 dog imageUrl. 응답 JSON 은 §5 예시와 정확히 일치.

[엔티티 — 수정 금지] ChatRoom(domain.chat.entity): new ChatRoom(User userA, User userB), touch(Instant), getUserA/getUserB/getLastMessageAt. 유니크 (user_a_id,user_b_id) — 서비스에서 userA.id<userB.id 로 정규화해 저장(idempotent).
ChatMessage: new ChatMessage(ChatRoom room, User sender, String content), getCreatedAt()(BaseTimeEntity=송신시각), getSender, getContent. 인덱스 (room_id, created_at).

[작업] docs/api-spec.md §5(chat 1:1) 구현. domain/chat 아래 controller/service/repository/dto + WebSocket(STOMP).
REST(인증 필요, @CurrentUserId Long userId):
- 5.1 GET /api/chat/rooms → 본인 참여 방, lastMessageAt desc. 항목 {roomId, partner:{userId,nickname,profileImageUrl}, lastMessage, lastMessageAt}.
- 5.2 POST /api/chat/rooms {targetUserId} → idempotent: 정규화 키(min,max)로 방 조회, 있으면 반환 없으면 생성. 응답 data:{roomId}. 상대 없음 404, 본인 대상 400.
- 5.3 GET /api/chat/rooms/{roomId}/messages?after=&page=&size= → 방 참여자만(아니면 403, 없으면 404). after(메시지 id) 지정 시 그 id 이후만(폴링), 미지정 시 최신순 페이징. 응답 PageResponse 형태 {content:[{messageId,senderId,content,createdAt}],page,size,totalElements,totalPages,hasNext}.
- 5.4 POST /api/chat/rooms/{roomId}/messages {content} → 201 저장 메시지 반환 + room.touch(Instant.now()). (WebSocket 폴백)

STOMP WebSocket:
- domain/chat/config/WebSocketConfig(@EnableWebSocketMessageBroker): registerStompEndpoints("/ws").withSockJS(), setApplicationDestinationPrefixes("/app"), enableSimpleBroker("/topic","/queue"). (SecurityConfig /ws/** permitAll 은 이미 되어 있음 — 건드리지 마라)
- 인증: configureClientInboundChannel 에 ChannelInterceptor 추가 — STOMP CONNECT 프레임의 Authorization(Bearer) 토큰을 JwtTokenProvider 로 검증 후 Principal(userId) 설정.
- @MessageMapping("/chat.send") body {roomId,content} → ChatService 로 저장 후 SimpMessagingTemplate 으로 /topic/rooms/{roomId} 브로드캐스트.

[구현] domain/chat/repository: ChatRoomRepository(정규화 키 조회 findByUserAIdAndUserBId, 본인 참여 방 목록 lastMessageAt desc), ChatMessageRepository(room 별 페이징 + after(id) 이후 조회).
DTO 는 domain/chat/dto 에 ChatRoomResponse/ChatRoomCreateRequest/MessageResponse/MessageSendRequest 등. 다른 도메인 패키지/SecurityConfig/UserRepository/엔티티 는 건드리지 마라.
[검증] JAVA_HOME 을 JDK21 로 두고 ./gradlew :backend:build 통과.
```

---

## 통합 후 스모크 테스트(선택)
1. `./gradlew :backend:bootRun` (기본 `local`=H2). `GET /api/health` 200.
2. 토큰 발급: Google OAuth2 로그인 후 받은 `?token=...` 또는 `JwtTokenProvider.generateToken(userId)`.
3. `Authorization: Bearer <token>` 로 `GET /api/users/me`, `GET /api/walk/nearby`, `GET /api/friends`, `GET /api/chat/rooms` 호출 → ApiResponse 포맷/필드 확인.
