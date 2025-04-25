export interface Post {
  id: number;
  title: string;
  eventName?: string;
  eventDate: string;
  eventVenue: string;
  price: number;
  image?: string;  // 이미지 URL을 위한 필드 추가
  author?: {
    id: number;
    name: string;
    rating?: number;
    successRate?: number;
  };
  createdAt?: string;
  updatedAt?: string;
} 