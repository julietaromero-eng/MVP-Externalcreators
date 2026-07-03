export interface CreatorPost {
  thumbnailUrl: string | null;
  postUrl: string | null;
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
  caption: string;
}

export interface CreatorProfile {
  platform: "instagram" | "tiktok";
  username: string;
  displayName: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  profilePicUrl: string | null;
  totalLikes?: number;
  recentPosts: CreatorPost[];
}

export interface AIAnalysis {
  summary: string;
  contentPillars: string[];
  audience: string;
  primaryLanguage: string;
  tags: string[];
  topics: string[];
}

export interface GenerateResponse {
  profiles: CreatorProfile[];
  aiAnalysis: AIAnalysis;
  generatedAt: string;
}
