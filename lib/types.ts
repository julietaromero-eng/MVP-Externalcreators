export type Platform = "instagram" | "tiktok" | "youtube" | "other";

export type ProfileStatus = "active" | "coming_soon" | "error";

export interface CreatorPost {
  id?: string;
  thumbnailUrl: string | null;
  postUrl: string | null;
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
  isVideo?: boolean;
  videoUrl?: string | null;
  caption: string;
  sortOrder?: number;
  isPinned?: boolean;
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

export interface SocialLinks {
  tiktok: string;
  instagram: string;
  youtube: string;
  kwai: string;
  linkedin: string;
  twitter: string;
  threads: string;
  facebook: string;
  website: string;
}

export interface BookingLinks {
  calendly: string;
}

export interface PortfolioAbout {
  bio: string;
  hobbiesAndPassions: string;
  industries: string[];
  contentTypes: string[];
  pronouns: string | null;
  age: string | null;
  location: string | null;
  languages: string;
  nationality: string[];
  contactEmail: string | null;
  socialLinks: SocialLinks;
  bookingLinks: BookingLinks;
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
  hobbiesAndPassions: string;
}

export interface GenerateResponse {
  id: string;
  isSaved?: boolean;
  profiles: CreatorProfile[];
  aiAnalysis: AIAnalysis;
  generatedAt: string;
  about?: PortfolioAbout;
  profileOverrides?: ProfileOverrides;
}

export interface PortfolioSummary {
  id: string;
  displayName: string;
  username: string;
  profilePicUrl: string | null;
  platforms: Platform[];
  generatedAt: string | null;
}

// ISO 3166-1 alpha-2 country code.
export type CampaignGeo = string;

export interface CampaignCreatorSummary extends PortfolioSummary {
  geo: CampaignGeo;
}
