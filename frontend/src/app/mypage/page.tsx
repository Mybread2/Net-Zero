"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./mypage.module.css";
import FooterBar from "@/components/FooterBar";
import {
  ApiError,
  userApi,
  type DogTemperament,
  type Gender,
  type UserMeDto,
  type UserUpdatePayload,
} from "@/lib/api";
import { clearAuth, getToken } from "@/lib/auth";

type Personality = "active" | "warm" | "shy" | "";

function temperamentToPersonality(t: DogTemperament | undefined | null): Personality {
  switch (t) {
    case "ACTIVE":
      return "active";
    case "FRIENDLY":
    case "CALM":
      return "warm";
    case "SHY":
    case "INDEPENDENT":
    case "ETC":
      return "shy";
    default:
      return "";
  }
}

function personalityToTemperament(p: Personality): DogTemperament {
  switch (p) {
    case "active": return "ACTIVE";
    case "warm": return "FRIENDLY";
    case "shy": return "SHY";
    default: return "ETC";
  }
}

function genderApiToUi(g: Gender | null | undefined): "male" | "female" | "" {
  if (g === "MALE") return "male";
  if (g === "FEMALE") return "female";
  return "";
}

function meToOnboardingData(me: UserMeDto, fallbackPhoto: string | null): OnboardingData {
  const dog = me.dogs[0];
  return {
    owner: {
      name: me.nickname ?? "",
      gender: genderApiToUi(me.gender),
    },
    dog: {
      name: dog?.name ?? "",
      gender: genderApiToUi(dog?.gender),
      breed: dog?.breed ?? "",
      personality: temperamentToPersonality(dog?.temperament),
      photo: dog?.imageUrl ?? fallbackPhoto,
    },
    completedAt: me.lastActiveAt ?? new Date().toISOString(),
  };
}

const BREED_LIST = [
  "말티즈",
  "토이 푸들",
  "포메라니안",
  "믹스견",
  "비숑 프리제",
  "골든 리트리버",
  "시바견",
  "웰시 코기",
  "진돗개",
  "치와와"
];

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

export default function MyPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OnboardingData | null>(null);
  
  // 프로필 수정 모달 상태 (profile: 전체 모달, 개별 필드 이름: 개별 모달)
  const [activeEditField, setActiveEditField] = useState<"profile" | "ownerName" | "ownerGender" | "dogName" | "dogBreed" | "dogPersonality" | null>(null);

  // 커스텀 알림 모달 상태 (null 이면 비활성, { message, type, onConfirm } 이면 노출)
  const [customAlert, setCustomAlert] = useState<{
    message: string;
    type: "success" | "warning" | "feature";
    onConfirm?: () => void;
  } | null>(null);

  // 커스텀 확인(Confirm) 모달 상태
  const [customConfirm, setCustomConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  
  // 수정 폼 필드 상태
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editOwnerGender, setEditOwnerGender] = useState<"male" | "female" | "">("");
  const [editDogName, setEditDogName] = useState("");
  const [editDogBreed, setEditDogBreed] = useState("");
  const [editDogPersonality, setEditDogPersonality] = useState<"active" | "warm" | "shy" | "">("");
  const [editDogPhoto, setEditDogPhoto] = useState<string | null>(null);

  // 인증 가드 + 백엔드에서 본인 정보 로드. 로컬 캐시는 사진 폴백/초기 표시용.
  useEffect(() => {
    if (!getToken()) {
      router.replace("/onboarding");
      return;
    }

    // 로컬 캐시로 먼저 채워 깜빡임 방지.
    const storedData = localStorage.getItem("dangsquare_onboarding_data");
    let cachedPhoto: string | null = null;
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData) as OnboardingData;
        cachedPhoto = parsed.dog.photo;
        setData(parsed);
        setEditOwnerName(parsed.owner.name);
        setEditOwnerGender(parsed.owner.gender);
        setEditDogName(parsed.dog.name);
        setEditDogBreed(parsed.dog.breed);
        setEditDogPersonality(parsed.dog.personality);
        setEditDogPhoto(parsed.dog.photo);
      } catch (e) {
        console.error("캐시 파싱 실패", e);
      }
    }

    let cancelled = false;
    (async () => {
      try {
        const me = await userApi.me();
        if (cancelled) return;
        if (!me.nickname) {
          router.replace("/onboarding");
          return;
        }
        const next = meToOnboardingData(me, cachedPhoto);
        setData(next);
        setEditOwnerName(next.owner.name);
        setEditOwnerGender(next.owner.gender);
        setEditDogName(next.dog.name);
        setEditDogBreed(next.dog.breed);
        setEditDogPersonality(next.dog.personality);
        setEditDogPhoto(next.dog.photo);
        localStorage.setItem("dangsquare_onboarding_data", JSON.stringify(next));
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/onboarding");
          return;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // 백엔드 PATCH 헬퍼: 현재 폼 상태로 프로필을 갱신하고 로컬 캐시도 동기화.
  const persistUpdate = async (next: OnboardingData): Promise<boolean> => {
    const ownerGender = next.owner.gender;
    if (ownerGender !== "male" && ownerGender !== "female") {
      setCustomAlert({ message: "성별을 선택해주세요.", type: "warning" });
      return false;
    }
    const dogGender = next.dog.gender;

    const payload: UserUpdatePayload = {
      nickname: next.owner.name.trim(),
      gender: ownerGender === "male" ? "MALE" : "FEMALE",
      hasDog: true,
      dog: {
        name: next.dog.name.trim(),
        gender: (dogGender === "male" ? "MALE" : "FEMALE") as Gender,
        breed: next.dog.breed,
        temperament: personalityToTemperament(next.dog.personality),
      },
    };

    try {
      await userApi.update(payload);
      localStorage.setItem("dangsquare_onboarding_data", JSON.stringify(next));
      setData(next);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/onboarding");
        return false;
      }
      const message = e instanceof ApiError ? e.message : "수정에 실패했어요.";
      setCustomAlert({ message, type: "warning" });
      return false;
    }
  };

  // 모달 닫기 및 임시 수정값 취소(리셋) 핸들러
  const handleCloseModal = () => {
    setActiveEditField(null);
    if (data) {
      setEditOwnerName(data.owner.name);
      setEditOwnerGender(data.owner.gender);
      setEditDogName(data.dog.name);
      setEditDogBreed(data.dog.breed);
      setEditDogPersonality(data.dog.personality);
      setEditDogPhoto(data.dog.photo);
    }
  };

  // 프로필 업데이트 완료 핸들러 — 백엔드 PATCH 후 로컬 캐시 동기화.
  const handleSaveProfile = async () => {
    if (!editOwnerName.trim() || !editOwnerGender || !editDogName.trim() || !editDogBreed || !editDogPersonality) {
      setCustomAlert({ message: "모든 프로필 정보를 올바르게 입력해주세요.", type: "warning" });
      return;
    }

    const updatedData: OnboardingData = {
      owner: { name: editOwnerName.trim(), gender: editOwnerGender },
      dog: {
        name: editDogName.trim(),
        gender: data?.dog.gender || "male",
        breed: editDogBreed,
        personality: editDogPersonality as "active" | "warm" | "shy",
        photo: editDogPhoto,
      },
      completedAt: data?.completedAt || new Date().toISOString(),
    };

    if (await persistUpdate(updatedData)) {
      setActiveEditField(null);
      setCustomAlert({ message: "프로필 정보가 수정되었습니다.", type: "success" });
    }
  };

  // 개별 필드 단독 업데이트 — 백엔드 PATCH (필드별 부분 수정도 nickname/gender/hasDog/dog 가 모두 필요한 검증이라 전체 페이로드 전송).
  const handleSaveField = async (field: "ownerName" | "ownerGender" | "dogName" | "dogBreed" | "dogPersonality") => {
    if (!data) return;

    const updatedOwner = { ...data.owner };
    const updatedDog = { ...data.dog };

    switch (field) {
      case "ownerName":
        if (!editOwnerName.trim()) {
          setCustomAlert({ message: "이름을 입력해주세요.", type: "warning" });
          return;
        }
        updatedOwner.name = editOwnerName.trim();
        break;
      case "ownerGender":
        if (!editOwnerGender) {
          setCustomAlert({ message: "성별을 선택해주세요.", type: "warning" });
          return;
        }
        updatedOwner.gender = editOwnerGender;
        break;
      case "dogName":
        if (!editDogName.trim()) {
          setCustomAlert({ message: "강아지 이름을 입력해주세요.", type: "warning" });
          return;
        }
        updatedDog.name = editDogName.trim();
        break;
      case "dogBreed":
        if (!editDogBreed) {
          setCustomAlert({ message: "견종을 선택해주세요.", type: "warning" });
          return;
        }
        updatedDog.breed = editDogBreed;
        break;
      case "dogPersonality":
        if (!editDogPersonality) {
          setCustomAlert({ message: "성향을 선택해주세요.", type: "warning" });
          return;
        }
        updatedDog.personality = editDogPersonality as "active" | "warm" | "shy";
        break;
    }

    const updatedData: OnboardingData = {
      owner: updatedOwner,
      dog: updatedDog,
      completedAt: data.completedAt || new Date().toISOString(),
    };

    if (await persistUpdate(updatedData)) {
      setActiveEditField(null);
      setCustomAlert({ message: "변경되었습니다.", type: "success" });
    }
  };

  // 이미지 업로드
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditDogPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 로그아웃: 토큰/캐시 정리 후 로그인으로.
  const handleLogout = () => {
    setCustomConfirm({
      message: "로그아웃 하시겠습니까?",
      onConfirm: () => {
        clearAuth();
        router.replace("/onboarding");
      },
    });
  };

  // 회원 탈퇴: 백엔드 미구현 → 토큰만 비우고 안내.
  const handleWithdraw = () => {
    setCustomConfirm({
      message: "정말로 회원 탈퇴를 하시겠습니까?\n로컬 캐시가 삭제되고 즉시 로그아웃됩니다.\n(서버 계정 삭제는 추후 지원 예정)",
      onConfirm: () => {
        clearAuth();
        setCustomAlert({
          message: "로그아웃되었습니다. 이용해주셔서 감사합니다.",
          type: "success",
          onConfirm: () => router.replace("/onboarding"),
        });
      },
    });
  };

  // 성향 텍스트 뱃지 매핑
  const renderPersonalityBadge = (personality: "active" | "warm" | "shy" | "") => {
    switch (personality) {
      case "active":
        return (
          <div className={`${styles.badge} ${styles.badgeActive}`}>
            <span className={styles.badgeActiveText}>🔥 활발</span>
          </div>
        );
      case "warm":
        return (
          <div className={`${styles.badge} ${styles.badgeWarm}`}>
            <span className={styles.badgeWarmText}>☀️ 온순</span>
          </div>
        );
      case "shy":
        return (
          <div className={`${styles.badge} ${styles.badgeShy}`}>
            <span className={styles.badgeShyText}>☁️ 소심</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getPersonalityText = (personality: "active" | "warm" | "shy" | "") => {
    switch (personality) {
      case "active":
        return "친근하고 활발해요";
      case "warm":
        return "따뜻하고 온순해요";
      case "shy":
        return "낯을 많이 가려요";
      default:
        return "";
    }
  };

  const handleFeatureAlert = (featureName: string) => {
    setCustomAlert({
      message: `"${featureName}" 기능은 다음 업데이트에 추가될 예정입니다!\n단추가 곧 안내해 드릴게요 🐶`,
      type: "feature"
    });
  };

  if (loading || !data) {
    return (
      <div className={styles.container}>
        <div style={{ color: "#0e7060", fontWeight: 600 }}>불러오는 중…</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.scrollWrapper}>
          
          {/* Header & Owner Profile Header Block */}
          <div className={styles.headerBlock}>
            <div className={styles.headerRow}>
              <div className={styles.title}>마이페이지</div>
              <button 
                type="button" 
                className={styles.editProfileBtn}
                onClick={() => setActiveEditField("profile")}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.41675 1.69072H1.62508C1.33776 1.69072 1.06221 1.80486 0.859049 2.00802C0.655885 2.21118 0.541748 2.48674 0.541748 2.77405V10.3574C0.541748 10.6447 0.655885 10.9203 0.859049 11.1234C1.06221 11.3266 1.33776 11.4407 1.62508 11.4407H9.20842C9.49573 11.4407 9.77128 11.3266 9.97445 11.1234C10.1776 10.9203 10.2917 10.6447 10.2917 10.3574V6.56572" stroke="#6B7280" strokeWidth="1.08333"/>
                  <path d="M9.47925 0.878213C9.69474 0.662724 9.987 0.541664 10.2917 0.541664C10.5965 0.541664 10.8888 0.662724 11.1042 0.878213C11.3197 1.0937 11.4408 1.38597 11.4408 1.69071C11.4408 1.99546 11.3197 2.28772 11.1042 2.50321L5.95841 7.64905L3.79175 8.19071L4.33341 6.02405L9.47925 0.878213Z" stroke="#6B7280" strokeWidth="1.08333"/>
                </svg>
                <span className={styles.editProfileBtnText}>프로필 수정</span>
              </button>
            </div>
            
            {/* Owner & Dog Profile Summary row */}
            <div className={styles.profileSummaryRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={data.dog.photo || "/dangsquare_mascot_official.png"} 
                alt="Dog Profile" 
                className={styles.avatar}
              />
              <div className={styles.ownerInfo}>
                <div className={styles.ownerName}>{data.dog.name} 견주님</div>
                <div className={styles.walkStatusRow}>
                  <div className={styles.statusDot} />
                  <div className={styles.walkStatusText}>산책 가능</div>
                </div>
              </div>
            </div>
          </div>

          {/* Walk Statistics Block */}
          <div className={styles.statsBlock}>
            <div className={styles.statItemBordered}>
              <div className={styles.statValueContainer}>
                <div className={styles.statValue}>28회</div>
              </div>
              <div className={styles.statLabelContainer}>
                <div className={styles.statLabel}>총 산책</div>
              </div>
            </div>
            
            <div className={styles.statItemBordered}>
              <div className={styles.statValueContainer}>
                <div className={styles.statValue}>12명</div>
              </div>
              <div className={styles.statLabelContainer}>
                <div className={styles.statLabel}>함께한 친구</div>
              </div>
            </div>

            <div className={styles.statItem}>
              <div className={styles.statValueContainer}>
                <div className={styles.statValue}>67km</div>
              </div>
              <div className={styles.statLabelContainer}>
                <div className={styles.statLabel}>총 거리</div>
              </div>
            </div>
          </div>

          {/* Profile Details List */}
          <div className={styles.sectionLabelRow}>
            <div className={styles.sectionLabel}>프로필 정보</div>
          </div>
          
          <div className={styles.infoList}>
            {/* 이름 */}
            <div className={styles.infoItem} onClick={() => setActiveEditField("ownerName")}>
              <div className={styles.infoItemContent}>
                <div className={styles.infoLabelContainer}>
                  <div className={styles.infoLabel}>이름</div>
                </div>
                <div className={styles.infoValueContainer}>
                  <div className={styles.infoValue}>{data.owner.name}</div>
                </div>
              </div>
              <div className={styles.editIconWrapper}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.41675 1.69072H1.62508C1.33776 1.69072 1.06221 1.80486 0.859049 2.00802C0.655885 2.21118 0.541748 2.48674 0.541748 2.77405V10.3574C0.541748 10.6447 0.655885 10.9203 0.859049 11.1234C1.06221 11.3266 1.33776 11.4407 1.62508 11.4407H9.20842C9.49573 11.4407 9.77128 11.3266 9.97445 11.1234C10.1776 10.9203 10.2917 10.6447 10.2917 10.3574V6.56572" stroke="#6B7280" strokeWidth="1.08333"/>
                  <path d="M9.47925 0.878213C9.69474 0.662724 9.987 0.541664 10.2917 0.541664C10.5965 0.541664 10.8888 0.662724 11.1042 0.878213C11.3197 1.0937 11.4408 1.38597 11.4408 1.69071C11.4408 1.99546 11.3197 2.28772 11.1042 2.50321L5.95841 7.64905L3.79175 8.19071L4.33341 6.02405L9.47925 0.878213Z" stroke="#6B7280" strokeWidth="1.08333"/>
                </svg>
              </div>
            </div>

            {/* 성별 */}
            <div className={styles.infoItem} onClick={() => setActiveEditField("ownerGender")}>
              <div className={styles.infoItemContent}>
                <div className={styles.infoLabelContainer}>
                  <div className={styles.infoLabel}>성별</div>
                </div>
                <div className={styles.infoValueContainer}>
                  <div className={styles.infoValue}>
                    {data.owner.gender === "male" ? "남성" : "여성"}
                  </div>
                </div>
              </div>
              <div className={styles.editIconWrapper}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.41675 1.69072H1.62508C1.33776 1.69072 1.06221 1.80486 0.859049 2.00802C0.655885 2.21118 0.541748 2.48674 0.541748 2.77405V10.3574C0.541748 10.6447 0.655885 10.9203 0.859049 11.1234C1.06221 11.3266 1.33776 11.4407 1.62508 11.4407H9.20842C9.49573 11.4407 9.77128 11.3266 9.97445 11.1234C10.1776 10.9203 10.2917 10.6447 10.2917 10.3574V6.56572" stroke="#6B7280" strokeWidth="1.08333"/>
                  <path d="M9.47925 0.878213C9.69474 0.662724 9.987 0.541664 10.2917 0.541664C10.5965 0.541664 10.8888 0.662724 11.1042 0.878213C11.3197 1.0937 11.4408 1.38597 11.4408 1.69071C11.4408 1.99546 11.3197 2.28772 11.1042 2.50321L5.95841 7.64905L3.79175 8.19071L4.33341 6.02405L9.47925 0.878213Z" stroke="#6B7280" strokeWidth="1.08333"/>
                </svg>
              </div>
            </div>

            {/* 강아지 이름 */}
            <div className={styles.infoItem} onClick={() => setActiveEditField("dogName")}>
              <div className={styles.infoItemContent}>
                <div className={styles.infoLabelContainer}>
                  <div className={styles.infoLabel}>강아지 이름</div>
                </div>
                <div className={styles.infoValueContainer}>
                  <div className={styles.infoValue}>{data.dog.name}</div>
                </div>
              </div>
              <div className={styles.editIconWrapper}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.41675 1.69072H1.62508C1.33776 1.69072 1.06221 1.80486 0.859049 2.00802C0.655885 2.21118 0.541748 2.48674 0.541748 2.77405V10.3574C0.541748 10.6447 0.655885 10.9203 0.859049 11.1234C1.06221 11.3266 1.33776 11.4407 1.62508 11.4407H9.20842C9.49573 11.4407 9.77128 11.3266 9.97445 11.1234C10.1776 10.9203 10.2917 10.6447 10.2917 10.3574V6.56572" stroke="#6B7280" strokeWidth="1.08333"/>
                  <path d="M9.47925 0.878213C9.69474 0.662724 9.987 0.541664 10.2917 0.541664C10.5965 0.541664 10.8888 0.662724 11.1042 0.878213C11.3197 1.0937 11.4408 1.38597 11.4408 1.69071C11.4408 1.99546 11.3197 2.28772 11.1042 2.50321L5.95841 7.64905L3.79175 8.19071L4.33341 6.02405L9.47925 0.878213Z" stroke="#6B7280" strokeWidth="1.08333"/>
                </svg>
              </div>
            </div>

            {/* 견종 */}
            <div className={styles.infoItem} onClick={() => setActiveEditField("dogBreed")}>
              <div className={styles.infoItemContent}>
                <div className={styles.infoLabelContainer}>
                  <div className={styles.infoLabel}>견종</div>
                </div>
                <div className={styles.infoValueContainer}>
                  <div className={styles.infoValue}>{data.dog.breed}</div>
                </div>
              </div>
              <div className={styles.editIconWrapper}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.41675 1.69072H1.62508C1.33776 1.69072 1.06221 1.80486 0.859049 2.00802C0.655885 2.21118 0.541748 2.48674 0.541748 2.77405V10.3574C0.541748 10.6447 0.655885 10.9203 0.859049 11.1234C1.06221 11.3266 1.33776 11.4407 1.62508 11.4407H9.20842C9.49573 11.4407 9.77128 11.3266 9.97445 11.1234C10.1776 10.9203 10.2917 10.6447 10.2917 10.3574V6.56572" stroke="#6B7280" strokeWidth="1.08333"/>
                  <path d="M9.47925 0.878213C9.69474 0.662724 9.987 0.541664 10.2917 0.541664C10.5965 0.541664 10.8888 0.662724 11.1042 0.878213C11.3197 1.0937 11.4408 1.38597 11.4408 1.69071C11.4408 1.99546 11.3197 2.28772 11.1042 2.50321L5.95841 7.64905L3.79175 8.19071L4.33341 6.02405L9.47925 0.878213Z" stroke="#6B7280" strokeWidth="1.08333"/>
                </svg>
              </div>
            </div>

            {/* 성향 */}
            <div className={styles.infoItem} onClick={() => setActiveEditField("dogPersonality")}>
              <div className={styles.infoItemContent}>
                <div className={styles.infoLabelContainer}>
                  <div className={styles.infoLabel}>성향</div>
                </div>
                <div className={styles.infoValueContainer}>
                  <div className={styles.infoValue}>
                    {getPersonalityText(data.dog.personality)}
                  </div>
                  {renderPersonalityBadge(data.dog.personality)}
                </div>
              </div>
              <div className={styles.editIconWrapper}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.41675 1.69072H1.62508C1.33776 1.69072 1.06221 1.80486 0.859049 2.00802C0.655885 2.21118 0.541748 2.48674 0.541748 2.77405V10.3574C0.541748 10.6447 0.655885 10.9203 0.859049 11.1234C1.06221 11.3266 1.33776 11.4407 1.62508 11.4407H9.20842C9.49573 11.4407 9.77128 11.3266 9.97445 11.1234C10.1776 10.9203 10.2917 10.6447 10.2917 10.3574V6.56572" stroke="#6B7280" strokeWidth="1.08333"/>
                  <path d="M9.47925 0.878213C9.69474 0.662724 9.987 0.541664 10.2917 0.541664C10.5965 0.541664 10.8888 0.662724 11.1042 0.878213C11.3197 1.0937 11.4408 1.38597 11.4408 1.69071C11.4408 1.99546 11.3197 2.28772 11.1042 2.50321L5.95841 7.64905L3.79175 8.19071L4.33341 6.02405L9.47925 0.878213Z" stroke="#6B7280" strokeWidth="1.08333"/>
                </svg>
              </div>
            </div>
          </div>

          {/* More Settings Section */}
          <div className={styles.sectionLabelRow}>
            <div className={styles.sectionLabel}>더보기</div>
          </div>

          <div className={styles.infoList}>
            {/* 알림설정 */}
            <div className={styles.moreItem} onClick={() => handleFeatureAlert("알림 설정")}>
              <div className={styles.moreLeft}>
                <div className={styles.moreEmoji}>🔔</div>
                <div className={styles.moreTitle}>알림 설정</div>
              </div>
              <div className={styles.arrowBox}>
                <div className={styles.arrowInner} />
              </div>
            </div>

            {/* 개인정보 처리방침 */}
            <div className={styles.moreItem} onClick={() => handleFeatureAlert("개인정보 처리방침")}>
              <div className={styles.moreLeft}>
                <div className={styles.moreEmoji}>📄</div>
                <div className={styles.moreTitle}>개인정보 처리방침</div>
              </div>
              <div className={styles.arrowBox}>
                <div className={styles.arrowInner} />
              </div>
            </div>

            {/* 이용약관 */}
            <div className={styles.moreItem} onClick={() => handleFeatureAlert("이용약관")}>
              <div className={styles.moreLeft}>
                <div className={styles.moreEmoji}>📋</div>
                <div className={styles.moreTitle}>이용약관</div>
              </div>
              <div className={styles.arrowBox}>
                <div className={styles.arrowInner} />
              </div>
            </div>

            {/* 앱 버전 */}
            <div className={styles.moreItem}>
              <div className={styles.moreLeft}>
                <div className={styles.moreEmoji}>📱</div>
                <div className={styles.moreTitle}>앱 버전</div>
              </div>
              <div className={styles.versionText}>v1.2.0</div>
            </div>
          </div>

          {/* Footer Account Management links */}
          <div className={styles.logoutWrapper}>
            <div className={styles.logoutContainer} onClick={handleLogout}>
              <button type="button" className={styles.logoutText}>
                로그아웃
              </button>
            </div>
          </div>

          <div className={styles.withdrawWrapper}>
            <div className={styles.withdrawLinkContainer} onClick={handleWithdraw}>
              <button type="button" className={styles.withdrawLink}>
                회원탈퇴
              </button>
            </div>
          </div>

          <FooterBar activeTab="mypage" onFeatureAlert={handleFeatureAlert} />
        </div>

        {/* Edit Profile Modal Dialog */}
        {activeEditField === "profile" && (
          <div 
            className={styles.modalBackdrop}
            onClick={handleCloseModal}
          >
            <div 
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.bottomSheetHandle} />
              
              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleFileChange}
              />

              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>프로필 수정</span>
                <button 
                  type="button" 
                  className={styles.modalCloseBtn}
                  onClick={handleCloseModal}
                >
                  닫기
                </button>
              </div>

              {/* Avatar upload in Modal */}
              <div className={styles.modalAvatarContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={editDogPhoto || "/dangsquare_mascot_official.png"} 
                  alt="Edit Profile Avatar" 
                  className={styles.modalAvatar}
                  onClick={() => fileInputRef.current?.click()}
                />
                <span className={styles.changePhotoText} onClick={() => fileInputRef.current?.click()}>
                  사진 변경
                </span>
              </div>

              {/* Owner Name */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>견주 이름</label>
                <input 
                  type="text" 
                  className={styles.formInput}
                  value={editOwnerName}
                  onChange={(e) => setEditOwnerName(e.target.value)}
                  placeholder="견주 이름 입력"
                />
              </div>

              {/* Owner Gender */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>견주 성별</label>
                <div className={styles.genderSelector}>
                  <button
                    type="button"
                    className={`${styles.genderOption} ${editOwnerGender === "male" ? styles.genderOptionActive : ""}`}
                    onClick={() => setEditOwnerGender("male")}
                  >
                    남성
                  </button>
                  <button
                    type="button"
                    className={`${styles.genderOption} ${editOwnerGender === "female" ? styles.genderOptionActive : ""}`}
                    onClick={() => setEditOwnerGender("female")}
                  >
                    여성
                  </button>
                </div>
              </div>

              {/* Dog Name */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>강아지 이름</label>
                <input 
                  type="text" 
                  className={styles.formInput}
                  value={editDogName}
                  onChange={(e) => setEditDogName(e.target.value)}
                  placeholder="강아지 이름 입력"
                />
              </div>

              {/* Dog Breed */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>견종</label>
                <select 
                  className={styles.formSelect}
                  value={editDogBreed}
                  onChange={(e) => setEditDogBreed(e.target.value)}
                >
                  {BREED_LIST.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Dog Personality */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>강아지 성향</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                  <div 
                    className={`${styles.personalityCard} ${editDogPersonality === "active" ? styles.personalityCardActive : ""}`}
                    onClick={() => setEditDogPersonality("active")}
                  >
                    <div className={styles.radioCircle}>
                      <div className={styles.radioDot} />
                    </div>
                    <div className={styles.cardEmoji}>🔥</div>
                    <div className={styles.cardTextContainer}>
                      <span className={styles.cardTitle}>친근하고 활발해요</span>
                      <span className={styles.cardSubtitle}>낯선 친구도 금방 사귀어요</span>
                    </div>
                  </div>

                  <div 
                    className={`${styles.personalityCard} ${editDogPersonality === "warm" ? styles.personalityCardActive : ""}`}
                    onClick={() => setEditDogPersonality("warm")}
                  >
                    <div className={styles.radioCircle}>
                      <div className={styles.radioDot} />
                    </div>
                    <div className={styles.cardEmoji}>☀️</div>
                    <div className={styles.cardTextContainer}>
                      <span className={styles.cardTitle}>따뜻하고 온순해요</span>
                      <span className={styles.cardSubtitle}>차분하고 예의 바른 편이에요</span>
                    </div>
                  </div>

                  <div 
                    className={`${styles.personalityCard} ${editDogPersonality === "shy" ? styles.personalityCardActive : ""}`}
                    onClick={() => setEditDogPersonality("shy")}
                  >
                    <div className={styles.radioCircle}>
                      <div className={styles.radioDot} />
                    </div>
                    <div className={styles.cardEmoji}>☁️</div>
                    <div className={styles.cardTextContainer}>
                      <span className={styles.cardTitle}>낮을 많이 가려요</span>
                      <span className={styles.cardSubtitle}>친해지면 엄청 다정해져요</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ marginTop: "12px" }}>
                <button 
                  type="button" 
                  onClick={handleSaveProfile}
                  className={styles.modalCloseBtn}
                  style={{ 
                    width: "100%", 
                    height: "50px", 
                    backgroundColor: "#0e7060", 
                    color: "#ffffff", 
                    borderRadius: "25px",
                    fontWeight: 700,
                    fontSize: "15px",
                    border: "none"
                  }}
                >
                  수정 완료
                </button>
              </div>

            </div>
          </div>
        )}

        {/* 개별 필드 수정 모달 */}
        {activeEditField && activeEditField !== "profile" && (
          <div 
            className={styles.modalBackdrop}
            onClick={handleCloseModal}
          >
            <div 
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.bottomSheetHandle} />
              
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>
                  {activeEditField === "ownerName" && "이름 수정"}
                  {activeEditField === "ownerGender" && "성별 수정"}
                  {activeEditField === "dogName" && "강아지 이름 수정"}
                  {activeEditField === "dogBreed" && "견종 수정"}
                  {activeEditField === "dogPersonality" && "성향 수정"}
                </span>
                <button 
                  type="button" 
                  className={styles.modalCloseBtn}
                  onClick={handleCloseModal}
                >
                  닫기
                </button>
              </div>

              {activeEditField === "ownerName" && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>견주 이름</label>
                    <input 
                      type="text" 
                      className={styles.formInput}
                      value={editOwnerName}
                      onChange={(e) => setEditOwnerName(e.target.value)}
                      placeholder="견주 이름 입력"
                    />
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <button 
                      type="button" 
                      onClick={() => handleSaveField("ownerName")}
                      className={styles.submitBtn}
                    >
                      변경
                    </button>
                  </div>
                </>
              )}

              {activeEditField === "ownerGender" && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>견주 성별</label>
                    <div className={styles.genderSelector}>
                      <button
                        type="button"
                        className={`${styles.genderOption} ${editOwnerGender === "male" ? styles.genderOptionActive : ""}`}
                        onClick={() => setEditOwnerGender("male")}
                      >
                        남성
                      </button>
                      <button
                        type="button"
                        className={`${styles.genderOption} ${editOwnerGender === "female" ? styles.genderOptionActive : ""}`}
                        onClick={() => setEditOwnerGender("female")}
                      >
                        여성
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <button 
                      type="button" 
                      onClick={() => handleSaveField("ownerGender")}
                      className={styles.submitBtn}
                    >
                      변경
                    </button>
                  </div>
                </>
              )}

              {activeEditField === "dogName" && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>강아지 이름</label>
                    <input 
                      type="text" 
                      className={styles.formInput}
                      value={editDogName}
                      onChange={(e) => setEditDogName(e.target.value)}
                      placeholder="강아지 이름 입력"
                    />
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <button 
                      type="button" 
                      onClick={() => handleSaveField("dogName")}
                      className={styles.submitBtn}
                    >
                      변경
                    </button>
                  </div>
                </>
              )}

              {activeEditField === "dogBreed" && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>견종</label>
                    <select 
                      className={styles.formSelect}
                      value={editDogBreed}
                      onChange={(e) => setEditDogBreed(e.target.value)}
                    >
                      {BREED_LIST.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <button 
                      type="button" 
                      onClick={() => handleSaveField("dogBreed")}
                      className={styles.submitBtn}
                    >
                      변경
                    </button>
                  </div>
                </>
              )}

              {activeEditField === "dogPersonality" && (
                <>
                  <div className={styles.formGroup} style={{ gap: "12px" }}>
                    <div 
                      className={`${styles.personalityCard} ${editDogPersonality === "active" ? styles.personalityCardActive : ""}`}
                      onClick={() => setEditDogPersonality("active")}
                    >
                      <div className={styles.radioCircle}>
                        <div className={styles.radioDot} />
                      </div>
                      <div className={styles.cardEmoji}>🔥</div>
                      <div className={styles.cardTextContainer}>
                        <span className={styles.cardTitle}>친근하고 활발해요</span>
                        <span className={styles.cardSubtitle}>낯선 친구도 금방 사귀어요</span>
                      </div>
                    </div>

                    <div 
                      className={`${styles.personalityCard} ${editDogPersonality === "warm" ? styles.personalityCardActive : ""}`}
                      onClick={() => setEditDogPersonality("warm")}
                    >
                      <div className={styles.radioCircle}>
                        <div className={styles.radioDot} />
                      </div>
                      <div className={styles.cardEmoji}>☀️</div>
                      <div className={styles.cardTextContainer}>
                        <span className={styles.cardTitle}>따뜻하고 온순해요</span>
                        <span className={styles.cardSubtitle}>차분하고 예의 바른 편이에요</span>
                      </div>
                    </div>

                    <div 
                      className={`${styles.personalityCard} ${editDogPersonality === "shy" ? styles.personalityCardActive : ""}`}
                      onClick={() => setEditDogPersonality("shy")}
                    >
                      <div className={styles.radioCircle}>
                        <div className={styles.radioDot} />
                      </div>
                      <div className={styles.cardEmoji}>☁️</div>
                      <div className={styles.cardTextContainer}>
                        <span className={styles.cardTitle}>낮을 많이 가려요</span>
                        <span className={styles.cardSubtitle}>친해지면 엄청 다정해져요</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "16px" }}>
                    <button 
                      type="button" 
                      onClick={() => handleSaveField("dogPersonality")}
                      className={styles.submitBtn}
                    >
                      변경
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 커스텀 알림 모달 (Alert Modal) */}
        {customAlert && (
          <div className={styles.alertBackdrop}>
            <div className={styles.alertCard}>
              {customAlert.type !== "success" && (
                <div className={styles.alertIcon}>
                  {customAlert.type === "warning" && "⚠️"}
                  {customAlert.type === "feature" && "🐶"}
                </div>
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

        {/* 커스텀 확인 모달 (Confirm Modal) */}
        {customConfirm && (
          <div className={styles.alertBackdrop}>
            <div className={styles.alertCard}>
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
