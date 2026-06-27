export type Comment = {
  id: number;
  userName: string;
  userAvatar: string;
  userAvatarBg: string;
  text: string;
  timeText: string;
};

export type CommunityPost = {
  id: number;
  type: "boast" | "info"; // "boast" = 댕자랑, "info" = 동네 댕정보
  category?: "동네소통" | "추천해요" | "에코라이프"; // info 전용 카테고리
  userName: string;
  userAvatar: string;
  userAvatarBg: string;
  location: string;
  timeText: string;
  isFollowing: boolean;
  image?: string; // boast는 필수, info는 선택
  likes: number;
  commentsCount: number;
  views: number;
  title?: string; // info 전용 타이틀
  description: string;
  hashtags?: string[]; // boast 전용 해시태그
  productTag?: {
    x: number; // 좌측 오프셋 %
    y: number; // 상단 오프셋 %
    productId: number; // ShopItem ID
    productName: string;
  };
  infoFields?: { // info 전용 필드 (예: 추천해요 상세박스)
    label: string;
    value: string;
  }[];
  commentsList: Comment[];
  
  // 핫게시판 전용 속성 (옵션)
  hotIcon?: string;
  hotIconBg?: string;
  hotCategoryText?: string;
};

const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 1,
    type: "boast",
    userName: "초코맘",
    userAvatar: "초",
    userAvatarBg: "#FBBF24", // yellow
    location: "마포구 합정동",
    timeText: "23분 전",
    isFollowing: false,
    image: "/community_corgi.png",
    likes: 247,
    commentsCount: 38,
    views: 1240,
    description: "오늘도 초코와 함께 에코 산책 다녀왔어요 🌿 자연 속에서 힐링하는 시간이 너무 좋아요. 사진에 초록 태그 눌러보세요!",
    hashtags: ["에코라이프", "강아지산책", "천연샴푸", "댕자랑"],
    productTag: {
      x: 35,
      y: 55,
      productId: 2,
      productName: "유기농 천연 강아지 샴푸"
    },
    commentsList: [
      { id: 1, userName: "루디아빠", userAvatar: "루", userAvatarBg: "#60A5FA", text: "초코 너무 귀엽네요! 역에서 사진 찍은 포즈가 프로급이에요 👍", timeText: "15분 전" },
      { id: 2, userName: "댕댕이러버", userAvatar: "댕", userAvatarBg: "#F87171", text: "저 태그에 있는 샴푸 저희도 쓰는데 향이 정말 에코에코해요!", timeText: "8분 전" }
    ]
  },
  {
    id: 2,
    type: "boast",
    userName: "시바형제네",
    userAvatar: "시",
    userAvatarBg: "#A7F3D0", // green
    location: "용산구 이태원동",
    timeText: "어제",
    isFollowing: false,
    image: "/community_shiba.png",
    likes: 4820,
    commentsCount: 387,
    views: 12840,
    description: "한강에서 시바견 두 마리가 에코 피크닉 하는 모습 ㅠㅠ 심장 녹았어요. 날씨가 너무 좋아서 돗자리 펴고 댕댕이들과 힐링하고 왔네요! 🐾",
    hashtags: ["에코피크닉", "시바견", "한강공원", "댕자랑"],
    productTag: {
      x: 60,
      y: 40,
      productId: 3,
      productName: "재활용 소재 강아지 하네스"
    },
    commentsList: [
      { id: 1, userName: "코코맘", userAvatar: "코", userAvatarBg: "#F87171", text: "뒷태가 너무 심쿵이네요 ㅠㅠ 몽글몽글 꼬리 만지고 싶어요!", timeText: "30분 전" }
    ],
    hotIcon: "🔥",
    hotIconBg: "#FFF3F2",
    hotCategoryText: "에코 댕자랑"
  },
  {
    id: 7,
    type: "info",
    category: "동네소통",
    userName: "에코베이킹맘",
    userAvatar: "에",
    userAvatarBg: "#FBBF24", // yellow
    location: "마포구 망원동",
    timeText: "2일 전",
    isFollowing: false,
    title: "제가 직접 만든 천연 강아지 간식 레시피 공유합니다 (재료비 2천원)",
    description: "밀가루나 인공 첨가물 없이 고구마와 단호박, 쌀가루만 사용해서 만드는 건강한 댕댕이 쿠키 레시피입니다. 집에 오븐이나 에어프라이어가 있다면 15분 만에 뚝딱 만들 수 있어요! 방부제 없는 건강 영양 간식 구워봐요 🍪",
    likes: 2190,
    commentsCount: 214,
    views: 8640,
    commentsList: [
      { id: 1, userName: "루키엄마", userAvatar: "루", userAvatarBg: "#60A5FA", text: "우와! 집에서 한번 만들어볼게요! 상세 레시피 너무 감사드립니다.", timeText: "1일 전" }
    ],
    hotIcon: "🏆",
    hotIconBg: "#FFFDF0",
    hotCategoryText: "동네 댕정보"
  },
  {
    id: 8,
    type: "info",
    category: "에코라이프",
    userName: "제로웨이스트맘",
    userAvatar: "제",
    userAvatarBg: "#60A5FA", // blue
    location: "서대문구 연희동",
    timeText: "3일 전",
    isFollowing: false,
    title: "강아지와 함께하는 제로웨이스트 라이프 1년 후기 (사진 많음)",
    description: "배변봉투 생분해 멀티백 사용, 일회용 펫타올 대신 유기농 순면 타올 사용, 샴푸바 사용 등 지난 1년간 저희 집 강아지와 실천해온 에코라이프 후기입니다. 작은 변화이지만 플라스틱 배출량이 정말 절반으로 줄었어요!",
    image: "/community_bridge.png",
    likes: 1480,
    commentsCount: 156,
    views: 6240,
    commentsList: [
      { id: 1, userName: "에코독", userAvatar: "에", userAvatarBg: "#A7F3D0", text: "저도 순면 타올로 바꿨는데 훨씬 친환경적이고 만족스럽더라고요!", timeText: "2일 전" }
    ],
    hotIcon: "✨",
    hotIconBg: "#EFF6FF",
    hotCategoryText: "에코라이프"
  },
  {
    id: 9,
    type: "info",
    category: "동네소통",
    userName: "산책왕댕댕",
    userAvatar: "산",
    userAvatarBg: "#F87171", // red
    location: "강남구 논현동",
    timeText: "4일 전",
    isFollowing: false,
    title: "강남 산책로 BEST 5 직접 다 가봤어요 (지도포함)",
    description: "강남구 논현동, 청담동, 삼성동 부근에서 저희 댕댕이와 매일 돌며 검증한 최적의 산책로 5곳입니다. 댕댕이 물통 챙겨서 가기 좋고, 강아지 쉼터나 쓰레기통이 잘 구비된 곳 위주로 선정했습니다. 주말에 꼭 가보세요!",
    likes: 980,
    commentsCount: 89,
    views: 5120,
    commentsList: [
      { id: 1, userName: "논현견주", userAvatar: "논", userAvatarBg: "#FBBF24", text: "오! 3번 산책로는 저희도 자주 가는데 정말 한적하고 좋습니다.", timeText: "3일 전" }
    ],
    hotIcon: "📌",
    hotIconBg: "#FFF5F5",
    hotCategoryText: "동네 댕정보"
  },
  {
    id: 3,
    type: "info",
    category: "추천해요",
    userName: "강동구멍멍이",
    userAvatar: "강",
    userAvatarBg: "#A7F3D0",
    location: "동작구 흑석동",
    timeText: "2시간 전",
    isFollowing: false,
    title: "흑석동 근처 동물병원 강추합니다 (비용 공개)",
    description: "지난주에 제 강아지 초코가 피부가 좋지 않아서 여러 곳을 알아봤는데, 이번에 처음 간 '동물과사람' 병원이 정말 만족스러웠어요. 원장님이 꼼꼼하게 봐주시고 피부 상태 원인도 자세히 설명해주셨어요. 천연 성분 샴푸 처방도 해주셔서 에코라이프랑도 딱 맞아요!",
    infoFields: [
      { label: "위치", value: "동작구 흑석동 (흑석역 2번 출구 도보 3분)" },
      { label: "진찰비", value: "초진 30,000원 / 재진 15,000원" },
      { label: "운영시간", value: "평일 10:00 - 19:00 / 토 10:00 - 15:00" },
      { label: "예약", value: "네이버 예약 가능 (당일 예약도 OK)" }
    ],
    image: "/shop_dog_shampoo.png",
    likes: 142,
    commentsCount: 28,
    views: 412,
    commentsList: [
      { id: 1, userName: "초코미소", userAvatar: "초", userAvatarBg: "#FBBF24", text: "동물과사람 병원 과잉 진료 없어서 진짜 괜찮죠! 정보 감사합니다.", timeText: "1시간 전" },
      { id: 2, userName: "관악멍짱", userAvatar: "관", userAvatarBg: "#60A5FA", text: "진찰비가 엄청 구체적이네요 ㅎㅎ 다음에 저희 애도 피부 트러블 나면 가볼게요.", timeText: "40분 전" }
    ]
  },
  {
    id: 4,
    type: "info",
    category: "동네소통",
    userName: "초코맘",
    userAvatar: "초",
    userAvatarBg: "#FBBF24",
    location: "마포구 합정동",
    timeText: "3시간 전",
    isFollowing: false,
    title: "한강공원 반려견 입장 규정 변경됐나요?",
    description: "오늘 한강 가려고 했는데 친구한테 규정이 바뀌었다는 말을 들어서요. 최근에 가보신 분 계시면 알려주세요!",
    likes: 89,
    commentsCount: 45,
    views: 231,
    commentsList: [
      { id: 1, userName: "합정달인", userAvatar: "합", userAvatarBg: "#60A5FA", text: "목줄 착용 길이나 배설물 처리에 대한 단속이 좀 더 강해졌을 뿐 크게 바뀐 건 없는 걸로 압니다!", timeText: "2시간 전" }
    ]
  },
  {
    id: 5,
    type: "info",
    category: "에코라이프",
    userName: "연희동주민",
    userAvatar: "연",
    userAvatarBg: "#F87171",
    location: "서대문구 연희동",
    timeText: "5시간 전",
    isFollowing: false,
    title: "에코 강아지 식기 어디서 구매하셨어요?",
    description: "NZ마켓 말고도 오프라인 매장에서 파는 곳이 있는지 궁금해서요. 스테인리스 소재로 찾고 있는데 좋은 곳 추천해주시면 감사하겠습니다!",
    image: "/shop_bamboo_bowl.png",
    likes: 67,
    commentsCount: 19,
    views: 184,
    commentsList: [
      { id: 1, userName: "초록발바닥", userAvatar: "초", userAvatarBg: "#A7F3D0", text: "홍대 쪽에 비건/제로웨이스트 편집샵에 가시면 반려견 친환경 식기도 입점해 있더라고요!", timeText: "4시간 전" }
    ]
  },
  {
    id: 6,
    type: "info",
    category: "동네소통",
    userName: "포메사랑",
    userAvatar: "포",
    userAvatarBg: "#A7F3D0",
    location: "노원구 월계동",
    timeText: "6시간 전",
    isFollowing: false,
    title: "강아지 유치원 후기 공유해요 (월 비용 포함)",
    description: "저희 포메 하루 종일 혼자 있어서 유치원 등록했는데 생각보다 잘 적응하더라고요. 가격 비교 많이 했는데 시설도 깔끔하고 무엇보다 선생님들이 너무 친절하십니다.",
    likes: 54,
    commentsCount: 12,
    views: 104,
    commentsList: [
      { id: 1, userName: "월계러버", userAvatar: "월", userAvatarBg: "#FBBF24", text: "혹시 월 비용 여쭤봐도 될까요? 쪽지나 비밀글 기능이 없어 아쉽네요 ㅎㅎ", timeText: "5시간 전" }
    ]
  }
];

const STORAGE_KEY = "dangsquare_community_posts_v3"; // 강제 리셋을 위해 v3로 업그레이드

export const getCommunityPosts = (): CommunityPost[] => {
  if (typeof window === "undefined") return INITIAL_COMMUNITY_POSTS;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_COMMUNITY_POSTS));
    return INITIAL_COMMUNITY_POSTS;
  }
  
  try {
    return JSON.parse(stored) as CommunityPost[];
  } catch (e) {
    console.error("Failed to parse community posts", e);
    return INITIAL_COMMUNITY_POSTS;
  }
};

export const saveCommunityPosts = (posts: CommunityPost[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }
};

export const getCommunityPostById = (id: number): CommunityPost | undefined => {
  const posts = getCommunityPosts();
  return posts.find(post => post.id === id);
};

export const addCommunityPost = (post: Omit<CommunityPost, "id" | "likes" | "commentsCount" | "views" | "timeText" | "isFollowing" | "commentsList">): CommunityPost => {
  const posts = getCommunityPosts();
  
  const newPost: CommunityPost = {
    ...post,
    id: posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1,
    likes: 0,
    commentsCount: 0,
    views: 0,
    timeText: "방금 전",
    isFollowing: false,
    commentsList: []
  };
  
  const updated = [newPost, ...posts];
  saveCommunityPosts(updated);
  return newPost;
};

export const updateCommunityPost = (updatedPost: CommunityPost) => {
  const posts = getCommunityPosts();
  const index = posts.findIndex(post => post.id === updatedPost.id);
  if (index !== -1) {
    posts[index] = updatedPost;
    saveCommunityPosts(posts);
  }
};
