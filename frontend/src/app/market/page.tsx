"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./market.module.css";
import FooterBar from "@/components/FooterBar";
import {
  getCartItems,
  addToCart,
  type MarketItem,
  type ShopItem,
} from "@/lib/marketMock";
import {
  ApiError,
  marketApi,
  marketplaceApi,
  type MarketCategory,
  type MarketListItem,
  type MarketplaceCategory,
  type MarketplaceProduct,
  type TradeType,
} from "@/lib/api";
import { getToken, isOnboarded } from "@/lib/auth";

const CATEGORIES_USED = ["전체", "먹거리", "장난감", "생활용품", "의류", "기타"] as const;
const CATEGORIES_SHOP = ["전체", "먹거리", "생활용품", "기타"] as const;

const USED_CATEGORY_TO_ENUM: Record<typeof CATEGORIES_USED[number], MarketCategory | undefined> = {
  전체: undefined,
  먹거리: "FOOD",
  장난감: "TOY",
  생활용품: "DAILY",
  의류: "CLOTHING",
  기타: "ETC",
};

const USED_ENUM_TO_LABEL: Record<MarketCategory, MarketItem["category"]> = {
  FOOD: "먹거리",
  TOY: "장난감",
  DAILY: "생활용품",
  CLOTHING: "의류",
  ETC: "기타",
};

const SHOP_CATEGORY_TO_ENUM: Record<typeof CATEGORIES_SHOP[number], MarketplaceCategory | undefined> = {
  전체: undefined,
  먹거리: "FOOD",
  생활용품: "DAILY",
  기타: "ETC",
};

// 백엔드 MarketListItem (SELL/BUY 둘 다 섞여 옴) → UI MarketItem 어댑터.
// 작성자/매너온도/조회수 등은 목록 응답에 없으므로 기본값을 채운다.
function adaptMarketItem(item: MarketListItem, fallbackCategory: MarketItem["category"] = "기타"): MarketItem {
  const isSell = item.tradeType === "SELL";
  return {
    id: item.itemId,
    title: item.title,
    type: isSell ? "sell" : "buy",
    category: fallbackCategory,
    price: item.price ?? 0,
    priceSuggestible: false,
    location: "",
    timeText: item.createdAt ? formatRelativeTime(item.createdAt) : "",
    images: item.thumbnailUrl ? [item.thumbnailUrl] : [],
    likes: item.heartCount ?? 0,
    comments: 0,
    views: 0,
    description: item.content ?? "",
    sellerName: item.author?.nickname ?? "",
    sellerTemp: 36.5,
    isCompleted: false,
  };
}

// 백엔드 MarketplaceProduct → UI ShopItem 어댑터.
function adaptShopItem(p: MarketplaceProduct, fallbackCategory: ShopItem["category"]): ShopItem {
  return {
    id: p.productId,
    title: p.title,
    brandName: p.company,
    price: p.price,
    rating: p.rating,
    reviewsCount: p.ratingCount,
    category: fallbackCategory,
    images: p.imageUrl ? [p.imageUrl] : [],
    tags: p.lowCarbonSummary ? [p.lowCarbonSummary] : [],
    isEco: true,
  };
}

function formatRelativeTime(iso: string): string {
  const diffSec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "방금 전";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  return `${Math.floor(diffSec / 86400)}일 전`;
}

export default function MarketMain() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  
  // 메인 탭 상태 ("used" = 중고거래, "shop" = NZ마켓플레이스)
  const [activeMainTab, setActiveMainTab] = useState<"used" | "shop">("used");
  
  // 중고거래 목록 데이터
  const [usedItems, setUsedItems] = useState<MarketItem[]>([]);
  // 마켓플레이스 목록 데이터
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  // 장바구니 아이템 개수
  const [cartCount, setCartCount] = useState(0);

  // 중고거래 필터 상태
  const [selectedCategoryUsed, setSelectedCategoryUsed] = useState<string>("전체");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [filterTypeUsed, setFilterTypeUsed] = useState<"all" | "sell" | "buy">("all");

  // 마켓플레이스 필터 상태
  const [selectedCategoryShop, setSelectedCategoryShop] = useState<string>("전체");
  const [shopSortType, setShopSortType] = useState<"price" | "sales" | "reviews">("sales"); // 기본 판매량순

  // 모달 및 바텀시트 상태
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [customAlert, setCustomAlert] = useState<{
    message: string;
    type: "success" | "warning" | "feature";
  } | null>(null);

  // 장바구니 개수 업데이트 함수
  const updateCartCount = () => {
    const cart = getCartItems();
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    setCartCount(totalQty);
  };

  // 인증/온보딩 가드 + 장바구니 카운트 리스너
  useEffect(() => {
    if (!getToken()) {
      router.replace("/onboarding");
      return;
    }
    if (!isOnboarded()) {
      router.replace("/onboarding");
      return;
    }
    updateCartCount();
    window.addEventListener("dangsquare_cart_updated", updateCartCount);
    return () => {
      window.removeEventListener("dangsquare_cart_updated", updateCartCount);
    };
  }, [router]);

  // 중고거래 목록: 카테고리/유형 필터에 따라 백엔드 호출.
  useEffect(() => {
    const tradeType: TradeType | undefined =
      filterTypeUsed === "sell" ? "SELL" : filterTypeUsed === "buy" ? "BUY" : undefined;
    const category = USED_CATEGORY_TO_ENUM[selectedCategoryUsed as typeof CATEGORIES_USED[number]];

    let cancelled = false;
    (async () => {
      try {
        const page = await marketApi.list({
          tradeType,
          category,
          status: hideCompleted ? "ON_SALE" : undefined,
          size: 50,
        });
        if (cancelled) return;
        const fallbackCategory = category ? USED_ENUM_TO_LABEL[category] : "기타";
        setUsedItems(page.content.map((i) => adaptMarketItem(i, fallbackCategory)));
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/onboarding");
          return;
        }
        setUsedItems([]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterTypeUsed, selectedCategoryUsed, hideCompleted, router]);

  // 마켓플레이스 상품 목록: 카테고리에 따라 백엔드 호출.
  useEffect(() => {
    const category = SHOP_CATEGORY_TO_ENUM[selectedCategoryShop as typeof CATEGORIES_SHOP[number]];
    const labelCategory = (selectedCategoryShop === "전체" ? "기타" : selectedCategoryShop) as ShopItem["category"];

    let cancelled = false;
    (async () => {
      try {
        const page = await marketplaceApi.list(category, 0, 50);
        if (cancelled) return;
        setShopItems(page.content.map((p) => adaptShopItem(p, labelCategory)));
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/onboarding");
          return;
        }
        setShopItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryShop, router]);

  // 커스텀 알림 처리
  const handleFeatureAlert = (featureName: string) => {
    setCustomAlert({
      message: `"${featureName}" 서비스는 준비 중입니다!\n단추가 열심히 개발하고 있어요 🐶`,
      type: "feature"
    });
  };

  // 장바구니 퀵 담기 기능
  const handleQuickAddToCart = (e: React.MouseEvent, item: ShopItem) => {
    e.stopPropagation(); // 카드 클릭 라우팅 방지
    // 하네스/의류는 'M' 사이즈, 나머지는 'FREE'
    const defaultSize = item.category === "생활용품" && item.title.includes("하네스") ? "M" : "FREE";
    addToCart(item, defaultSize, 1);
    
    setCustomAlert({
      message: `"${item.title}"이(가) 장바구니에 추가되었습니다.`,
      type: "success"
    });
  };

  // 중고거래 필터링된 아이템
  const filteredUsedItems = usedItems.filter(item => {
    if (selectedCategoryUsed !== "전체" && item.category !== selectedCategoryUsed) {
      return false;
    }
    if (hideCompleted && item.isCompleted) {
      return false;
    }
    if (filterTypeUsed !== "all" && item.type !== filterTypeUsed) {
      return false;
    }
    return true;
  });

  // 마켓플레이스 필터링 및 정렬된 아이템
  const filteredShopItems = shopItems
    .filter(item => {
      if (selectedCategoryShop !== "전체" && item.category !== selectedCategoryShop) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (shopSortType === "price") {
        return a.price - b.price; // 가격 낮은 순
      } else if (shopSortType === "reviews") {
        return b.rating - a.rating; // 평점 높은 순
      } else {
        return b.reviewsCount - a.reviewsCount; // 판매량(리뷰수 기준) 순
      }
    });

  // 가격 표시 포맷팅
  const formatPrice = (price: number) => {
    if (price === 0) return "무료나눔";
    return `${price.toLocaleString()}원`;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ color: "#0e7060", fontWeight: 600 }}>NZ마켓 불러오는 중…</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        
        {/* Header */}
        <header className={styles.headerBlock}>
          <span className={styles.title} onClick={() => router.push("/")}>Dangsquare</span>
          <div className={styles.headerIcons}>
            <button type="button" className={styles.iconBtn} onClick={() => handleFeatureAlert("검색")}>
              {/* 돋보기 아이콘 */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            
            {/* 장바구니 아이콘 추가 */}
            <button 
              type="button" 
              className={`${styles.iconBtn} ${styles.cartIconBtn}`} 
              onClick={() => router.push("/market/cart")}
            >
              {/* 장바구니 🛒 아이콘 */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {cartCount > 0 && (
                <div className={styles.cartCountBadge}>{cartCount}</div>
              )}
            </button>

            <button type="button" className={styles.iconBtn} onClick={() => handleFeatureAlert("알림")}>
              {/* 종 아이콘 */}
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
            className={`${styles.tabItem} ${activeMainTab === "used" ? styles.tabItemActive : ""}`}
            onClick={() => setActiveMainTab("used")}
          >
            중고거래
            {activeMainTab === "used" && <div className={styles.tabIndicator} />}
          </button>
          <button 
            type="button" 
            className={`${styles.tabItem} ${activeMainTab === "shop" ? styles.tabItemActive : ""}`}
            onClick={() => setActiveMainTab("shop")}
          >
            NZ마켓플레이스
            {activeMainTab === "shop" && <div className={styles.tabIndicator} />}
          </button>
        </div>

        {/* Scrollable contents */}
        <div className={styles.scrollWrapper}>
          
          {activeMainTab === "used" ? (
            /* =================== 중고거래 뷰 =================== */
            <>
              {/* Category Chips Scroll */}
              <div className={styles.categoryBlock}>
                {CATEGORIES_USED.map(category => (
                  <button
                    key={category}
                    type="button"
                    className={`${styles.chip} ${selectedCategoryUsed === category ? styles.chipActive : ""}`}
                    onClick={() => setSelectedCategoryUsed(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Filter Option Row */}
              <div className={styles.filterRow}>
                <div 
                  className={styles.toggleContainer} 
                  onClick={() => setHideCompleted(prev => !prev)}
                >
                  <div className={`${styles.toggleSwitch} ${hideCompleted ? styles.toggleSwitchActive : ""}`}>
                    <div className={styles.toggleHandle} />
                  </div>
                  <span className={styles.toggleLabel}>숨기기</span>
                </div>

                <div className={styles.segmentControl}>
                  <button
                    type="button"
                    className={`${styles.segmentItem} ${filterTypeUsed === "all" ? styles.segmentItemActive : ""}`}
                    onClick={() => setFilterTypeUsed("all")}
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    className={`${styles.segmentItem} ${filterTypeUsed === "sell" ? styles.segmentItemActive : ""}`}
                    onClick={() => setFilterTypeUsed("sell")}
                  >
                    팔아요
                  </button>
                  <button
                    type="button"
                    className={`${styles.segmentItem} ${filterTypeUsed === "buy" ? styles.segmentItemActive : ""}`}
                    onClick={() => setFilterTypeUsed("buy")}
                  >
                    사요
                  </button>
                </div>
              </div>

              {/* Used Items List */}
              {filteredUsedItems.length === 0 ? (
                <div className={styles.emptyBlock}>
                  등록된 상품 정보가 없습니다.
                </div>
              ) : (
                <div className={styles.itemList}>
                  {filteredUsedItems.map(item => (
                    <div 
                      key={item.id} 
                      className={styles.itemCard}
                      onClick={() => router.push(`/market/${item.id}`)}
                    >
                      <div className={styles.imageWrapper}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={item.images[0] || "/dangsquare_mascot_official.png"} 
                          alt={item.title} 
                          className={styles.thumbnail}
                        />
                        <div className={`${styles.badge} ${item.type === "sell" ? styles.badgeSell : styles.badgeBuy}`}>
                          {item.type === "sell" ? "판매글" : "구매글"}
                        </div>
                      </div>

                      <div className={styles.itemDetails}>
                        <div>
                          <h3 className={styles.itemTitle}>{item.title}</h3>
                          <div className={styles.itemMeta}>
                            {item.location} • {item.timeText}
                          </div>
                        </div>

                        <div className={styles.priceRow}>
                          <span className={styles.price}>
                            {item.type === "buy" && item.priceRange ? (
                              <span className={styles.buyPriceLabel}>
                                희망가 <span className={styles.buyPrice}>{item.priceRange}원</span>
                              </span>
                            ) : (
                              formatPrice(item.price)
                            )}
                          </span>

                          <div className={styles.cardIcons}>
                            {/* 발바닥 (likes) */}
                            <span className={styles.iconText}>
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                                <circle cx="8" cy="7" r="2.2" />
                                <circle cx="12" cy="5.2" r="2.2" />
                                <circle cx="16" cy="7" r="2.2" />
                                <path d="M12 10.5c-2.4 0-4.3 1.8-4.3 4.2 0 1.3.6 2.5 1.6 3.2v.3c0 1.2.9 2.1 2.1 2.1s2.1-.9 2.1-2.1v-.3c1-.7 1.6-1.9 1.6-3.2 0-2.4-1.9-4.2-4.5-4.2z" />
                              </svg>
                              {item.likes}
                            </span>
                            {/* 말풍선 (comments) */}
                            <span className={styles.iconText}>
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                              </svg>
                              {item.comments}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* =================== NZ마켓플레이스 뷰 =================== */
            <>
              {/* Eco Banner */}
              <div className={styles.banner}>
                <div className={styles.bannerText}>
                  <span className={styles.bannerSubTitle}>Eco · Sustainable · Pet Care</span>
                  <span className={styles.bannerTitle}>NZ마켓플레이스</span>
                  <span className={styles.bannerDesc}>지구를 사랑하는 친환경 펫 용품</span>
                </div>
                <div className={styles.bannerLeaf}>🌿</div>
              </div>

              {/* Shop Category Chips */}
              <div className={styles.categoryBlock}>
                {CATEGORIES_SHOP.map(category => (
                  <button
                    key={category}
                    type="button"
                    className={`${styles.chip} ${selectedCategoryShop === category ? styles.chipActive : ""}`}
                    onClick={() => setSelectedCategoryShop(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Sort Filter Row */}
              <div className={styles.sortRow}>
                <span className={styles.itemCountText}>상품 {filteredShopItems.length}개</span>
                
                <div className={styles.sortBtnGroup}>
                  <button
                    type="button"
                    className={`${styles.sortBtn} ${shopSortType === "price" ? styles.sortBtnActive : ""}`}
                    onClick={() => setShopSortType("price")}
                  >
                    가격순
                  </button>
                  <button
                    type="button"
                    className={`${styles.sortBtn} ${shopSortType === "sales" ? styles.sortBtnActive : ""}`}
                    onClick={() => setShopSortType("sales")}
                  >
                    판매량순
                  </button>
                  <button
                    type="button"
                    className={`${styles.sortBtn} ${shopSortType === "reviews" ? styles.sortBtnActive : ""}`}
                    onClick={() => setShopSortType("reviews")}
                  >
                    리뷰순
                  </button>
                </div>
              </div>

              {/* 2-Column Product Grid */}
              {filteredShopItems.length === 0 ? (
                <div className={styles.emptyBlock}>
                  친환경 입점 상품이 준비 중입니다.
                </div>
              ) : (
                <div className={styles.shopGrid}>
                  {filteredShopItems.map(item => (
                    <div 
                      key={item.id} 
                      className={styles.shopCard}
                      onClick={() => router.push(`/market/shop/${item.id}`)}
                    >
                      <div className={styles.shopImageWrapper}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={item.images[0]} 
                          alt={item.title} 
                          className={styles.shopImg}
                        />
                        {/* 에코/베스트 뱃지 */}
                        {item.isBest ? (
                          <div className={`${styles.shopBadge} ${styles.badgeBest}`}>베스트</div>
                        ) : item.isEco ? (
                          <div className={`${styles.shopBadge} ${styles.badgeEco}`}>에코</div>
                        ) : null}

                        {/* 장바구니 퀵 담기 동그라미 버튼 */}
                        <button
                          type="button"
                          className={styles.shopCartBtn}
                          onClick={(e) => handleQuickAddToCart(e, item)}
                        >
                          {/* 미니 장바구니 */}
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                          </svg>
                        </button>
                      </div>

                      <div className={styles.shopInfo}>
                        <span className={styles.shopBrand}>{item.brandName}</span>
                        <h4 className={styles.shopTitle}>{item.title}</h4>
                        
                        <div className={styles.shopRatingRow}>
                          ★ {item.rating}
                          <span className={styles.shopReviews}>({item.reviewsCount})</span>
                        </div>

                        <div className={styles.shopPriceRow}>
                          <span className={styles.shopPrice}>
                            {item.price.toLocaleString()}원
                          </span>
                          {item.originalPrice && (
                            <span className={styles.shopOriginalPrice}>
                              {item.originalPrice.toLocaleString()}원
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>

        {/* Floating Action Button (FAB) - 중고거래 활성 시에만 노출 */}
        {activeMainTab === "used" && (
          <button 
            type="button" 
            className={`${styles.fab} ${isBottomSheetOpen ? styles.fabOpen : ""}`}
            onClick={() => setIsBottomSheetOpen(prev => !prev)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}

        {/* Footer Bar */}
        <FooterBar activeTab="market" onFeatureAlert={handleFeatureAlert} />

        {/* Write Menu Modal */}
        {isBottomSheetOpen && activeMainTab === "used" && (
          <div 
            className={styles.modalBackdrop}
            onClick={() => setIsBottomSheetOpen(false)}
          >
            <div 
              className={styles.writeModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className={styles.writeOptionSell}
                onClick={() => {
                  setIsBottomSheetOpen(false);
                  router.push("/market/write?type=sell");
                }}
              >
                <div className={styles.writeOptionIcon}>📦</div>
                <div className={styles.writeOptionText}>
                  <span className={styles.writeOptionTitle}>상품판매글 등록하기</span>
                  <span className={styles.writeOptionDesc}>내 물건을 판매해요</span>
                </div>
              </div>

              <div className={styles.writeDivider} />

              <div 
                className={styles.writeOptionBuy}
                onClick={() => {
                  setIsBottomSheetOpen(false);
                  router.push("/market/write?type=buy");
                }}
              >
                <div className={styles.writeOptionIcon}>🔍</div>
                <div className={styles.writeOptionText}>
                  <span className={styles.writeOptionTitle}>구매희망글 등록하기</span>
                  <span className={styles.writeOptionDesc}>원하는 물건을 찾아요</span>
                </div>
              </div>
            </div>

            <button 
              type="button" 
              className={styles.sheetCloseFab}
              onClick={() => setIsBottomSheetOpen(false)}
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
                {customAlert.type === "success" ? "🛒" : "🐶"}
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
