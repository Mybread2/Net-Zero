"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./communityDetail.module.css";
import FooterBar from "@/components/FooterBar";
import {
  getCommunityPostById,
  updateCommunityPost,
  type CommunityPost,
  type Comment
} from "@/lib/communityMock";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function CommunityDetail({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const postId = Number(resolvedParams.id);

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<CommunityPost | undefined>(undefined);
  const [commentText, setCommentText] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isTagTooltipOpen, setIsTagTooltipOpen] = useState(false);

  // 현재 사용자 이름 (온보딩에서 가져옴)
  const [ownerName, setOwnerName] = useState("나");
  const [ownerAvatar, setOwnerAvatar] = useState("나");

  const [customAlert, setCustomAlert] = useState<{
    message: string;
    type: "success" | "warning" | "feature";
  } | null>(null);

  useEffect(() => {
    const isCompleted = localStorage.getItem("dangsquare_onboarding_completed");
    if (isCompleted !== "true") {
      router.push("/onboarding");
      return;
    }

    const currentPost = getCommunityPostById(postId);
    if (!currentPost) {
      router.push("/community");
      return;
    }

    // 조회수 증가 및 저장
    const updatedPost = { ...currentPost, views: currentPost.views + 1 };
    updateCommunityPost(updatedPost);

    setPost(updatedPost);
    setIsFollowing(updatedPost.isFollowing);
    setLikesCount(updatedPost.likes);
    
    // 온보딩 닉네임 로드
    const stored = localStorage.getItem("dangsquare_onboarding_data");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.owner.name) {
          setOwnerName(parsed.owner.name);
          setOwnerAvatar(parsed.owner.name.charAt(0));
        }
      } catch (e) {}
    }

    setLoading(false);
  }, [postId, router]);

  const handleFeatureAlert = (featureName: string) => {
    setCustomAlert({
      message: `"${featureName}" 서비스는 준비 중입니다!\n단추가 열심히 개발하고 있어요 🐶`,
      type: "feature"
    });
  };

  // 팔로우 토글
  const handleFollowToggle = () => {
    if (!post) return;
    const nextVal = !isFollowing;
    setIsFollowing(nextVal);
    
    const updated = { ...post, isFollowing: nextVal };
    updateCommunityPost(updated);
  };

  // 좋아요 토글
  const handleLikeToggle = () => {
    if (!post) return;
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    
    const nextCount = likesCount + (nextLiked ? 1 : -1);
    setLikesCount(nextCount);

    const updated = { ...post, likes: nextCount };
    updateCommunityPost(updated);
  };

  // 댓글 등록
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !commentText.trim()) return;

    const newComment: Comment = {
      id: post.commentsList.length > 0 ? Math.max(...post.commentsList.map(c => c.id)) + 1 : 1,
      userName: ownerName,
      userAvatar: ownerAvatar,
      userAvatarBg: post.type === "boast" ? "#FBBF24" : "#A7F3D0", // 댕자랑은 노란색, 정보는 초록색
      text: commentText.trim(),
      timeText: "방금 전"
    };

    const updatedPost: CommunityPost = {
      ...post,
      commentsCount: post.commentsCount + 1,
      commentsList: [...post.commentsList, newComment]
    };

    updateCommunityPost(updatedPost);
    setPost(updatedPost);
    setCommentText("");
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ color: "#0e7060", fontWeight: 600 }}>게시물 불러오는 중…</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className={styles.container}>
        <div style={{ color: "#EF4444", fontWeight: 600 }}>게시물이 존재하지 않습니다.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        
        {/* Header */}
        <header className={styles.headerBlock}>
          <button 
            type="button" 
            className={styles.backBtn}
            onClick={() => router.push("/community")}
          >
            {/* 뒤로가기 화살표 */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>{post.type === "boast" ? "댕자랑" : "동네 댕정보"}</span>
          </button>
          <span className={styles.headerTitle}>상세보기</span>
          <button 
            type="button" 
            className={styles.moreBtn}
            onClick={() => handleFeatureAlert("더보기")}
          >
            •••
          </button>
        </header>

        {/* Scrollable contents */}
        <div className={styles.scrollWrapper}>
          
          {/* 동네 댕정보일 때만 상단 카테고리 태그 노출 */}
          {post.type === "info" && post.category && (
            <div className={styles.badgeRow}>
              <span className={`${styles.infoBadge} ${
                post.category === "추천해요" ? styles.badgeRecommend :
                post.category === "에코라이프" ? styles.badgeEco :
                styles.badgeSotong
              }`}>
                {post.category === "추천해요" ? "🏥 추천해요" :
                 post.category === "에코라이프" ? "🌿 에코라이프" :
                 "🔥 동네소통"}
              </span>
            </div>
          )}

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
              className={`${styles.followBtn} ${isFollowing ? styles.followBtnActive : ""}`}
              onClick={handleFollowToggle}
            >
              {isFollowing ? "팔로잉" : "팔로우"}
            </button>
          </div>

          {/* 동네 댕정보 글 제목 */}
          {post.type === "info" && post.title && (
            <h1 className={styles.infoDetailTitle}>{post.title}</h1>
          )}

          {/* 댕자랑 전용 메인 이미지 & 태그 핀 */}
          {post.type === "boast" && post.image && (
            <div className={styles.imageArea}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={post.image} 
                alt={`${post.userName}'s boast details`} 
                className={styles.feedImage}
              />

              {/* 친환경 상품 태그 핀 */}
              {post.productTag && (
                <>
                  <div 
                    className={styles.productPin}
                    style={{ 
                      left: `${post.productTag.x}%`, 
                      top: `${post.productTag.y}%` 
                    }}
                    onClick={() => setIsTagTooltipOpen(prev => !prev)}
                  />
                  
                  {isTagTooltipOpen && (
                    <div 
                      className={styles.tagTooltip}
                      style={{ 
                        left: `${post.productTag.x - 10}%`, 
                        top: `${post.productTag.y - 12}%` 
                      }}
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
          )}

          {/* 본문 설명 */}
          <div className={styles.feedDescArea}>
            <p style={{ whiteSpace: "pre-line" }}>
              {post.type === "boast" && <span className={styles.descName}>{post.userName}</span>}
              {post.description}
            </p>
            {post.type === "boast" && post.hashtags && post.hashtags.length > 0 && (
              <div className={styles.hashtagsRow}>
                {post.hashtags.map(tag => (
                  <span 
                    key={tag} 
                    className={styles.hashtag}
                    onClick={() => handleFeatureAlert(`#${tag} 검색`)}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 동네 댕정보 전용 스펙 카드 박스 */}
          {post.type === "info" && post.infoFields && post.infoFields.length > 0 && (
            <div className={styles.infoSpecCard}>
              {post.infoFields.map((field, idx) => (
                <div key={idx} className={styles.specRow}>
                  <span className={styles.specLabel}>
                    {field.label.includes("위치") ? "📍 위치" :
                     field.label.includes("진찰") ? "💰 진찰비" :
                     field.label.includes("시간") ? "⏰ 운영시간" :
                     field.label.includes("예약") ? "📞 예약" : field.label}
                  </span>
                  <span className={styles.specValue}>{field.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* 동네 댕정보 게시글 첨부 이미지 */}
          {post.type === "info" && post.image && (
            <div className={styles.infoPostImageBlock}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={post.image} 
                alt="Attached document info" 
                className={styles.infoPostImg}
              />
            </div>
          )}

          {/* Interaction Row (Likes, Comments Count, Views) */}
          <div className={styles.actionRow}>
            <div className={styles.leftActions}>
              <button 
                type="button" 
                className={`${styles.actionBtn} ${isLiked ? styles.actionBtnLiked : ""}`}
                onClick={handleLikeToggle}
              >
                {/* 발바닥 */}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <circle cx="8" cy="7" r="2.2" />
                  <circle cx="12" cy="5.2" r="2.2" />
                  <circle cx="16" cy="7" r="2.2" />
                  <path d="M12 10.5c-2.4 0-4.3 1.8-4.3 4.2 0 1.3.6 2.5 1.6 3.2v.3c0 1.2.9 2.1 2.1 2.1s2.1-.9 2.1-2.1v-.3c1-.7 1.6-1.9 1.6-3.2 0-2.4-1.9-4.2-4.5-4.2z" />
                </svg>
                <span>{likesCount}</span>
              </button>
              
              <div className={styles.actionBtn}>
                {/* 말풍선 */}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>{post.commentsList.length}</span>
              </div>
            </div>

            <span className={styles.viewsText}>조회 {post.views}</span>
          </div>

          {/* Comment List */}
          <div className={styles.commentSectionTitle}>댓글 {post.commentsList.length}개</div>
          <div className={styles.commentsList}>
            {post.commentsList.length === 0 ? (
              <div className={styles.emptyComments}>가장 먼저 댓글을 남겨보세요! 🐶</div>
            ) : (
              post.commentsList.map(comment => (
                <div key={comment.id} className={styles.commentItem}>
                  <div 
                    className={styles.commentAvatar}
                    style={{ backgroundColor: comment.userAvatarBg }}
                  >
                    {comment.userAvatar}
                  </div>
                  <div className={styles.commentContent}>
                    <div className={styles.commentUserRow}>
                      <span className={styles.commentUser}>{comment.userName}</span>
                      <span className={styles.commentTime}>{comment.timeText}</span>
                    </div>
                    <p className={styles.commentText}>{comment.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Bottom Fixed Comment Form */}
        <form className={styles.commentFormBlock} onSubmit={handleCommentSubmit}>
          <div className={`${styles.myAvatar} ${post.type === "info" ? styles.myAvatarGreen : ""}`}>
            {ownerAvatar}
          </div>
          <input 
            type="text"
            placeholder="댓글을 입력하세요..."
            className={styles.commentInput}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button 
            type="submit" 
            className={`${styles.submitBtn} ${commentText.trim() ? styles.submitBtnActive : ""}`}
            disabled={!commentText.trim()}
          >
            등록
          </button>
        </form>

        {/* Footer Bar */}
        <FooterBar activeTab="community" onFeatureAlert={handleFeatureAlert} />

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
