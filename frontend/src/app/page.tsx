"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  healthApi,
  userApi,
  walkApi,
  type MapUser,
  type NearbyUser,
} from "@/lib/api";
import { clearAuth, consumeAuthFromQuery, getToken, isOnboarded } from "@/lib/auth";
import styles from "./home.module.css";
import FooterBar from "@/components/FooterBar";
import WalkMap from "@/components/WalkMap";
import { type WalkUser } from "@/lib/walkMock";

type WalkStatus = "possible" | "resting" | "impossible";

// 백엔드 NearbyUser/MapUser 응답 두 개를 userId 키로 머지해 UI 의 WalkUser 모양에 맞춘다.
// 백엔드에 없는 필드(breed/personality/statusMessage/recentWalks)는 UI 가 빈 값을 자연스럽게 보여주도록 채운다.
function mergeWalkUsers(nearby: NearbyUser[], mapUsers: MapUser[]): WalkUser[] {
  const coordsByUserId = new Map(mapUsers.map((u) => [u.userId, u]));
  return nearby.map((n) => {
    const coords = coordsByUserId.get(n.userId);
    return {
      id: String(n.userId),
      name: n.nickname,
      distance: n.distanceMeters,
      status: (n.online ? "possible" : "resting") as WalkStatus,
      lastActive: formatRelativeTime(n.lastActiveAt),
      dog: {
        name: "",
        breed: "",
        personality: "warm" as const,
        photo: n.profileImageUrl ?? "/dangsquare_mascot_official.png",
      },
      statusMessage: "",
      coords: coords ? { lat: coords.lat, lng: coords.lng } : { lat: 0, lng: 0 },
      recentWalks: [],
    } satisfies WalkUser;
  });
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const diffSec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "방금 전";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  return `${Math.floor(diffSec / 86400)}일 전`;
}

type OnboardingData = {
  owner: {
    name: string;
    gender: "male" | "female" | "";
  };
  dog: {
    name: string;
    gender: "male" | "female" | "";
    breed: string;
    personality: "active" | "warm" | "shy" | "";
    photo: string | null;
  };
  completedAt: string;
};

export default function Home() {
  const router = useRouter();
  
  // 온보딩 & 사용자 정보
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);

  // 위치 상태 (기본값: 용산역)
  const [latitude, setLatitude] = useState(37.529896);
  const [longitude, setLongitude] = useState(126.964703);
  const [locationLoaded, setLocationLoaded] = useState(false);

  // 내 산책 상태 ("possible" | "resting" | "impossible")
  const [myWalkStatus, setMyWalkStatus] = useState<"possible" | "resting" | "impossible">("possible");

  // 견주 데이터
  const [users, setUsers] = useState<WalkUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<WalkUser[]>([]);
  
  // 선택된 견주 (상세 프로필 모달용)
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  
  // 하단 바텀시트 확장 여부
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  
  // 가까운 견주 목록 필터 ("all" | "possible" | "resting")
  const [filterType, setFilterType] = useState<"all" | "possible" | "resting">("all");

  // 모달 제어 상태
  const [showStatusSheet, setShowStatusSheet] = useState(false); // 내 상태 설정 모달
  const [showDevModal, setShowDevModal] = useState(false); // 개발자 백엔드 설정 모달

  // 백엔드 헬스/디버그
  const [health, setHealth] = useState<{ status: string; service: string; time: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 커스텀 알림/확인 모달 상태
  const [customAlert, setCustomAlert] = useState<{
    message: string;
    type: "success" | "warning" | "feature";
    onConfirm?: () => void;
  } | null>(null);

  const [customConfirm, setCustomConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // 헬스체크(개발자 모달용)
  const refreshHealth = useCallback(async () => {
    try {
      setError(null);
      setHealth(await healthApi.check());
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    }
  }, []);

  // 1. OAuth 콜백(?token=) 흡수 + 인증/온보딩 가드 + 로컬 캐시 로드
  useEffect(() => {
    // OAuth2 핸들러는 온보딩 완료 사용자에게 / 로 토큰을 같이 보낸다.
    const { onboarded } = consumeAuthFromQuery();

    if (!getToken()) {
      router.replace("/onboarding");
      return;
    }
    if (!onboarded && !isOnboarded()) {
      router.replace("/onboarding");
      return;
    }

    const dataStr = localStorage.getItem("dangsquare_onboarding_data");
    if (dataStr) {
      try {
        setOnboardingData(JSON.parse(dataStr));
      } catch (e) {
        console.error("Failed to parse onboarding data", e);
      }
    }

    const savedStatus = localStorage.getItem("dangsquare_walk_status") as WalkStatus | null;
    if (savedStatus && ["possible", "resting", "impossible"].includes(savedStatus)) {
      setMyWalkStatus(savedStatus);
    }

    setCheckingOnboarding(false);
    refreshHealth();
  }, [router, refreshHealth]);

  // 2. Geolocation 사용자 위치 확보
  useEffect(() => {
    console.log("[Home] Geolocation useEffect fired. locationLoaded:", locationLoaded);
    if (typeof window !== "undefined" && navigator.geolocation) {
      console.log("[Home] Requesting geolocation...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("[Home] Geolocation SUCCESS:", position.coords.latitude, position.coords.longitude);
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setLocationLoaded(true);
        },
        (error) => {
          console.warn("[Home] Geolocation FAILED, using default (Yongsan):", error.message);
          setLocationLoaded(true);
        },
        { enableHighAccuracy: true, timeout: 3000 }
      );
    } else {
      console.warn("[Home] Geolocation API not available. Using default.");
      setLocationLoaded(true);
    }
  }, []);

  // 3. 위치 좌표가 확정되면 서버에 좌표를 갱신하고 근처/지도 사용자 폴링.
  //    백엔드는 nearby/map-users 호출 시 본인 좌표가 저장돼 있어야 결과를 준다.
  //    "impossible" 상태는 위치/노출을 비활성화 — 폴링 자체를 건너뛴다.
  //    (목록 비우기는 상태 변경 핸들러에서 처리)
  useEffect(() => {
    if (!locationLoaded || myWalkStatus === "impossible") return;

    let cancelled = false;

    const tick = async () => {
      try {
        await userApi.updateLocation(latitude, longitude);
        const [nearby, mapUsers] = await Promise.all([
          walkApi.nearby(2000),
          walkApi.mapUsers(2000),
        ]);
        if (!cancelled) setUsers(mergeWalkUsers(nearby, mapUsers));
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/onboarding");
          return;
        }
        // 위치 미저장(400) 등은 다음 폴링에서 자연 해소됨 → 조용히 무시.
      }
    };

    tick();
    const id = window.setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [latitude, longitude, locationLoaded, myWalkStatus, router]);

  // 4. 필터 타입에 따른 리스트 필터링
  useEffect(() => {
    if (filterType === "all") {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter((user) => user.status === filterType));
    }
  }, [users, filterType]);

  // 온보딩 리셋
  const handleResetOnboarding = () => {
    setCustomConfirm({
      message: "온보딩을 다시 진행하시겠습니까?\n현재 저장된 정보가 모두 초기화됩니다.",
      onConfirm: () => {
        localStorage.removeItem("dangsquare_onboarding_completed");
        localStorage.removeItem("dangsquare_onboarding_data");
        localStorage.removeItem("dangsquare_walk_status");
        router.push("/onboarding");
      }
    });
  };

  // 로그아웃: 토큰/캐시 비우고 로그인 화면으로.
  const handleLogout = () => {
    clearAuth();
    router.replace("/onboarding");
  };

  // 기능 알림 공통 헬퍼
  const handleFeatureAlert = (featureName: string) => {
    setCustomAlert({
      message: `"${featureName}" 기능은 다음 업데이트에 추가될 예정입니다!\n단추가 곧 안내해 드릴게요 🐶`,
      type: "feature"
    });
  };

  // 산책 상태 변경 반영 및 저장. impossible 로 바뀌면 폴링이 멈추므로 화면의 사용자도 비운다.
  const handleSaveMyStatus = (status: "possible" | "resting" | "impossible") => {
    setMyWalkStatus(status);
    if (status === "impossible") setUsers([]);
    localStorage.setItem("dangsquare_walk_status", status);
    setShowStatusSheet(false);
    setCustomAlert({
      message: "산책 상태가 성공적으로 변경되었습니다! 🐾",
      type: "success"
    });
  };

  // 개별 견주 산책 요청 보내기
  const handleRequestWalk = (userName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // 목록 클릭 이벤트 전파 방지
    setCustomAlert({
      message: `${userName} 견주님께 산책 요청을 보냈습니다!\n상대방이 수락하면 채팅방이 개설됩니다. ⚡`,
      type: "success"
    });
  };

  // 지도 또는 프로필 칩에서 선택 시 핸들러
  const handleSelectUser = (userId: string | null) => {
    if (userId === "me") {
      setShowStatusSheet(true);
    } else {
      setActiveUserId(userId);
    }
  };

  if (checkingOnboarding) {
    return (
      <div className={styles.container}>
        <div style={{ color: "#0e7060", fontWeight: 600 }}>온보딩 여부를 확인하는 중…</div>
      </div>
    );
  }

  const activeUser = users.find((u) => u.id === activeUserId);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        
        {/* 1. Header */}
        <header className={styles.headerBlock}>
          <div className={styles.logoRow}>
            <div className={styles.logoText}>Dangsquare</div>
          </div>
          
          <div className={styles.headerActions}>
            {/* 검색 아이콘 */}
            <button 
              type="button" 
              className={styles.iconBtn}
              onClick={() => handleFeatureAlert("검색")}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.3">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            {/* 알림 아이콘 */}
            <button 
              type="button" 
              className={styles.iconBtn}
              onClick={() => handleFeatureAlert("알림")}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.3">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className={styles.alarmDot}></span>
            </button>

            {/* 개발자 / 백엔드 상태 모달 버튼 */}
            <button 
              type="button" 
              className={styles.devBtn}
              onClick={() => setShowDevModal(true)}
            >
              백엔드 ⚙️
            </button>
          </div>
        </header>

        {/* 2. Top Users Profile List (가로 스크롤) */}
        <div className={styles.topUsersWrapper}>
          {/* '나' 프로필 칩 */}
          {onboardingData && (
            <div 
              className={`${styles.userChip} ${activeUserId === "me" ? styles.userChipActive : ""}`}
              onClick={() => handleSelectUser("me")}
            >
              <div className={styles.userChipAvatarContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={onboardingData.dog.photo || "/dangsquare_mascot_official.png"} 
                  alt="My Dog" 
                  className={styles.userChipPhoto}
                />
                <span 
                  className={styles.userChipOnlineBadge}
                  style={{
                    backgroundColor: myWalkStatus === "possible" ? "#10B981" : myWalkStatus === "resting" ? "#F59E0B" : "#9CA3AF"
                  }}
                ></span>
              </div>
              <span className={styles.userChipName}>나</span>
            </div>
          )}

          {/* 주변 견주 리스트 */}
          {users.map((user) => (
            <div 
              key={user.id}
              className={`${styles.userChip} ${activeUserId === user.id ? styles.userChipActive : ""}`}
              onClick={() => handleSelectUser(user.id)}
            >
              <div className={styles.userChipAvatarContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={user.dog.photo} 
                  alt={user.name} 
                  className={styles.userChipPhoto}
                />
                <span 
                  className={styles.userChipOnlineBadge}
                  style={{
                    backgroundColor: user.status === "possible" ? "#10B981" : user.status === "resting" ? "#F59E0B" : "#9CA3AF"
                  }}
                ></span>
              </div>
              <span className={styles.userChipName}>{user.name}</span>
            </div>
          ))}
        </div>

        {/* 3. Map (실제 지도 혹은 가상 하이브리드 지도) */}
        <div className={styles.mapWrapper}>
          {locationLoaded ? (
            <WalkMap
              latitude={latitude}
              longitude={longitude}
              users={users}
              activeUserId={activeUserId}
              onSelectUser={handleSelectUser}
              myStatus={myWalkStatus}
            />
          ) : (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", backgroundColor: "#e3ece9", color: "#0e7060", fontWeight: 600 }}>
              위치 정보를 가져오는 중입니다… 🗺️
            </div>
          )}
        </div>

        {/* 4. Bottom Sheet (가까운 견주 리스트) */}
        <div className={`${styles.bottomSheet} ${isSheetExpanded ? styles.sheetExpanded : styles.sheetCollapsed}`}>
          {/* 드래그 핸들 및 타이틀 헤더 */}
          <div 
            className={styles.sheetHeader}
            onClick={() => setIsSheetExpanded(!isSheetExpanded)}
          >
            <div className={styles.dragHandleBar} />
            <div className={styles.sheetTitleArea}>
              <span className={styles.sheetTitle}>가까운 견주</span>
              <span className={styles.sheetCountBadge}>{filteredUsers.length}명</span>
            </div>
            
            {/* 토글 회전 화살표 */}
            <div className={styles.sheetToggleIcon}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </div>
          </div>

          {/* 바텀시트 컨텐츠 */}
          <div className={styles.sheetContent}>
            {/* 필터 칩 */}
            <div className={styles.filterRow}>
              <button 
                type="button" 
                className={`${styles.filterChip} ${filterType === "all" ? styles.filterChipActive : ""}`}
                onClick={() => setFilterType("all")}
              >
                전체
              </button>
              
              <button 
                type="button" 
                className={`${styles.filterChip} ${filterType === "possible" ? styles.filterChipActive : ""}`}
                onClick={() => setFilterType("possible")}
              >
                <span className={styles.filterDot} style={{ backgroundColor: "#10B981" }}></span>
                산책 가능
              </button>

              <button 
                type="button" 
                className={`${styles.filterChip} ${filterType === "resting" ? styles.filterChipActive : ""}`}
                onClick={() => setFilterType("resting")}
              >
                <span className={styles.filterDot} style={{ backgroundColor: "#F59E0B" }}></span>
                휴식 중
              </button>
            </div>

            {/* 견주 목록 */}
            <div className={styles.ownerList}>
              {filteredUsers.map((user) => (
                <div 
                  key={user.id} 
                  className={styles.ownerItem}
                  onClick={() => handleSelectUser(user.id)}
                >
                  <div className={styles.ownerLeft}>
                    <div className={styles.ownerAvatarWrapper}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={user.dog.photo} alt={user.name} className={styles.ownerAvatar} />
                      <span 
                        className={styles.ownerOnlineDot}
                        style={{
                          backgroundColor: user.status === "possible" ? "#10B981" : user.status === "resting" ? "#F59E0B" : "#9CA3AF"
                        }}
                      ></span>
                    </div>

                    <div className={styles.ownerMeta}>
                      <div className={styles.ownerNameRow}>
                        <span className={styles.ownerName}>{user.name}</span>
                        <span className={styles.ownerDistance}>({user.distance}m)</span>
                      </div>
                      <div className={styles.ownerDogInfo}>{user.dog.name} • {user.dog.breed}</div>
                      <div className={`${styles.ownerStatusBadge} ${
                        user.status === "possible" ? styles.badgeWalkPossible : styles.badgeWalkResting
                      }`}>
                        <span>{user.status === "possible" ? "🟢 산책 가능" : "🟡 휴식 중"}</span>
                        <span className={styles.lastActiveTime}>• {user.lastActive}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className={styles.requestBtn}
                    onClick={(e) => handleRequestWalk(user.name, e)}
                  >
                    산책요청
                  </button>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF", fontSize: "14px" }}>
                  주변에 해당하는 견주가 없습니다. 🐾
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. FooterBar (하단 네비게이션) */}
        <FooterBar activeTab="matching" onFeatureAlert={handleFeatureAlert} />

        {/* ==================== 모달창 & 바텀시트 팝업 모음 ==================== */}

        {/* A. 견주 상세 프로필 바텀시트 모달 */}
        {activeUser && (
          <div className={styles.detailModalBackdrop} onClick={() => setActiveUserId(null)}>
            <div className={styles.detailModalCard} onClick={(e) => e.stopPropagation()}>
              <div className={styles.detailCloseBar} onClick={() => setActiveUserId(null)} />
              
              {/* 헤더 */}
              <div className={styles.detailHeader}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeUser.dog.photo} alt={activeUser.name} className={styles.detailAvatar} />
                <div className={styles.detailTitleRow}>
                  <div className={styles.detailNameRow}>
                    <span className={styles.detailName}>{activeUser.name}</span>
                    <span className={styles.detailDistance}>({activeUser.distance}m)</span>
                  </div>
                  
                  <div className={styles.detailTags}>
                    <span className={`${styles.detailTag} ${styles.tagBreed}`}>{activeUser.dog.breed}</span>
                    <span className={`${styles.detailTag} ${styles.tagPersonality}`}>
                      {activeUser.dog.personality === "active" ? "🔥 활발해요" : activeUser.dog.personality === "warm" ? "☀️ 온순해요" : "☁️ 소심해요"}
                    </span>
                    <span className={`${styles.detailTag} ${styles.tagStatus} ${
                      activeUser.status === "possible" ? styles.tagStatusActive : ""
                    }`}>
                      {activeUser.status === "possible" ? "🟢 산책 가능" : "🟡 휴식 중"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 상태 메시지 */}
              <div className={styles.detailSection}>
                <div className={styles.detailLabel}>상태 메시지</div>
                <div className={styles.detailStatusMessage}>{activeUser.statusMessage}</div>
              </div>

              {/* 최근 산책 기록 */}
              {activeUser.recentWalks.length > 0 && (
                <div className={styles.detailSection}>
                  <div className={styles.detailLabel}>최근 산책 기록</div>
                  <div className={styles.walkRecordList}>
                    {activeUser.recentWalks.map((record, index) => (
                      <div key={index} className={styles.walkRecordItem}>
                        <div className={styles.walkRecordLeft}>
                          <span className={styles.walkRecordDate}>{record.date}</span>
                          <span className={styles.walkRecordPartner}>{record.partner}과(와) 함께</span>
                        </div>
                        <div className={styles.walkRecordRight}>
                          <span className={styles.walkRecordDuration}>{record.duration}분</span>
                          <div className={styles.walkRecordDist}>{record.distance}km</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 산책 요청 액션 버튼 */}
              <button 
                type="button" 
                className={styles.detailActionBtn}
                onClick={() => {
                  handleRequestWalk(activeUser.name);
                  setActiveUserId(null);
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: 2 }}>
                  <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
                </svg>
                산책요청
              </button>
            </div>
          </div>
        )}

        {/* B. 나의 산책 상태 설정 바텀시트 */}
        {showStatusSheet && onboardingData && (
          <div className={styles.detailModalBackdrop} onClick={() => setShowStatusSheet(false)}>
            <div className={styles.detailModalCard} onClick={(e) => e.stopPropagation()}>
              <div className={styles.detailCloseBar} onClick={() => setShowStatusSheet(false)} />
              
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", marginBottom: "6px" }}>현재 나의 산책 상태 설정</div>
              <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "20px" }}>선택한 상태가 주변 견주들에게 실시간으로 표시됩니다.</div>
              
              <div className={styles.statusOptionList}>
                {/* 1. 산책 가능 */}
                <div 
                  className={`${styles.statusOptionCard} ${myWalkStatus === "possible" ? styles.statusOptionCardActive : ""}`}
                  onClick={() => setMyWalkStatus("possible")}
                >
                  <div className={styles.statusOptionLeft}>
                    <span className={styles.statusDot} style={{ backgroundColor: "#10B981" }}></span>
                    <div className={styles.statusOptionMeta}>
                      <span className={styles.statusOptionTitle}>지금 바로 산책이 가능해요!</span>
                      <span className={styles.statusOptionSub}>주변 견주들에게 산책 요청을 받을 수 있어요</span>
                    </div>
                  </div>
                  <div className={styles.statusRadioCircle}>
                    {myWalkStatus === "possible" && <div className={styles.statusRadioDot}></div>}
                  </div>
                </div>

                {/* 2. 휴식 중 */}
                <div 
                  className={`${styles.statusOptionCard} ${myWalkStatus === "resting" ? styles.statusOptionCardActive : ""}`}
                  onClick={() => setMyWalkStatus("resting")}
                >
                  <div className={styles.statusOptionLeft}>
                    <span className={styles.statusDot} style={{ backgroundColor: "#F59E0B" }}></span>
                    <div className={styles.statusOptionMeta}>
                      <span className={styles.statusOptionTitle}>지금은 아이와 쉬고 있어요</span>
                      <span className={styles.statusOptionSub}>공원 벤치 등에서 잠시 휴식 중이에요</span>
                    </div>
                  </div>
                  <div className={styles.statusRadioCircle}>
                    {myWalkStatus === "resting" && <div className={styles.statusRadioDot}></div>}
                  </div>
                </div>

                {/* 3. 산책 불가 */}
                <div 
                  className={`${styles.statusOptionCard} ${myWalkStatus === "impossible" ? styles.statusOptionCardActive : ""}`}
                  onClick={() => setMyWalkStatus("impossible")}
                >
                  <div className={styles.statusOptionLeft}>
                    <span className={styles.statusDot} style={{ backgroundColor: "#9CA3AF" }}></span>
                    <div className={styles.statusOptionMeta}>
                      <span className={styles.statusOptionTitle}>지금은 산책이 어려워요</span>
                      <span className={styles.statusOptionSub}>산책 요청 및 위치 노출이 비활성화됩니다</span>
                    </div>
                  </div>
                  <div className={styles.statusRadioCircle}>
                    {myWalkStatus === "impossible" && <div className={styles.statusRadioDot}></div>}
                  </div>
                </div>
              </div>

              {/* 완료 버튼 */}
              <button 
                type="button" 
                className={styles.detailActionBtn}
                onClick={() => handleSaveMyStatus(myWalkStatus)}
              >
                설정 완료
              </button>
            </div>
          </div>
        )}

        {/* C. 기존 백엔드 테스트용 개발자 설정 모달 */}
        {showDevModal && (
          <div className={styles.devModalBackdrop} onClick={() => setShowDevModal(false)}>
            <div className={styles.devModalCard} onClick={(e) => e.stopPropagation()}>
              <div className={styles.devModalHeader}>
                <span className={styles.devModalTitle}>백엔드 연결 및 관리 설정 🛠️</span>
                <button 
                  type="button" 
                  className={styles.devCloseBtn} 
                  onClick={() => setShowDevModal(false)}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <span style={{ fontSize: 13, fontWeight: "bold", color: "#374151" }}>온보딩 정보 제어</span>
                <button 
                  type="button"
                  style={{
                    backgroundColor: "#EF4444", color: "#ffffff", border: "none", fontSize: "11px", fontWeight: "bold", padding: "6px 12px", borderRadius: "6px", cursor: "pointer"
                  }}
                  onClick={() => {
                    setShowDevModal(false);
                    handleResetOnboarding();
                  }}
                >
                  온보딩 리셋 🔄
                </button>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#374151", marginBottom: "6px" }}>API Health 상태</div>
                {health ? (
                  <pre style={{ background: "#F3F4F6", padding: "8px 12px", borderRadius: "8px", fontSize: "11px", overflowX: "auto", margin: 0, fontFamily: "monospace" }}>
                    {JSON.stringify(health, null, 2)}
                  </pre>
                ) : (
                  <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>불러오는 중…</p>
                )}
              </div>

              <div>
                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#374151", marginBottom: "6px" }}>계정</div>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: "100%", height: "36px", backgroundColor: "#0e7060", color: "#ffffff",
                    border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "12px", cursor: "pointer",
                  }}
                >
                  로그아웃
                </button>

                {error && (
                  <p style={{ color: "#EF4444", fontSize: "11px", marginTop: "8px", margin: 0 }}>
                    ⚠️ 백엔드(8080) 연결 상태를 확인하세요. ({error})
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* D. 커스텀 공통 알림 모달 */}
        {customAlert && (
          <div className={styles.alertBackdrop}>
            <div className={styles.alertCard}>
              {customAlert.type !== "success" && (
                <div className={styles.alertIcon}>
                  {customAlert.type === "warning" && "⚠️"}
                  {customAlert.type === "feature" && "🐶"}
                </div>
              )}
              {customAlert.type === "success" && (
                <div className={styles.alertIcon} style={{ fontSize: "32px", marginBottom: "8px" }}>🎉</div>
              )}
              <div className={styles.alertMessage}>
                {customAlert.message}
              </div>
              <button
                type="button"
                className={styles.alertConfirmBtn}
                onClick={() => {
                  if (customAlert.onConfirm) {
                    customAlert.onConfirm();
                  }
                  setCustomAlert(null);
                }}
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* E. 커스텀 공통 확인 모달 */}
        {customConfirm && (
          <div className={styles.alertBackdrop}>
            <div className={styles.alertCard}>
              <div className={styles.alertIcon} style={{ fontSize: "32px", marginBottom: "8px" }}>❓</div>
              <div className={styles.alertMessage}>
                {customConfirm.message}
              </div>
              <div className={styles.confirmBtnRow}>
                <button
                  type="button"
                  className={styles.confirmCancelBtn}
                  onClick={() => setCustomConfirm(null)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className={styles.confirmOkBtn}
                  onClick={() => {
                    customConfirm.onConfirm();
                    setCustomConfirm(null);
                  }}
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
