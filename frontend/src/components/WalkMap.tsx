"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./WalkMap.module.css";
import { type WalkUser } from "@/lib/walkMock";

declare global {
  interface Window {
    kakao: any;
  }
}

interface WalkMapProps {
  latitude: number;
  longitude: number;
  users: WalkUser[];
  activeUserId: string | null;
  onSelectUser: (userId: string | null) => void;
  myStatus: "possible" | "resting" | "impossible";
}

export default function WalkMap({
  latitude,
  longitude,
  users,
  activeUserId,
  onSelectUser,
  myStatus,
}: WalkMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const myLocationOverlayRef = useRef<any>(null);

  const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;
  const hasApiKey = apiKey && apiKey !== "" && apiKey !== "YOUR_KEY";

  // 지도 생성 및 셋업 함수
  const createMapInstance = () => {
    if (!mapContainerRef.current || !window.kakao || !window.kakao.maps) {
      console.warn("[WalkMap] Cannot create map instance. Missing DOM or Kakao Maps SDK.");
      return;
    }

    console.log("[WalkMap] Creating map instance at coords:", latitude, longitude);
    const container = mapContainerRef.current;
    const options = {
      center: new window.kakao.maps.LatLng(latitude, longitude),
      level: 3,
    };

    try {
      const map = new window.kakao.maps.Map(container, options);
      mapInstanceRef.current = map;
      console.log("[WalkMap] Map instance created successfully.");

      // 드래그 또는 지도 클릭 시 활성 유저 선택 해제
      window.kakao.maps.event.addListener(map, "click", () => {
        onSelectUser(null);
      });

      // 지도 레이아웃 보정
      setTimeout(() => {
        if (mapInstanceRef.current) {
          console.log("[WalkMap] Running map relayout to fix layout cracking.");
          mapInstanceRef.current.relayout();
          mapInstanceRef.current.setCenter(new window.kakao.maps.LatLng(latitude, longitude));
        }
      }, 300);

    } catch (err) {
      console.error("[WalkMap] Failed to initialize Kakao Map Object:", err);
      setScriptError(true);
    }
  };

  // 1. 동적 스크립트 주입 (Next/Script 대신 전통적 방식으로 신뢰성 극대화)
  useEffect(() => {
    console.log("[WalkMap] API Key Loaded Check -> key length:", apiKey ? apiKey.length : 0, "hasApiKey:", hasApiKey);
    if (!hasApiKey) {
      console.warn("[WalkMap] Running in Demo Hybrid Map mode because API Key is missing or invalid.");
      return;
    }

    const scriptId = "kakao-map-sdk";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const handleLoad = () => {
      console.log("[WalkMap] Kakao SDK Script Load event fired.");
      if (window.kakao && window.kakao.maps) {
        console.log("[WalkMap] window.kakao.maps is available. Loading sub-modules...");
        window.kakao.maps.load(() => {
          console.log("[WalkMap] Sub-modules loaded. mapLoaded -> true");
          setMapLoaded(true);
        });
      } else {
        console.error("[WalkMap] Kakao SDK Script loaded but window.kakao.maps is undefined.");
        setScriptError(true);
      }
    };

    const handleError = (e: any) => {
      console.error("[WalkMap] Kakao SDK Script file load failed (401/403/Blocked):", e);
      setScriptError(true);
    };

    if (script) {
      // 이미 스크립트가 헤더에 주입되어 있는 경우
      if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
        // 이미 로드가 완료된 상태
        setMapLoaded(true);
      } else {
        // 주입은 되었으나 로딩 대기 상태
        script.addEventListener("load", handleLoad);
        script.addEventListener("error", handleError);
      }
      return;
    }

    // 신규 스크립트 생성 및 주입
    script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=services`;
    script.async = true;
    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);
    document.head.appendChild(script);

    return () => {
      if (script) {
        script.removeEventListener("load", handleLoad);
        script.removeEventListener("error", handleError);
      }
    };
  }, [apiKey, hasApiKey]);

  // 2. 지도 SDK 로드 완료 시 인스턴스 초기화
  useEffect(() => {
    if (mapLoaded && !mapInstanceRef.current) {
      createMapInstance();
    }
  }, [mapLoaded]);

  // 내 위치 및 주변 견주 마커들(오버레이) 업데이트
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.kakao || !window.kakao.maps) return;

    const map = mapInstanceRef.current;

    // 1. 기존 오버레이들 모두 제거
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    if (myLocationOverlayRef.current) {
      myLocationOverlayRef.current.setMap(null);
      myLocationOverlayRef.current = null;
    }

    // 2. 내 위치 오버레이 생성 (에메랄드 펄스 포인트)
    const myLocContent = document.createElement("div");
    myLocContent.className = styles.myLocationContainer;
    myLocContent.innerHTML = `
      <div class="${styles.myLocationPulse}"></div>
      <div class="${styles.myLocationCenter}"></div>
    `;

    // "나" 클릭 시 내 상태 설정 모달을 띄우거나 콜백 호출할 수 있도록 클릭 이벤트 추가
    myLocContent.onclick = (e) => {
      e.stopPropagation();
      onSelectUser("me");
    };

    const myLocOverlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(latitude, longitude),
      content: myLocContent,
      zIndex: 5,
    });
    myLocOverlay.setMap(map);
    myLocationOverlayRef.current = myLocOverlay;

    // 3. 주변 견주 마커(오버레이) 생성
    users.forEach((user) => {
      const userCoords = new window.kakao.maps.LatLng(user.coords.lat, user.coords.lng);

      const markerContent = document.createElement("div");
      const isActive = activeUserId === user.id;

      markerContent.className = `${styles.customMarker} ${
        isActive ? styles.customMarkerActive : ""
      }`;

      // 상태별 테두리 클래스 및 배지 클래스 분기
      const borderClass =
        user.status === "possible"
          ? styles.borderPossible
          : user.status === "resting"
          ? styles.borderResting
          : styles.borderImpossible;

      const badgeClass =
        user.status === "possible"
          ? styles.badgePossible
          : user.status === "resting"
          ? styles.badgeResting
          : styles.badgeImpossible;

      markerContent.innerHTML = `
        <div class="${styles.profileContainer} ${borderClass}">
          <img src="${user.dog.photo}" alt="${user.name}" class="${styles.dogPhoto}" />
          <span class="${styles.statusBadge} ${badgeClass}"></span>
        </div>
        <div class="${styles.pinLine}"></div>
        <div class="${styles.pinDot}"></div>
        <div class="${styles.nameLabel}">${user.name}</div>
      `;

      // 클릭 시 해당 견주 선택
      markerContent.onclick = (e) => {
        e.stopPropagation();
        onSelectUser(user.id);
      };

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position: userCoords,
        content: markerContent,
        zIndex: isActive ? 10 : 3,
      });

      customOverlay.setMap(map);
      overlaysRef.current.push(customOverlay);
    });
  }, [mapLoaded, users, activeUserId, latitude, longitude, onSelectUser]);

  // 활성 유저가 바뀌거나 내 위치로 갈 때 지도 중심 이동(panTo)
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.kakao || !window.kakao.maps) return;

    const map = mapInstanceRef.current;

    if (activeUserId === "me") {
      const coords = new window.kakao.maps.LatLng(latitude, longitude);
      map.panTo(coords);
    } else if (activeUserId) {
      const activeUser = users.find((u) => u.id === activeUserId);
      if (activeUser) {
        const coords = new window.kakao.maps.LatLng(activeUser.coords.lat, activeUser.coords.lng);
        map.panTo(coords);
      }
    }
  }, [activeUserId, mapLoaded, users, latitude, longitude]);

  // 줌 조절 헬퍼
  const zoomIn = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    map.setLevel(map.getLevel() - 1, { animate: true });
  };

  const zoomOut = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    map.setLevel(map.getLevel() + 1, { animate: true });
  };

  // 내 위치 중심 정렬
  const moveToMyLocation = () => {
    if (!mapInstanceRef.current || !window.kakao || !window.kakao.maps) return;
    const map = mapInstanceRef.current;
    const coords = new window.kakao.maps.LatLng(latitude, longitude);
    map.panTo(coords);
    onSelectUser(null);
  };

  // API 키가 없거나 스크립트 에러 발생 시 Fallback 가상 지도 인터페이스 렌더링
  if (!hasApiKey || scriptError) {
    return (
      <div className={styles.mapContainer}>
        {/* 아주 세련된 Figma 다크 그리드 맵 컨셉의 Fallback 지도 */}
        <div 
          className={styles.map} 
          style={{ 
            background: "radial-gradient(circle, #101c26 0%, #080f14 100%)",
            backgroundImage: "radial-gradient(rgba(14, 112, 96, 0.15) 1.5px, transparent 1.5px), linear-gradient(to right, rgba(14, 112, 96, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(14, 112, 96, 0.05) 1px, transparent 1px)",
            backgroundSize: "20px 20px, 40px 40px, 40px 40px",
            position: "relative",
            overflow: "hidden"
          }}
          onClick={() => onSelectUser(null)}
        >
          {/* 가상 도로 효과 */}
          <div style={{ position: "absolute", top: "40%", left: 0, width: "100%", height: "24px", backgroundColor: "rgba(14, 112, 96, 0.1)", borderTop: "1px dashed rgba(14, 112, 96, 0.2)", borderBottom: "1px dashed rgba(14, 112, 96, 0.2)" }} />
          <div style={{ position: "absolute", top: 0, left: "55%", width: "28px", height: "100%", backgroundColor: "rgba(14, 112, 96, 0.1)", borderLeft: "1px dashed rgba(14, 112, 96, 0.2)", borderRight: "1px dashed rgba(14, 112, 96, 0.2)" }} />

          {/* 가상 랜드마크 뱃지 */}
          <div style={{ position: "absolute", top: "25%", left: "65%", padding: "4px 8px", backgroundColor: "rgba(14, 112, 96, 0.2)", border: "1px solid rgba(14, 112, 96, 0.4)", borderRadius: "4px", color: "#14b8a6", fontSize: "10px", fontWeight: "bold" }}>용산역</div>
          <div style={{ position: "absolute", bottom: "30%", left: "30%", padding: "4px 8px", backgroundColor: "rgba(14, 112, 96, 0.2)", border: "1px solid rgba(14, 112, 96, 0.4)", borderRadius: "4px", color: "#14b8a6", fontSize: "10px", fontWeight: "bold" }}>한강대로</div>
          
          {/* 환경 변수 키 누락 안내 워터마크 */}
          <div style={{ position: "absolute", top: "16px", left: "50%", transform: "translateX(-50%)", width: "90%", backgroundColor: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(4px)", padding: "10px 14px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#ffffff", fontSize: "11px", lineHeight: "1.4", zIndex: 12, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
            <span style={{ fontWeight: "bold", color: "#34d399", display: "block", marginBottom: "2px" }}>💡 데모 하이브리드 지도 모드</span>
            .env.local 파일에 Kakao Maps API 키가 없어 가상의 위치 매칭 시뮬레이터로 구동 중입니다.
          </div>

          {/* 내 위치 가상 마커 */}
          <div 
            className={styles.myLocationContainer}
            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectUser("me");
            }}
          >
            <div className={styles.myLocationPulse}></div>
            <div className={styles.myLocationCenter} style={{ backgroundColor: myStatus === "possible" ? "#10B981" : myStatus === "resting" ? "#F59E0B" : "#9CA3AF" }}></div>
          </div>

          {/* 가상 주변 견주 마커들 */}
          {users.map((user, idx) => {
            // base 위치 대비 offsets를 활용해 절대 % 배치 구현
            // 임준식(1), 박민준(2), 이현우(3), 김지우(4), 정예진(5), 태양(6)
            let top = "50%";
            let left = "50%";

            if (user.id === "owner_junsik") { top = "38%"; left = "62%"; }
            else if (user.id === "owner_minjun") { top = "28%"; left = "35%"; }
            else if (user.id === "owner_hyeonwoo") { top = "68%"; left = "40%"; }
            else if (user.id === "owner_jiwoo") { top = "75%"; left = "70%"; }
            else if (user.id === "owner_yejin") { top = "20%"; left = "75%"; }
            else if (user.id === "owner_taeyang") { top = "82%"; left = "85%"; }

            const isActive = activeUserId === user.id;
            const borderClass =
              user.status === "possible"
                ? styles.borderPossible
                : user.status === "resting"
                ? styles.borderResting
                : styles.borderImpossible;

            const badgeClass =
              user.status === "possible"
                ? styles.badgePossible
                : user.status === "resting"
                ? styles.badgeResting
                : styles.badgeImpossible;

            return (
              <div
                key={user.id}
                className={`${styles.customMarker} ${isActive ? styles.customMarkerActive : ""}`}
                style={{ position: "absolute", top, left, transform: `translate(-50%, -100%) ${isActive ? "scale(1.1)" : ""}` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectUser(user.id);
                }}
              >
                <div className={`${styles.profileContainer} ${borderClass}`}>
                  <img src={user.dog.photo} alt={user.name} className={styles.dogPhoto} />
                  <span className={`${styles.statusBadge} ${badgeClass}`}></span>
                </div>
                <div className={styles.pinLine}></div>
                <div className={styles.pinDot}></div>
                <div className={styles.nameLabel}>{user.name}</div>
              </div>
            );
          })}

          {/* 내 위치 중심 버튼 */}
          <button 
            type="button" 
            className={styles.myLocationBtn} 
            style={{ top: "80px" }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectUser("me");
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <line x1="12" y1="1" x2="12" y2="4" />
              <line x1="12" y1="20" x2="12" y2="23" />
              <line x1="1" y1="12" x2="4" y2="12" />
              <line x1="20" y1="12" x2="23" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mapContainer}>
      <div ref={mapContainerRef} className={styles.map} />

      {/* 내 위치 중심 버튼 */}
      <button type="button" className={styles.myLocationBtn} onClick={moveToMyLocation}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <line x1="12" y1="1" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="23" />
          <line x1="1" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="23" y2="12" />
        </svg>
      </button>

      {/* 줌 조절 컨트롤 */}
      <div className={styles.zoomControl}>
        <button type="button" className={styles.zoomBtn} onClick={zoomIn}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <div className={styles.zoomDivider} />
        <button type="button" className={styles.zoomBtn} onClick={zoomOut}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
