// 브라우저(클라이언트 컴포넌트)에서 호출하는 API 클라이언트.
// 요청은 상대경로 /api/* 로 나가고, next.config.ts 의 rewrites 가
// 백엔드(기본 http://localhost:8080)로 프록시한다 → 개발 중 CORS 불필요.
//
// 백엔드 공통 응답 래퍼:
//   { "status": "success"|"error", "data": T, "message": string|null, "code"?: string }
//   페이징: data = { content, page, size, totalElements, totalPages, hasNext }
// 이 모듈은 `data`만 꺼내 반환하고, 실패 시 ApiError 를 throw 한다.

import { getToken, clearAuth } from "./auth";

export type ApiEnvelope<T> = {
  status: "success" | "error";
  data: T | null;
  message: string | null;
  code?: string;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  // 인증 토큰을 자동으로 붙일지(기본 true). 로그인/회원가입처럼 토큰이 없는 경로는 false.
  auth?: boolean;
  // multipart/form-data 등 직접 본문을 다룰 때 JSON 직렬화를 끄고 싶으면 true.
  rawBody?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, rawBody = false, body, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  if (auth) {
    const token = getToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  let finalBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (rawBody) {
      finalBody = body as BodyInit;
    } else {
      finalHeaders.set("Content-Type", "application/json");
      finalBody = JSON.stringify(body);
    }
  }

  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  });

  // 204 등 본문 없는 응답은 빈 객체로.
  const text = await res.text();
  const envelope: ApiEnvelope<T> | null = text ? safeParse(text) : null;

  if (!res.ok || (envelope && envelope.status === "error")) {
    const message = envelope?.message ?? `요청 실패 (${res.status})`;
    const code = envelope?.code ?? null;
    if (res.status === 401) clearAuth();
    throw new ApiError(message, res.status, code);
  }

  return (envelope?.data ?? (null as unknown)) as T;
}

function safeParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ===== 도메인별 호출 =====

// 헬스체크
export const healthApi = {
  check: () => request<{ status: string; service: string; time: string }>("/health", { auth: false }),
};

// 사용자/온보딩/위치
export type Gender = "MALE" | "FEMALE";
export type DogTemperament = "ACTIVE" | "CALM" | "FRIENDLY" | "SHY" | "INDEPENDENT" | "ETC";

export type DogDto = {
  id?: number;
  name: string;
  gender: Gender;
  breed: string;
  age?: number | null;
  temperament: DogTemperament;
  imageUrl?: string | null;
};

export type UserMeDto = {
  id: number;
  email: string;
  nickname: string | null;
  gender: Gender | null;
  hasDog: boolean;
  ghostMode: boolean;
  profileImageUrl: string | null;
  lastActiveAt: string | null;
  dogs: DogDto[];
};

export type UserUpdatePayload = {
  nickname: string;
  gender: Gender;
  hasDog: boolean;
  dog?: {
    name: string;
    gender: Gender;
    breed: string;
    age?: number;
    temperament: DogTemperament;
  } | null;
};

export const userApi = {
  me: () => request<UserMeDto>("/users/me"),
  update: (payload: UserUpdatePayload) =>
    request<UserMeDto>("/users/me", { method: "PATCH", body: payload }),
  updateLocation: (lat: number, lng: number) =>
    request<{ lat: number; lng: number; lastActiveAt: string }>("/users/me/location", {
      method: "PATCH",
      body: { lat, lng },
    }),
  setGhostMode: (enabled: boolean) =>
    request<{ ghostMode: boolean }>("/users/me/ghost-mode", {
      method: "PATCH",
      body: { enabled },
    }),
  profile: (id: number) => request<UserMeDto>(`/users/${id}`),
};

// 산책(walk)
export type NearbyUser = {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  lastActiveAt: string;
  distanceMeters: number;
  online: boolean;
};

export type MapUser = {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  lat: number;
  lng: number;
  online: boolean;
};

export const walkApi = {
  nearby: (radius = 2000) =>
    request<NearbyUser[]>(`/walk/nearby?radius=${radius}`),
  mapUsers: (radius = 2000) =>
    request<MapUser[]>(`/walk/map-users?radius=${radius}`),
};

// 중고거래(market)
export type TradeType = "SELL" | "BUY";
export type MarketCategory = "FOOD" | "TOY" | "DAILY" | "CLOTHING" | "ETC";
export type MarketItemStatus = "ON_SALE" | "SOLD";

export type MarketListItem = {
  itemId: number;
  tradeType: TradeType;
  title: string;
  price: number | null;
  thumbnailUrl: string | null;
  heartCount: number | null;
  createdAt: string | null;
  content: string | null;
  author: { userId: number; nickname: string; profileImageUrl: string | null } | null;
};

export type MarketDetail = {
  itemId: number;
  tradeType: TradeType;
  title: string;
  price: number | null;
  images: string[];
  heartCount: number;
  hearted: boolean;
  status: MarketItemStatus;
  content: string;
  createdAt: string;
  author: { userId: number; nickname: string; profileImageUrl: string | null };
};

export type MarketCreatePayload = {
  tradeType: TradeType;
  category: MarketCategory;
  title: string;
  content?: string;
  price?: number;
  imageUrls?: string[];
};

type MarketListQuery = {
  tradeType?: TradeType;
  category?: MarketCategory;
  status?: MarketItemStatus;
  page?: number;
  size?: number;
};

function toQuery(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
}

export const marketApi = {
  list: (query: MarketListQuery = {}) =>
    request<PageResponse<MarketListItem>>(`/market/items${toQuery(query)}`, { auth: false }),
  detail: (id: number) =>
    request<MarketDetail>(`/market/items/${id}`, { auth: false }),
  create: (payload: MarketCreatePayload) =>
    request<{ itemId: number }>("/market/items", { method: "POST", body: payload }),
  toggleHeart: (id: number) =>
    request<{ hearted: boolean; heartCount: number }>(`/market/items/${id}/heart`, { method: "POST" }),
};

// 저탄소 마켓플레이스
export type MarketplaceCategory = "FOOD" | "DAILY" | "ETC";

export type MarketplaceProduct = {
  productId: number;
  company: string;
  title: string;
  imageUrl: string | null;
  rating: number;
  ratingCount: number;
  price: number;
  lowCarbonSummary: string | null;
};

export const marketplaceApi = {
  list: (category?: MarketplaceCategory, page = 0, size = 20) =>
    request<PageResponse<MarketplaceProduct>>(
      `/marketplace/products${toQuery({ category, page, size })}`,
      { auth: false }
    ),
};

// 업로드(presign)
export const uploadApi = {
  presign: (fileName: string, contentType: string) =>
    request<{ uploadUrl: string; fileUrl: string; expiresInSeconds: number }>(
      "/uploads/presign",
      { method: "POST", body: { fileName, contentType } }
    ),
};
