export type Platform = "instagram" | "tiktok" | "youtube" | "other";

export type ProfileStatus = "active" | "coming_soon" | "error";

export interface CreatorPost {
  id?: string;
  thumbnailUrl: string | null;
  postUrl: string | null;
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
  caption: string;
  sortOrder?: number;
}

export interface CreatorProfile {
  platform: Platform;
  status?: ProfileStatus;
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

export interface ContactLink {
  label: string;
  url: string;
}

export interface PortfolioAbout {
  bio: string;
  contactEmail: string | null;
  contactLinks: ContactLink[];
}

export interface ProfileOverrides {
  displayName: string | null;
  profilePicUrl: string | null;
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
  about?: PortfolioAbout;
  profileOverrides?: ProfileOverrides;
}
