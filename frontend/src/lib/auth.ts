// 로컬에 JWT 토큰을 보관/조회하는 얇은 헬퍼.
// SSR 안전(typeof window 체크)하며, 로그아웃 시 토큰 + 온보딩 캐시까지 같이 비운다.
//
// Google OAuth2 흐름:
//  1) 사용자가 splash 의 "Google 로그인" → startGoogleLogin() → 백엔드 /oauth2/authorization/google 로 이동
//  2) Google 인증 → 백엔드가 콜백에서 JWT 발급 → 프론트로 ?token=...&onboarded=... 와 함께 리다이렉트
//  3) 진입 페이지(/, /onboarding)에서 consumeAuthFromQuery() 가 token 을 읽어 저장하고 URL 을 정리

const TOKEN_KEY = "dangsquare_access_token";
const USER_ID_KEY = "dangsquare_user_id";
const ONBOARDED_KEY = "dangsquare_onboarded";

// 클라이언트에서 백엔드 OAuth 진입점으로 곧장 이동해야 하므로 (CORS 가 아니라 브라우저 navigation),
// 백엔드 절대 URL 이 필요하다. dev 기본값은 http://localhost:8080.
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUserId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_ID_KEY);
  return raw ? Number(raw) : null;
}

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDED_KEY) === "true";
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export function setAuth(token: string, userId: number, onboarded: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, String(userId));
  localStorage.setItem(ONBOARDED_KEY, String(onboarded));
}

export function setOnboarded(value: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDED_KEY, String(value));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(ONBOARDED_KEY);
  // 기존 mock 기반 온보딩 캐시도 함께 비움 (마이그레이션 안전망).
  localStorage.removeItem("dangsquare_onboarding_completed");
  localStorage.removeItem("dangsquare_onboarding_data");
}

/** splash 의 "Google 로그인" 버튼이 호출. 브라우저를 백엔드 OAuth 진입점으로 이동시킨다. */
export function startGoogleLogin(): void {
  if (typeof window === "undefined") return;
  window.location.href = `${BACKEND_URL}/oauth2/authorization/google`;
}

/**
 * OAuth2 콜백으로 돌아왔을 때 호출. URL ?token=...&onboarded=... 가 있으면 저장하고
 * 보안을 위해 token 쿼리를 URL 에서 제거한다. 반환값으로 onboarded 여부를 알려준다.
 */
export function consumeAuthFromQuery(): { saved: boolean; onboarded: boolean } {
  if (typeof window === "undefined") return { saved: false, onboarded: false };
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (!token) return { saved: false, onboarded: isOnboarded() };

  const onboardedParam = params.get("onboarded") === "true";
  // 백엔드는 userId 를 토큰 subject 에만 담고 쿼리로 노출하지 않는다.
  // 토큰 디코딩으로 userId 를 빼내 보관해두면 디버깅에 유용.
  const userId = decodeUserIdFromJwt(token) ?? 0;

  setAuth(token, userId, onboardedParam);

  // token/onboarded 쿼리만 정리 (기타 쿼리는 보존).
  params.delete("token");
  params.delete("onboarded");
  const cleaned = params.toString();
  const newUrl = window.location.pathname + (cleaned ? `?${cleaned}` : "") + window.location.hash;
  window.history.replaceState({}, "", newUrl);

  return { saved: true, onboarded: onboardedParam };
}

function decodeUserIdFromJwt(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    // URL-safe base64 → 표준 base64
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as { sub?: string };
    if (!json.sub) return null;
    const n = Number(json.sub);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
