"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./community.module.css";
import FooterBar from "@/components/FooterBar";
import {
  getCommunityPosts,
  saveCommunityPosts,
  addCommunityPost,
  type CommunityPost
} from "@/lib/communityMock";

const CHIPS_INFO = ["전체", "🔥 동네소통", "🏥 추천해요", "🌿 에코라이프"] as const;

export default function CommunityMain() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  
  // 메인 탭 상태 ("boast" = 댕자랑, "info" = 동네 댕정보, "hot" = 핫게시판)
  const [activeTab, setActiveTab] = useState<"boast" | "info" | "hot">("boast");
  
  // 동네 댕정보 세부 필터 (카테고리 칩)
  const [selectedChip, setSelectedChip] = useState<string>("전체");
  
  // 모달 및 태그 상태
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [activeTagPostId, setActiveTagPostId] = useState<number | null>(null);
  
  const [customAlert, setCustomAlert] = useState<{
    message: string;
    type: "success" | "warning" | "feature";
  } | null>(null);

  // 온보딩 완료 확인 및 초기 데이터 로드
  useEffect(() => {
    const isCompleted = localStorage.getItem("dangsquare_onboarding_completed");
    if (isCompleted !== "true") {
      router.push("/onboarding");
    } else {
      setPosts(getCommunityPosts());
      setLoading(false);
    }
  }, [router]);

  // 커스텀 알림 처리
  const handleFeatureAlert = (featureName: string) => {
    setCustomAlert({
      message: `"${featureName}" 서비스는 준비 중입니다!\n단추가 열심히 개발하고 있어요 🐶`,
      type: "feature"
    });
  };

  // 팔로우 토글
  const handleFollowToggle = (e: React.MouseEvent, postId: number) => {
    e.stopPropagation();
    const updated = posts.map(post => {
      if (post.id === postId) {
        const nextFollowing = !post.isFollowing;
        return { ...post, isFollowing: nextFollowing };
      }
      return post;
    });
    setPosts(updated);
    saveCommunityPosts(updated);
  };

  // 좋아요 토글 (발바닥 클릭 시)
  const handleLikeToggle = (e: React.MouseEvent, postId: number) => {
    e.stopPropagation();
    const updated = posts.map(post => {
      if (post.id === postId) {
        return { ...post, likes: post.likes + 1 };
      }
      return post;
    });
    setPosts(updated);
    saveCommunityPosts(updated);
  };

  // 상품 태그 클릭 시 툴팁 보이기/숨기기
  const handleTagClick = (e: React.MouseEvent, postId: number) => {
    e.stopPropagation();
    setActiveTagPostId(prev => (prev === postId ? null : postId));
  };

  // 댕자랑 상세로 이동
  const handleGoDetail = (postId: number) => {
    router.push(`/community/${postId}`);
  };

  // 글쓰기 시뮬레이션 - 댕자랑 추가
  const handleMockAddBoast = () => {
    setIsWriteModalOpen(false);
    
    // 온보딩 정보 획득
    const stored = localStorage.getItem("dangsquare_onboarding_data");
    let oName = "초코맘";
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        oName = parsed.owner.name || "초코맘";
      } catch (e) {}
    }

    addCommunityPost({
      type: "boast",
      userName: oName,
      userAvatar: oName.charAt(0),
      userAvatarBg: "#FBBF24", // yellow
      location: "동작구 흑석동",
      image: "/community_shiba.png",
      description: "오늘 날씨가 너무 좋아서 근처 공원에 산책 나왔어요! 친환경 생분해 풉백 들고 총총 🐾 지구를 사랑하는 댕댕이가 됩시다 🌿",
      hashtags: ["에코라이프", "산책메이트", "친환경", "댕자랑"]
    });

    setPosts(getCommunityPosts());
    setActiveTab("boast");
    setCustomAlert({
      message: "새 에코 댕자랑 글이 등록되었습니다! 🎉",
      type: "success"
    });
  };

  // 글쓰기 시뮬레이션 - 동네 정보 추가
  const handleMockAddInfo = () => {
    setIsWriteModalOpen(false);

    // 온보딩 정보 획득
    const stored = localStorage.getItem("dangsquare_onboarding_data");
    let oName = "초코맘";
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        oName = parsed.owner.name || "초코맘";
      } catch (e) {}
    }

    addCommunityPost({
      type: "info",
      category: "에코라이프",
      userName: oName,
      userAvatar: oName.charAt(0),
      userAvatarBg: "#A7F3D0", // green
      location: "동작구 흑석동",
      title: "동네 친환경 사료/간식 리필샵 추천합니다!",
      description: "동작구 흑석동 시장 골목 안쪽에 반려견 간식을 포장 없이 통에 덜어서 살 수 있는 리필 스테이션이 생겼더라고요. 쓰레기도 안 나오고 가격도 합리적이라 추천합니다!",
      image: "/shop_dog_treat.png"
    });

    setPosts(getCommunityPosts());
    setActiveTab("info");
    setSelectedChip("전체");
    setCustomAlert({
      message: "새 동네 댕정보 글이 등록되었습니다! 📝",
      type: "success"
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ color: "#0e7060", fontWeight: 600 }}>커뮤니티 불러오는 중…</div>
      </div>
    );
  }

  // 필터링 적용
  const boastPosts = posts.filter(post => post.type === "boast");
  
  const infoPosts = posts.filter(post => {
    if (post.type !== "info") return false;
    if (selectedChip === "전체") return true;
    
    // 카테고리 매칭
    const cleanChip = selectedChip.replace(/[^\uAC00-\uD7A3a-zA-Z]/g, "").trim(); // 이모지 제거
    return post.category === cleanChip;
  });

  // 핫게시판 포스트 필터링 (좋아요 100개 이상 글)
  const hotPosts = posts.filter(post => post.likes >= 100).sort((a, b) => b.likes - a.likes);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        
        {/* Header */}
        <header className={styles.headerBlock}>
          <span className={styles.title} onClick={() => router.push("/")}>Dangsquare</span>
          <div className={styles.headerIcons}>
            <button type="button" className={styles.iconBtn} onClick={() => handleFeatureAlert("검색")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <button type="button" className={styles.iconBtn} onClick={() => handleFeatureAlert("알림")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
          </div>
        </header>

        {/* Tab Bar */}
        <div className={styles.tabBar}>
          <button 
            type="button" 
            className={`${styles.tabItem} ${activeTab === "boast" ? styles.tabItemActive : ""}`}
            onClick={() => {
              setActiveTab("boast");
              setActiveTagPostId(null);
            }}
          >
            댕자랑
            {activeTab === "boast" && <div className={styles.tabIndicator} />}
          </button>
          <button 
            type="button" 
            className={`${styles.tabItem} ${activeTab === "info" ? styles.tabItemActive : ""}`}
            onClick={() => {
              setActiveTab("info");
              setActiveTagPostId(null);
            }}
          >
            동네 댕정보
            {activeTab === "info" && <div className={styles.tabIndicator} />}
          </button>
          <button 
            type="button" 
            className={`${styles.tabItem} ${activeTab === "hot" ? styles.tabItemActive : ""}`}
            onClick={() => {
              setActiveTab("hot");
              setActiveTagPostId(null);
            }}
          >
            핫게시판
            {activeTab === "hot" && <div className={styles.tabIndicator} />}
          </button>
        </div>

        {/* Scrollable Contents */}
        <div className={styles.scrollWrapper}>
          
          {activeTab === "boast" && (
            /* =================== 댕자랑 탭 뷰 =================== */
            <div className={styles.feedList}>
              {boastPosts.length === 0 ? (
                <div className={styles.emptyBlock}>게시물이 없습니다.</div>
              ) : (
                boastPosts.map(post => (
                  <div key={post.id} className={styles.feedCard}>
                    
                    {/* User Header */}
                    <div className={styles.feedHeader}>
                      <div className={styles.userInfo}>
                        <div 
                          className={styles.userAvatar} 
                          style={{ backgroundColor: post.userAvatarBg }}
                        >
                          {post.userAvatar}
                        </div>
                        <div className={styles.userDetails}>
                          <span className={styles.userName}>{post.userName}</span>
                          <span className={styles.userMeta}>{post.location} • {post.timeText}</span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className={`${styles.followBtn} ${post.isFollowing ? styles.followBtnActive : ""}`}
                        onClick={(e) => handleFollowToggle(e, post.id)}
                      >
                        {post.isFollowing ? "팔로잉" : "팔로우"}
                      </button>
                    </div>

                    {/* Image & Product Tag Pin */}
                    <div className={styles.imageArea}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={post.image} 
                        alt={`${post.userName}'s boast`} 
                        className={styles.feedImage}
                        onClick={() => handleGoDetail(post.id)}
                      />

                      {/* 친환경 상품 태그 🟢 핀 */}
                      {post.productTag && (
                        <>
                          <div 
                            className={styles.productPin}
                            style={{ 
                              left: `${post.productTag.x}%`, 
                              top: `${post.productTag.y}%` 
                            }}
                            onClick={(e) => handleTagClick(e, post.id)}
                          />
                          
                          {activeTagPostId === post.id && (
                            <div 
                              className={styles.tagTooltip}
                              style={{ 
                                left: `${post.productTag.x - 10}%`, 
                                top: `${post.productTag.y - 12}%` 
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className={styles.tagProductTitle}>{post.productTag.productName}</span>
                              <button 
                                type="button" 
                                className={styles.tagLinkBtn}
                                onClick={() => router.push(`/market/shop/${post.productTag?.productId}`)}
                              >
                                보기 &gt;
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Interaction Icons Row */}
                    <div className={styles.actionRow}>
                      <button 
                        type="button" 
                        className={`${styles.actionBtn} ${post.likes > 247 ? styles.actionBtnLiked : ""}`}
                        onClick={(e) => handleLikeToggle(e, post.id)}
                      >
                        {/* 발바닥 아이콘 */}
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <circle cx="8" cy="7" r="2.2" />
                          <circle cx="12" cy="5.2" r="2.2" />
                          <circle cx="16" cy="7" r="2.2" />
                          <path d="M12 10.5c-2.4 0-4.3 1.8-4.3 4.2 0 1.3.6 2.5 1.6 3.2v.3c0 1.2.9 2.1 2.1 2.1s2.1-.9 2.1-2.1v-.3c1-.7 1.6-1.9 1.6-3.2 0-2.4-1.9-4.2-4.5-4.2z" />
                        </svg>
                        <span>{post.likes}</span>
                      </button>
                      
                      <button 
                        type="button" 
                        className={styles.actionBtn}
                        onClick={() => handleGoDetail(post.id)}
                      >
                        {/* 말풍선 아이콘 */}
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                        <span>{post.commentsCount}</span>
                      </button>
                    </div>

                    {/* Post Content */}
                    <div className={styles.feedDescArea}>
                      <p>
                        <span className={styles.descName}>{post.userName}</span>
                        {post.description}
                      </p>
                      {post.hashtags && post.hashtags.length > 0 && (
                        <div className={styles.hashtagsRow}>
                          {post.hashtags.map(tag => (
                            <span 
                              key={tag} 
                              className={styles.hashtag}
                              onClick={() => {
                                setCustomAlert({
                                  message: `#${tag} 검색 서비스는 단추가 준비 중입니다! 🐶`,
                                  type: "feature"
                                });
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "info" && (
            /* =================== 동네 댕정보 탭 뷰 =================== */
            <div className={styles.infoList}>
              {/* Category Chips */}
              <div className={styles.categoryBlock}>
                {CHIPS_INFO.map(chip => (
                  <button
                    key={chip}
                    type="button"
                    className={`${styles.chip} ${selectedChip === chip ? styles.chipActive : ""}`}
                    onClick={() => setSelectedChip(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {infoPosts.length === 0 ? (
                <div className={styles.emptyBlock}>게시물이 없습니다.</div>
              ) : (
                infoPosts.map(post => (
                  <div 
                    key={post.id} 
                    className={styles.infoCard}
                    onClick={() => handleGoDetail(post.id)}
                  >
                    <div className={styles.infoContent}>
                      <div className={styles.infoMetaRow}>
                        <span className={`${styles.infoBadge} ${
                          post.category === "추천해요" ? styles.badgeRecommend :
                          post.category === "에코라이프" ? styles.badgeEco :
                          styles.badgeSotong
                        }`}>
                          {post.category === "추천해요" ? "🏥 추천해요" :
                           post.category === "에코라이프" ? "🌿 에코라이프" :
                           "🔥 동네소통"}
                        </span>
                        <span className={styles.infoLoc}>{post.location}</span>
                      </div>
                      
                      <h3 className={styles.infoTitle}>{post.title}</h3>
                      <p className={styles.infoDesc}>{post.description}</p>
                      
                      <div className={styles.infoBottomRow}>
                        <div className={styles.infoStats}>
                          <span className={styles.statItem}>
                            🐾 {post.likes}
                          </span>
                          <span className={styles.statItem}>
                            💬 {post.commentsCount}
                          </span>
                        </div>
                        <span>{post.timeText}</span>
                      </div>
                    </div>

                    {/* 오른쪽 썸네일 이미지 (있을 때만 노출) */}
                    {post.image && (
                      <div className={styles.infoImageWrapper}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={post.image} 
                          alt="Info thumbnail" 
                          className={styles.infoThumb}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "hot" && (
            /* =================== 핫게시판 탭 뷰 =================== */
            <>
              {/* Hot Banner */}
              <div className={styles.hotBanner}>
                <div className={styles.hotBannerTitle}>🔥 오늘의 핫게시판</div>
                <div className={styles.hotBannerDesc}>조회수 • 추천수 기준으로 자동 선정된 인기 게시물</div>
              </div>

              {/* Hot List Container */}
              <div className={styles.hotList}>
                {hotPosts.length === 0 ? (
                  <div className={styles.emptyBlock}>실시간 인기 글이 없습니다.</div>
                ) : (
                  hotPosts.map(post => {
                    // 카테고리별 뱃지 클래스 결정
                    let badgeClass = styles.hotCategoryEcoBoast;
                    let iconCircleStyle = { backgroundColor: "#FFF3F2", color: "#EF4444" };
                    let iconEmoji = "🔥";
                    let categoryText = "에코 댕자랑";

                    if (post.type === "boast") {
                      badgeClass = styles.hotCategoryEcoBoast;
                      iconCircleStyle = { backgroundColor: "#FFF3F2", color: "#EF4444" };
                      iconEmoji = "🔥";
                      categoryText = "에코 댕자랑";
                    } else if (post.category === "에코라이프") {
                      badgeClass = styles.hotCategoryEcoLife;
                      iconCircleStyle = { backgroundColor: "#EFF6FF", color: "#0D9488" };
                      iconEmoji = "✨";
                      categoryText = "에코라이프";
                    } else {
                      // 동네소통 / 추천해요 등
                      badgeClass = styles.hotCategoryTownInfo;
                      if (post.id === 7 || post.userName === "에코베이킹맘") {
                        iconCircleStyle = { backgroundColor: "#FFFDF0", color: "#D97706" };
                        iconEmoji = "🏆";
                        categoryText = "동네 댕정보";
                      } else {
                        iconCircleStyle = { backgroundColor: "#FFF5F5", color: "#EF4444" };
                        iconEmoji = "📌";
                        categoryText = "동네 댕정보";
                      }
                    }

                    // Mock 데이터 속성에 저장된 커스텀 값 덮어쓰기
                    if (post.hotIcon) iconEmoji = post.hotIcon;
                    if (post.hotIconBg) iconCircleStyle = { backgroundColor: post.hotIconBg, color: "inherit" };
                    if (post.hotCategoryText) categoryText = post.hotCategoryText;

                    return (
                      <div 
                        key={post.id} 
                        className={styles.hotCard}
                        onClick={() => handleGoDetail(post.id)}
                      >
                        {/* Header Row */}
                        <div className={styles.hotCardHeader}>
                          <div className={styles.hotHeaderLeft}>
                            <div className={styles.hotIconCircle} style={iconCircleStyle}>
                              {iconEmoji}
                            </div>
                            <span className={`${styles.hotCategoryBadge} ${badgeClass}`}>
                              {categoryText}
                            </span>
                          </div>
                          
                          <div className={styles.hotMetrics}>
                            <span className={styles.metricView}>
                              👁️ {post.views.toLocaleString()}
                            </span>
                            <span className={styles.metricLike}>
                              🐾 {post.likes.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Title and Thumbnail Body */}
                        <div className={styles.hotCardBody}>
                          <h3 className={styles.hotCardTitle}>
                            {post.type === "boast" && post.id === 2
                              ? "한강에서 시바견 두 마리가 에코 피크닉 하는 모습 ㅠㅠ 심장 녹았어요"
                              : post.title || post.description}
                          </h3>
                          {post.image && (
                            <div className={styles.hotCardThumbWrapper}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={post.image} 
                                alt="Hot post thumbnail" 
                                className={styles.hotCardThumb}
                              />
                            </div>
                          )}
                        </div>

                        {/* Footer Row */}
                        <div className={styles.hotCardFooter}>
                          <span className={styles.hotMetaLeft}>
                            {post.userName} • {post.location} • {post.timeText}
                          </span>
                          <span className={styles.hotCommentText}>
                            댓글 {post.commentsCount}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

        </div>

        {/* Floating Action Button (FAB) */}
        <button 
          type="button" 
          className={`${styles.fab} ${isWriteModalOpen ? styles.fabOpen : ""}`}
          onClick={() => setIsWriteModalOpen(prev => !prev)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Footer Bar */}
        <FooterBar activeTab="community" onFeatureAlert={handleFeatureAlert} />

        {/* Write Option Modal */}
        {isWriteModalOpen && (
          <div 
            className={styles.modalBackdrop}
            onClick={() => setIsWriteModalOpen(false)}
          >
            <div 
              className={styles.writeModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className={styles.writeOptionTop}
                onClick={handleMockAddInfo}
              >
                <div className={styles.writeOptionIcon}>📝</div>
                <div className={styles.writeOptionText}>
                  <span className={styles.writeOptionTitle}>동네 소통/정보 글쓰기</span>
                  <span className={styles.writeOptionDesc}>카테고리 선택 후 텍스트 게시물 작성</span>
                </div>
              </div>

              <div className={styles.writeDivider} />

              <div 
                className={styles.writeOptionBottom}
                onClick={handleMockAddBoast}
              >
                <div className={styles.writeOptionIcon}>📸</div>
                <div className={styles.writeOptionText}>
                  <span className={styles.writeOptionTitle}>에코 댕자랑 글쓰기</span>
                  <span className={styles.writeOptionDesc}>사진 업로드 + NZ마켓 상품 태그</span>
                </div>
              </div>
            </div>

            <button 
              type="button" 
              className={styles.sheetCloseFab}
              onClick={() => setIsWriteModalOpen(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* 커스텀 알림 모달 */}
        {customAlert && (
          <div className={styles.alertBackdrop}>
            <div className={styles.alertCard}>
              <div className={styles.alertIcon}>
                {customAlert.type === "success" ? "🎉" : "🐶"}
              </div>
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
