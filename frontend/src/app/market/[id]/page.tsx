"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import styles from "./detail.module.css";
import FooterBar from "@/components/FooterBar";
import { type MarketItem } from "@/lib/marketMock";
import { ApiError, marketApi, type MarketDetail } from "@/lib/api";
import { getToken } from "@/lib/auth";

function adaptDetail(d: MarketDetail): MarketItem {
  return {
    id: d.itemId,
    title: d.title,
    type: d.tradeType === "SELL" ? "sell" : "buy",
    category: "기타",
    price: d.price ?? 0,
    priceSuggestible: false,
    location: "",
    timeText: formatRelativeTime(d.createdAt),
    images: d.images.length > 0 ? d.images : ["/dangsquare_mascot_official.png"],
    likes: d.heartCount,
    comments: 0,
    views: 0,
    description: d.content,
    sellerName: d.author.nickname,
    sellerAvatar: d.author.profileImageUrl ?? undefined,
    sellerTemp: 36.5,
    isCompleted: d.status === "SOLD",
  };
}

function formatRelativeTime(iso: string): string {
  const diffSec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "방금 전";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  return `${Math.floor(diffSec / 86400)}일 전`;
}

export default function MarketDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id ? Number(params.id) : null;

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<MarketItem | null>(null);

  // 이미지 슬라이더 인덱스
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // 추천(좋아요) 상태
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  // 알림 모달 상태
  const [customAlert, setCustomAlert] = useState<{
    message: string;
    type: "success" | "warning" | "feature";
  } | null>(null);

  // 데이터 바인딩: 백엔드 상세 호출(SELL만 제공).
  useEffect(() => {
    if (id == null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const detail = await marketApi.detail(id);
        if (cancelled) return;
        setItem(adaptDetail(detail));
        setLikes(detail.heartCount);
        setHasLiked(detail.hearted);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401 && getToken() === null) {
          router.replace("/onboarding");
          return;
        }
        setItem(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  // 커스텀 알림 처리
  const handleFeatureAlert = (featureName: string) => {
    setCustomAlert({
      message: `"${featureName}" 서비스는 준비 중입니다!\n단추가 열심히 개발하고 있어요 🐶`,
      type: "feature"
    });
  };

  // 추천 버튼 토글: 백엔드 토글 호출. 인증 필요(POST /api/market/items/{id}/heart).
  const handleLikeToggle = async () => {
    if (!item) return;
    if (!getToken()) {
      router.push("/onboarding");
      return;
    }
    try {
      const result = await marketApi.toggleHeart(item.id);
      setLikes(result.heartCount);
      setHasLiked(result.hearted);
      setItem({ ...item, likes: result.heartCount });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push("/onboarding");
        return;
      }
      setCustomAlert({ message: "좋아요 처리에 실패했어요.", type: "warning" });
    }
  };

  // 슬라이더 이전 사진
  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item) return;
    setCurrentImgIndex(prev => (prev === 0 ? item.images.length - 1 : prev - 1));
  };

  // 슬라이더 다음 사진
  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item) return;
    setCurrentImgIndex(prev => (prev === item.images.length - 1 ? 0 : prev + 1));
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ color: "#0e7060", fontWeight: 600 }}>상세 정보 불러오는 중…</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorBlock}>
            <div style={{ fontSize: "40px" }}>⚠️</div>
            <div className={styles.errorText}>존재하지 않는 상품 정보입니다.</div>
            <button 
              type="button" 
              className={styles.backBtn}
              onClick={() => router.push("/market")}
            >
              NZ마켓 목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasMultipleImages = item.images.length > 1;
  
  // 매너온도 백분율 계산 (기준 36.5가 약 40% 정도 채워지게 표시)
  const tempPercentage = Math.min(100, Math.max(10, ((item.sellerTemp - 20) / 30) * 100));

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.scrollWrapper}>
          
          {/* Image Slider */}
          <div className={styles.sliderContainer}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={item.images[currentImgIndex] || "/dangsquare_mascot_official.png"} 
              alt={`Product Detail ${currentImgIndex + 1}`} 
              className={styles.sliderImage}
            />

            {/* Slider Navigation buttons */}
            {hasMultipleImages && (
              <>
                <button type="button" className={`${styles.navBtn} ${styles.prevBtn}`} onClick={handlePrevImage}>
                  {/* 왼쪽 화살표 */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button type="button" className={`${styles.navBtn} ${styles.nextBtn}`} onClick={handleNextImage}>
                  {/* 오른쪽 화살표 */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}

            {/* Slide Indicators */}
            {hasMultipleImages && (
              <div className={styles.indicatorContainer}>
                {item.images.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`${styles.indicatorDot} ${currentImgIndex === idx ? styles.activeDot : ""}`}
                  />
                ))}
              </div>
            )}

            {/* Overlay Header Buttons */}
            <div className={styles.overlayHeader}>
              <div className={styles.overlayHeaderLeft}>
                <button 
                  type="button" 
                  className={styles.overlayBtn}
                  onClick={() => router.push("/market")}
                >
                  {/* 뒤로가기 화살표 */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>
              </div>
              <div className={styles.overlayHeaderRight}>
                <button 
                  type="button" 
                  className={styles.overlayBtn}
                  onClick={() => handleFeatureAlert("공유하기")}
                >
                  {/* 공유 아이콘 */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </button>
                <button 
                  type="button" 
                  className={styles.overlayBtn}
                  onClick={() => handleFeatureAlert("더보기")}
                >
                  {/* 더보기 아이콘 */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
              </div>
            </div>

          </div>

          {/* Seller Profile Block */}
          <div className={styles.profileBlock}>
            <div className={styles.profileLeft}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={item.sellerAvatar || "/dangsquare_mascot_official.png"} 
                alt="Seller Avatar" 
                className={styles.sellerAvatar}
              />
              <div className={styles.sellerInfo}>
                <span className={styles.sellerName}>{item.sellerName}</span>
                <span className={styles.sellerLocation}>{item.location}</span>
              </div>
            </div>

            <div className={styles.tempContainer}>
              <span className={styles.tempValue}>{item.sellerTemp.toFixed(1)}°C</span>
              <div className={styles.tempBarBg}>
                <div className={styles.tempBarFill} style={{ width: `${tempPercentage}%` }} />
              </div>
              <span className={styles.tempLabel}>매너온도</span>
            </div>
          </div>

          {/* Item Content Block */}
          <div className={styles.contentBlock}>
            <div className={styles.tagRow}>
              <span className={styles.tagBadge}>{item.category}</span>
              <span className={`${styles.typeBadge} ${item.type === "sell" ? styles.badgeSell : styles.badgeBuy}`}>
                {item.type === "sell" ? "판매글" : "구매글"}
              </span>
            </div>

            <h1 className={styles.detailTitle}>{item.title}</h1>
            
            <div className={styles.detailMeta}>
              {item.timeText} • 조회 {item.views}
            </div>

            <p className={styles.detailDesc}>{item.description}</p>

            {/* Recommendation (Paw) button */}
            <div className={styles.likeBtnContainer}>
              <button 
                type="button" 
                className={`${styles.likeBtn} ${hasLiked ? styles.likeBtnActive : ""}`}
                onClick={handleLikeToggle}
              >
                <span className={styles.likeBtnIcon}>
                  {/* 발바닥 모양 추천 아이콘 */}
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <circle cx="8" cy="7" r="2.2" />
                    <circle cx="12" cy="5.2" r="2.2" />
                    <circle cx="16" cy="7" r="2.2" />
                    <path d="M12 10.5c-2.4 0-4.3 1.8-4.3 4.2 0 1.3.6 2.5 1.6 3.2v.3c0 1.2.9 2.1 2.1 2.1s2.1-.9 2.1-2.1v-.3c1-.7 1.6-1.9 1.6-3.2 0-2.4-1.9-4.2-4.5-4.2z" />
                  </svg>
                </span>
                <span>추천 🐾 • {likes}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Detail Bottom Fixed Action Bar */}
        <div className={styles.actionFixedBar}>
          <div className={styles.priceCol}>
            <span className={styles.priceVal}>
              {item.type === "buy" && item.priceRange ? (
                <span>희망 {item.priceRange}원</span>
              ) : (
                item.price === 0 ? "무료나눔" : `${item.price.toLocaleString()}원`
              )}
            </span>
            <span className={`${styles.priceSuggestText} ${!item.priceSuggestible ? styles.priceSuggestTextDisabled : ""}`}>
              {item.priceSuggestible ? "가격 제안 가능" : "가격 제안 불가"}
            </span>
          </div>

          <div className={styles.actionBarRight}>
            <button 
              type="button" 
              className={styles.chatBtn}
              onClick={() => handleFeatureAlert("채팅")}
            >
              {/* 말풍선 아이콘 */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              <span className={styles.chatBtnText}>채팅</span>
            </button>

            <button 
              type="button" 
              className={styles.buyBtn}
              onClick={() => handleFeatureAlert(item.type === "sell" ? "바로 구매하기" : "바로 판매하기")}
            >
              {item.type === "sell" ? "바로 구매하기" : "바로 판매하기"}
            </button>
          </div>
        </div>

        {/* Footer Bar */}
        <FooterBar activeTab="market" onFeatureAlert={handleFeatureAlert} />

        {/* 커스텀 알림 모달 */}
        {customAlert && (
          <div className={styles.alertBackdrop}>
            <div className={styles.alertCard}>
              <div className={styles.alertIcon}>🐶</div>
              <div className={styles.alertMessage}>
                {customAlert.message}
              </div>
              <button
                type="button"
                className={styles.alertConfirmBtn}
                onClick={() => setCustomAlert(null)}
              >
                확인
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
