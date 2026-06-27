"use client";

import { useRouter } from "next/navigation";
import styles from "./FooterBar.module.css";

type FooterBarProps = {
  activeTab: "matching" | "market" | "community" | "mypage";
  onFeatureAlert?: (featureName: string) => void;
};

export default function FooterBar({ activeTab, onFeatureAlert }: FooterBarProps) {
  const router = useRouter();

  const handleTabClick = (tab: "matching" | "market" | "community" | "mypage") => {
    if (tab === activeTab) return;

    if (tab === "matching") {
      router.push("/");
    } else if (tab === "mypage") {
      router.push("/mypage");
    } else if (tab === "market") {
      router.push("/market");
    } else if (tab === "community") {
      router.push("/community");
    }
  };

  return (
    <footer className={styles.footer}>
      {/* 산책 매칭 탭 */}
      <button
        type="button"
        className={`${styles.tabItem} ${activeTab === "matching" ? styles.tabItemActive : ""}`}
        onClick={() => handleTabClick("matching")}
      >
        <div className={styles.iconWrapper}>
          {/* 강아지 발바닥 SVG */}
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <circle cx="8" cy="7" r="2.2" />
            <circle cx="12" cy="5.2" r="2.2" />
            <circle cx="16" cy="7" r="2.2" />
            <path d="M12 10.5c-2.4 0-4.3 1.8-4.3 4.2 0 1.3.6 2.5 1.6 3.2v.3c0 1.2.9 2.1 2.1 2.1s2.1-.9 2.1-2.1v-.3c1-.7 1.6-1.9 1.6-3.2 0-2.4-1.9-4.2-4.5-4.2z" />
          </svg>
        </div>
        <span className={styles.tabLabel}>산책 매칭</span>
      </button>

      {/* NZ마켓 탭 */}
      <button
        type="button"
        className={`${styles.tabItem} ${activeTab === "market" ? styles.tabItemActive : ""}`}
        onClick={() => handleTabClick("market")}
      >
        <div className={styles.iconWrapper}>
          {/* 쇼핑백 SVG */}
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <span className={styles.tabLabel}>NZ마켓</span>
      </button>

      {/* 커뮤니티 탭 */}
      <button
        type="button"
        className={`${styles.tabItem} ${activeTab === "community" ? styles.tabItemActive : ""}`}
        onClick={() => handleTabClick("community")}
      >
        <div className={styles.iconWrapper}>
          {/* 더블 프로필 SVG */}
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <span className={styles.tabLabel}>커뮤니티</span>
      </button>

      {/* 마이페이지 탭 */}
      <button
        type="button"
        className={`${styles.tabItem} ${activeTab === "mypage" ? styles.tabItemActive : ""}`}
        onClick={() => handleTabClick("mypage")}
      >
        <div className={styles.iconWrapper}>
          {/* 싱글 프로필 SVG */}
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <span className={styles.tabLabel}>마이페이지</span>
      </button>
    </footer>
  );
}
