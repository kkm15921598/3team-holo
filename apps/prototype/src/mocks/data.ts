// =============================================
// HOLO Mock 데이터
// 추후 Supabase 연결 시 packages/api 의 repos/* 로
// 동일 시그니처를 유지하며 교체 가능하도록 분리.
// =============================================

import type { FurnitureKey, RoomLayout } from '../components/IsoRoom';

export type User = {
  id: string;
  nickname: string;
  level: number;
  points: number;
  region: string;
  intro: string;
  tags: string[];
  characterEmoji: string;
  layout: RoomLayout;
  stats: { posts: number; comments: number; likesReceived: number; friends: number };
};

export type Recommendation = {
  id: string;
  title: string;
  desc: string;
  distance: string;
  duration: string;
  participants: string[]; // emoji
};

export type FurnitureItem = {
  id: string;
  key: FurnitureKey;
  name: string;
  category: '전체' | '침대' | '책상' | '의자' | '벽지' | '바닥' | '소품';
  price: number;
  isNew?: boolean;
  unlockLevel?: number; // 잠금 가구
  owned?: boolean;
};

export const mockUser: User = {
  id: 'u_001',
  nickname: '무지는 단무지',
  level: 24,
  points: 1264,
  region: '성남시 분당구',
  intro: '무지는 단무지',
  tags: ['#벌레_해결사', '#집밥_나눔왕'],
  characterEmoji: '🧑‍🦱',
  layout: {
    bed: 'bed-purple',
    desk: true,
    chair: true,
    lamp: true,
    plant: true,
    beanbag: true,
    frame: true,
  },
  stats: { posts: 24, comments: 12, likesReceived: 22, friends: 8 },
};

export const mockRecommendations: Recommendation[] = [
  {
    id: 'r1',
    title: '점심 번개',
    desc: '오피스 단지 떡볶이 메이트!',
    distance: '500m',
    duration: '20분',
    participants: ['👩', '👨', '🧒'],
  },
  {
    id: 'r2',
    title: '수박 소분',
    desc: '마트에서 산 큰 수박 나눌 분~',
    distance: '350m',
    duration: '15분',
    participants: ['👩', '👨', '👩‍🦰'],
  },
  {
    id: 'r3',
    title: '러닝 메이트',
    desc: '저녁 7시 한강에서 같이 뛰실 분',
    distance: '800m',
    duration: '30분',
    participants: ['🏃', '🏃‍♀️'],
  },
];

export const mockFurniture: FurnitureItem[] = [
  // 침대
  { id: 'f1', key: 'bed-purple', name: '보라 원목 침대', category: '침대', price: 0,   owned: true },
  { id: 'f2', key: 'bed-yellow', name: '노란 원목 침대', category: '침대', price: 500, isNew: true },
  { id: 'f3', key: 'bed-purple', name: '브라운 침대',     category: '침대', price: 0,   unlockLevel: 5 },
  { id: 'f4', key: 'bed-yellow', name: '그린 침대',       category: '침대', price: 0,   unlockLevel: 7 },
  // 책상
  { id: 'f5', key: 'desk',  name: '미니 책상',     category: '책상', price: 300, owned: true },
  { id: 'f6', key: 'desk',  name: '와이드 책상',   category: '책상', price: 800 },
  // 의자
  { id: 'f7', key: 'chair', name: '원목 의자',     category: '의자', price: 200, owned: true },
  { id: 'f8', key: 'chair', name: '메쉬 의자',     category: '의자', price: 450 },
  // 소품
  { id: 'f9',  key: 'lamp',    name: '책상 스탠드', category: '소품', price: 150, owned: true },
  { id: 'f10', key: 'plant',   name: '몬스테라',    category: '소품', price: 250, owned: true },
  { id: 'f11', key: 'beanbag', name: '빈백 의자',   category: '소품', price: 600, owned: true },
  { id: 'f12', key: 'frame',   name: '액자 세트',   category: '소품', price: 180, owned: true },
];

// 관심사
export const mockInterests = [
  '공동구매', '소분', '게임', 'OTT', '운동',
  '드라마', '영화', '먹거리', '도움',
  'LP', '맛집', '소통',
  '단기성 모임', '정기성 모임',
];

// 출석체크
export type AttendDay = {
  day: number;
  reward: number | null;
  done: boolean;
  today?: boolean;
  isAllClear?: boolean;
  allClearReward?: number;
};

export const mockAttendance: { days: AttendDay[] } = {
  days: [
    { day: 1, reward: 50,  done: true },
    { day: 2, reward: 50,  done: true },
    { day: 3, reward: 50,  done: false, today: true },
    { day: 4, reward: 50,  done: false },
    { day: 5, reward: 50,  done: false },
    { day: 6, reward: 50,  done: false },
    { day: 7, reward: null,             done: false, isAllClear: true, allClearReward: 1500 },
  ],
};
