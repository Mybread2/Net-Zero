export interface WalkUser {
  id: string;
  name: string;
  distance: number; // m 단위
  status: "possible" | "resting" | "impossible"; // 산책 가능, 휴식 중, 불가능
  lastActive: string; // '방금 전', '3분 전' 등
  dog: {
    name: string;
    breed: string;
    personality: "active" | "warm" | "shy";
    photo: string;
  };
  statusMessage: string;
  coords: { lat: number; lng: number };
  recentWalks: Array<{
    date: string;
    duration: number; // 분
    distance: number; // km
    partner: string;
  }>;
}

// 사용자 위치(lat, lng)를 기준으로 정확한 m(미터) 변위를 주어 가상의 좌표를 구하는 헬퍼
function getOffsetCoords(baseLat: number, baseLng: number, dx: number, dy: number) {
  const R = 6378137; // 지구 반지름 (m)
  const dLat = dy / R;
  const dLng = dx / (R * Math.cos((baseLat * Math.PI) / 180));
  return {
    lat: baseLat + dLat * (180 / Math.PI),
    lng: baseLng + dLng * (180 / Math.PI),
  };
}

export function getMockWalkUsers(baseLat: number, baseLng: number): WalkUser[] {
  return [
    {
      id: "owner_junsik",
      name: "임준식",
      distance: 11,
      status: "possible",
      lastActive: "방금 전",
      dog: {
        name: "콩이",
        breed: "똥강아지",
        personality: "active",
        photo: "/market_elephant_dog.png", // 코끼리 문 강아지 이미지
      },
      statusMessage: "🐾 오늘 오후에 한강 근처에서 산책 예정이에요! 함께 걸실 분 환영합니다 :)",
      // 11m 거리: 대략 동쪽 7.7m, 북쪽 7.7m (피타고라스 11m)
      coords: getOffsetCoords(baseLat, baseLng, 7.7, 7.7),
      recentWalks: [
        { date: "2025년 6월 24일", duration: 45, distance: 2.3, partner: "민준 (콩이)" },
        { date: "2025년 6월 21일", duration: 30, distance: 1.8, partner: "현우 (뽀삐)" },
        { date: "2025년 6월 18일", duration: 60, distance: 3.1, partner: "지우 (초코)" },
      ],
    },
    {
      id: "owner_minjun",
      name: "박민준",
      distance: 42,
      status: "possible",
      lastActive: "3분 전",
      dog: {
        name: "콩이",
        breed: "골든레트리버",
        personality: "warm",
        photo: "/community_corgi.png",
      },
      statusMessage: "날씨가 너무 좋네요! 콩이랑 신나게 뛰노는 중 ☀️",
      // 42m 거리: 대략 서쪽 -30m, 북쪽 30m
      coords: getOffsetCoords(baseLat, baseLng, -30, 30),
      recentWalks: [
        { date: "2025년 6월 23일", duration: 50, distance: 2.5, partner: "준식 (콩이)" },
        { date: "2025년 6월 20일", duration: 40, distance: 2.0, partner: "태양 (뭉치)" },
      ],
    },
    {
      id: "owner_hyeonwoo",
      name: "이현우",
      distance: 89,
      status: "resting",
      lastActive: "8분 전",
      dog: {
        name: "뽀삐",
        breed: "푸들",
        personality: "shy",
        photo: "/dangsquare_mascot_official.png",
      },
      statusMessage: "잠시 공원 벤치에서 쉬고 있어요. 뽀삐가 물 마시는 중 🥤",
      // 89m 거리: 대략 남쪽 -60m, 서쪽 -65m
      coords: getOffsetCoords(baseLat, baseLng, -65, -60),
      recentWalks: [
        { date: "2025년 6월 21일", duration: 30, distance: 1.8, partner: "준식 (콩이)" },
      ],
    },
    {
      id: "owner_jiwoo",
      name: "김지우",
      distance: 134,
      status: "possible",
      lastActive: "12분 전",
      dog: {
        name: "초코",
        breed: "비숑 프리제",
        personality: "warm",
        photo: "/community_shiba.png", // 시바 또는 비숑 대용으로 사용
      },
      statusMessage: "초코랑 함께 천천히 산책길 돌고 있습니다. 인사 나눠요 🐾",
      // 134m 거리: 대략 동쪽 90m, 남쪽 -100m
      coords: getOffsetCoords(baseLat, baseLng, 90, -100),
      recentWalks: [
        { date: "2025년 6월 18일", duration: 60, distance: 3.1, partner: "준식 (콩이)" },
      ],
    },
    {
      id: "owner_yejin",
      name: "정예진",
      distance: 218,
      status: "resting",
      lastActive: "18분 전",
      dog: {
        name: "복이",
        breed: "시바 이누",
        personality: "active",
        photo: "/shop_dog_harness.png",
      },
      statusMessage: "복이 에너지가 오늘 넘치네요! 같이 뛰실 분 찾아요 🏃‍♂️",
      // 218m 거리: 북쪽 180m, 동쪽 120m
      coords: getOffsetCoords(baseLat, baseLng, 120, 180),
      recentWalks: [],
    },
    {
      id: "owner_taeyang",
      name: "태양",
      distance: 342,
      status: "possible",
      lastActive: "25분 전",
      dog: {
        name: "뭉치",
        breed: "말티즈",
        personality: "warm",
        photo: "/shop_dog_treat.png",
      },
      statusMessage: "오늘도 평화로운 산책! 즐겁게 걷고 있어요.",
      // 342m 거리: 남쪽 -240m, 동쪽 240m
      coords: getOffsetCoords(baseLat, baseLng, 240, -240),
      recentWalks: [
        { date: "2025년 6월 20일", duration: 40, distance: 2.0, partner: "민준 (콩이)" },
      ],
    },
  ];
}
