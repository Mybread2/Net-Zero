"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./write.module.css";
import { ApiError, marketApi, type MarketCategory } from "@/lib/api";
import { getToken, isOnboarded } from "@/lib/auth";

const CATEGORY_TO_ENUM: Record<string, MarketCategory> = {
  먹거리: "FOOD",
  장난감: "TOY",
  생활용품: "DAILY",
  의류: "CLOTHING",
  기타: "ETC",
};

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

const CATEGORIES = ["먹거리", "장난감", "생활용품", "의류", "기타"] as const;
const MOCK_IMAGES = ["/market_kong.png", "/market_bones.png", "/market_dog_scarf.png"];
const DEFAULT_LOCATIONS = [
  "동작구 흑석동",
  "동작구 상도동",
  "관악구 봉천동",
  "관악구 신림동",
  "서초구 반포동",
  "서초구 서초동",
  "강남구 역삼동",
  "강남구 대치동",
  "마포구 망원동",
  "마포구 서교동",
  "송파구 잠실동",
  "용산구 한남동"
];

function WritePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") as "sell" | "buy") || "sell";

  const [loading, setLoading] = useState(true);
  const [ownerName, setOwnerName] = useState("");
  const [locationText, setLocationText] = useState("동작구 흑석동");

  // 입력 필드 상태
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number] | "">("");
  const [priceInput, setPriceInput] = useState(""); // 콤마 포맷팅용 문자열
  const [priceSuggestible, setPriceSuggestible] = useState(false);
  const [description, setDescription] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 알림 모달 상태
  const [customAlert, setCustomAlert] = useState<{
    message: string;
    type: "success" | "warning" | "feature";
    onConfirm?: () => void;
  } | null>(null);

  // 인증/온보딩 확인 + 기본 정보 로드
  useEffect(() => {
    if (!getToken()) {
      router.replace("/onboarding");
      return;
    }
    if (!isOnboarded()) {
      router.replace("/onboarding");
    } else {
      const stored = localStorage.getItem("dangsquare_onboarding_data");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as OnboardingData;
          setOwnerName(parsed.owner.name);
          // 임의의 동네 세팅 (온보딩에 주소 정보가 없으므로 견주 이름에 따라 다변화하거나 기본 흑석동 적용)
          if (parsed.owner.name.includes("관악")) {
            setLocationText("관악구 봉천동");
          } else if (parsed.owner.name.includes("서초")) {
            setLocationText("서초구 반포동");
          } else {
            setLocationText("동작구 흑석동");
          }
        } catch (e) {
          console.error("데이터 로드 실패", e);
        }
      }
      setLoading(false);
    }
  }, [router]);

  // 카테고리 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClose = () => setIsDropdownOpen(false);
    window.addEventListener("click", handleClose);
    return () => {
      window.removeEventListener("click", handleClose);
    };
  }, [isDropdownOpen]);

  // 카메라 슬롯 클릭 시 이미지 무작위/순차 추가 (최대 10개)
  const handleAddPhoto = () => {
    if (uploadedPhotos.length >= 10) {
      setCustomAlert({ message: "사진은 최대 10장까지 등록할 수 있습니다.", type: "warning" });
      return;
    }
    const nextImg = MOCK_IMAGES[uploadedPhotos.length % MOCK_IMAGES.length];
    setUploadedPhotos(prev => [...prev, nextImg]);
  };

  // 이미지 삭제
  const handleDeletePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // 가격 입력 숫자 천 단위 콤마 처리
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, ""); // 숫자만
    if (!rawVal) {
      setPriceInput("");
      return;
    }
    
    // 구매글(buy)에서 범위 입력을 고려한 가격 파싱
    const formatted = Number(rawVal).toLocaleString();
    setPriceInput(formatted);
  };

  // 동네 목록 필터링
  const filteredLocations = DEFAULT_LOCATIONS.filter(loc =>
    loc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 폼 검증
  const isFormValid = title.trim() !== "" && category !== "" && description.trim() !== "";

  // 글 등록: 백엔드 POST /api/market/items.
  // 이미지 업로드(presign + S3 PUT)는 별도 작업이라 지금은 텍스트/카테고리/가격만 전송한다.
  const handleUpload = async () => {
    if (!isFormValid || !category) return;

    const numericPrice = Number(priceInput.replace(/,/g, "")) || 0;
    const categoryEnum = CATEGORY_TO_ENUM[category];

    try {
      await marketApi.create({
        tradeType: type === "sell" ? "SELL" : "BUY",
        category: categoryEnum,
        title: title.trim(),
        content: description.trim(),
        price: type === "sell" ? numericPrice : undefined,
      });

      setCustomAlert({
        message: `${type === "sell" ? "판매글" : "구매희망글"} 등록이 완료되었습니다.`,
        type: "success",
        onConfirm: () => {
          router.push("/market");
        },
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/onboarding");
        return;
      }
      const message = e instanceof ApiError ? e.message : "글 등록에 실패했어요.";
      setCustomAlert({ message, type: "warning" });
    }
  };

  const handleLocationChange = () => {
    setIsLocationModalOpen(true);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ color: "#0e7060", fontWeight: 600 }}>화면 준비 중…</div>
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
            className={styles.closeBtn}
            onClick={() => router.push("/market")}
          >
            닫기
          </button>
          <span className={styles.headerTitle}>중고거래 글쓰기</span>
          <button 
            type="button" 
            className={`${styles.completeBtn} ${isFormValid ? styles.completeBtnActive : ""}`}
            onClick={handleUpload}
            disabled={!isFormValid}
          >
            완료
          </button>
        </header>

        <div className={styles.scrollWrapper}>
          
          {/* Photo Section */}
          <div className={styles.photoSection}>
            <div className={styles.cameraSlot} onClick={handleAddPhoto}>
              {/* 카메라 아이콘 */}
              <svg className={styles.cameraIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span className={styles.cameraSlotText}>{uploadedPhotos.length}/10</span>
            </div>

            {uploadedPhotos.map((photo, index) => (
              <div key={index} className={styles.photoThumbnailSlot}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={`Upload preview ${index + 1}`} className={styles.thumbnail} />
                <button 
                  type="button" 
                  className={styles.deleteBtn}
                  onClick={() => handleDeletePhoto(index)}
                >
                  {/* 작은 엑스 */}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Form Fields Body */}
          <div className={styles.formBody}>
            {/* Title */}
            <div className={styles.inputGroup}>
              <input
                type="text"
                placeholder="글 제목"
                className={styles.inputField}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Category Select */}
            <div className={styles.inputGroup}>
              <div className={styles.customSelectWrapper}>
                <div 
                  className={`${styles.customSelectTrigger} ${category === "" ? styles.selectPlaceholder : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(prev => !prev);
                  }}
                >
                  <span>{category || "카테고리 선택"}</span>
                  <svg 
                    className={`${styles.chevronIcon} ${isDropdownOpen ? styles.chevronOpen : ""}`} 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                
                {isDropdownOpen && (
                  <div 
                    className={styles.dropdownOptions}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {CATEGORIES.map(cat => (
                      <div 
                        key={cat} 
                        className={`${styles.dropdownOption} ${category === cat ? styles.dropdownOptionActive : ""}`}
                        onClick={() => {
                          setCategory(cat);
                          setIsDropdownOpen(false);
                        }}
                      >
                        {cat}
                        {category === cat && <span className={styles.checkedMark}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Price */}
            <div className={styles.inputGroup}>
              <div className={styles.priceInputContainer}>
                <span className={styles.priceIcon}>₩</span>
                <input
                  type="text"
                  placeholder={type === "sell" ? "가격 입력 (무료는 0원 입력)" : "희망 구매가격 입력 (예: 8,000)"}
                  className={styles.inputField}
                  value={priceInput}
                  onChange={handlePriceChange}
                />
              </div>
            </div>

            {/* Price Suggest Toggle */}
            <div className={styles.toggleRow}>
              <div className={styles.toggleMeta}>
                <span className={styles.toggleTitle}>가격 제안 받기</span>
                <span className={styles.toggleDesc}>구매자가 원하는 가격을 제안할 수 있어요</span>
              </div>
              <div 
                className={`${styles.toggleSwitch} ${priceSuggestible ? styles.toggleSwitchActive : ""}`}
                onClick={() => setPriceSuggestible(prev => !prev)}
              >
                <div className={styles.toggleHandle} />
              </div>
            </div>

            {/* Description Textarea */}
            <div className={styles.textareaGroup}>
              <textarea
                placeholder={`우리 아이가 쓰던 물품의 상세 정보를 적어주세요.\n\n• 구매 시기, 사용 횟수\n• 상품 상태, 하자 여부\n• 기타 참고 사항`}
                className={styles.textareaField}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Location display block */}
            <div className={styles.locationBlock}>
              <div className={styles.locationLeft}>
                {/* 핀 아이콘 */}
                <svg className={styles.locationIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{locationText}</span>
              </div>
              <button 
                type="button" 
                className={styles.changeBtn}
                onClick={handleLocationChange}
              >
                변경
              </button>
            </div>

          </div>

          {/* Action Upload button */}
          <div className={styles.actionBlock}>
            <button
              type="button"
              className={`${styles.uploadBtn} ${!isFormValid ? styles.uploadBtnDisabled : ""}`}
              onClick={handleUpload}
              disabled={!isFormValid}
            >
              글 업로드 하기
            </button>
          </div>

        </div>

        {/* 커스텀 알림 모달 */}
        {customAlert && (
          <div className={styles.alertBackdrop}>
            <div className={styles.alertCard}>
              <div className={styles.alertIcon}>
                {customAlert.type === "success" && "📦"}
                {customAlert.type === "warning" && "⚠️"}
                {customAlert.type === "feature" && "🐶"}
              </div>
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

        {/* Location Selection Modal */}
        {isLocationModalOpen && (
          <div className={styles.alertBackdrop}>
            <div className={styles.locationModal}>
              <div className={styles.locationModalHeader}>
                <span className={styles.locationModalTitle}>동네 선택</span>
                <button 
                  type="button" 
                  className={styles.locationModalCloseBtn}
                  onClick={() => {
                    setIsLocationModalOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Search Bar */}
              <div className={styles.locationSearchBox}>
                <svg className={styles.locationSearchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input 
                  type="text" 
                  placeholder="동 이름으로 검색 (예: 흑석동)"
                  className={styles.locationSearchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Location List */}
              <div className={styles.locationList}>
                {filteredLocations.length > 0 ? (
                  filteredLocations.map(loc => (
                    <div 
                      key={loc}
                      className={`${styles.locationItem} ${locationText === loc ? styles.locationItemActive : ""}`}
                      onClick={() => {
                        setLocationText(loc);
                        setIsLocationModalOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <span>{loc}</span>
                      {locationText === loc && <span className={styles.locationCheck}>✓</span>}
                    </div>
                  ))
                ) : (
                  searchQuery.trim() !== "" ? (
                    <div 
                      className={styles.locationItemCustom}
                      onClick={() => {
                        setLocationText(searchQuery.trim());
                        setIsLocationModalOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <span className={styles.customLocText}>"{searchQuery.trim()}" 추가하여 선택하기</span>
                      <span className={styles.plusIcon}>+</span>
                    </div>
                  ) : (
                    <div className={styles.locationEmpty}>검색 결과가 없습니다.</div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function WritePage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div style={{ color: "#0e7060", fontWeight: 600 }}>중고거래 준비 중…</div>
      </div>
    }>
      <WritePageContent />
    </Suspense>
  );
}
