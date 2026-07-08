import type { CreatorProfile, CreatorPost } from "./types";

type RawData = Record<string, unknown>;

const MAX_POSTS = 20;

function igEngagement(p: RawData): number {
  return ((p.like_count as number) ?? 0) + ((p.comment_count as number) ?? 0) * 3;
}

function ttEngagement(v: RawData): number {
  const s = (v.stats as Record<string, number>) ?? {};
  // weight: comments > likes > views (views are much higher volume)
  return (s.likeCount ?? (v.diggCount as number) ?? 0) +
    (s.commentCount ?? 0) * 3 +
    (s.playCount ?? 0) * 0.001;
}

export function normalizeInstagram(raw: RawData): CreatorProfile {
  const rawPosts = (raw.latestPosts as RawData[]) ?? [];
  const sorted = [...rawPosts].sort((a, b) => igEngagement(b) - igEngagement(a)).slice(0, MAX_POSTS);

  const recentPosts: CreatorPost[] = sorted.map((p) => {
    const isCarousel = (p.media_type as number) === 8;
    const isVideo = (p.media_type as number) === 2;
    const candidates = isCarousel
      ? ((p.carousel_media as RawData[])?.[0]?.image_versions2 as RawData)?.candidates as RawData[]
      : ((p.image_versions2 as RawData)?.candidates as RawData[]);
    const thumbnailUrl = (candidates?.[0]?.url as string) ?? null;
    const captionObj = p.caption as Record<string, unknown> | null;
    return {
      thumbnailUrl,
      postUrl: null,
      likesCount: (p.like_count as number) ?? 0,
      commentsCount: (p.comment_count as number) ?? 0,
      isVideo,
      caption: (captionObj?.text as string) ?? "",
    };
  });

  return {
    platform: "instagram",
    username: (raw.username as string) ?? "",
    displayName: (raw.fullName as string) ?? (raw.username as string) ?? "",
    bio: (raw.biography as string) ?? "",
    followersCount: (raw.followersCount as number) ?? 0,
    followingCount: (raw.followingCount as number) ?? 0,
    postsCount: (raw.postsCount as number) ?? 0,
    profilePicUrl: (raw.profilePicUrl as string) ?? null,
    recentPosts,
  };
}

export function stubProfile(platform: "youtube" | "other", url: string): CreatorProfile {
  return {
    platform,
    status: "coming_soon",
    username: url,
    displayName: url,
    bio: "",
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    profilePicUrl: null,
    recentPosts: [],
  };
}

export function normalizeTikTok(raw: RawData): CreatorProfile {
  const rawVideos = (raw.videos as RawData[]) ?? [];
  const sorted = [...rawVideos].sort((a, b) => ttEngagement(b) - ttEngagement(a)).slice(0, MAX_POSTS);

  const recentPosts: CreatorPost[] = sorted.map((v) => {
    const stats = (v.stats as Record<string, number>) ?? {};
    const videoInfo = (v.video as RawData) ?? {};
    return {
      thumbnailUrl: (videoInfo.cover as string) ?? (videoInfo.originCover as string) ?? null,
      postUrl: `https://www.tiktok.com/@${raw.uniqueId}/video/${v.id}`,
      likesCount: stats.likeCount ?? (v.diggCount as number) ?? 0,
      commentsCount: stats.commentCount ?? 0,
      viewsCount: stats.playCount ?? 0,
      isVideo: true,
      caption: (v.desc as string) ?? "",
    };
  });

  return {
    platform: "tiktok",
    username: (raw.uniqueId as string) ?? "",
    displayName: (raw.nickname as string) ?? (raw.uniqueId as string) ?? "",
    bio: (raw.signature as string) ?? "",
    followersCount: (raw.fans as number) ?? (raw.followerCount as number) ?? 0,
    followingCount: (raw.following as number) ?? 0,
    postsCount: (raw.video as number) ?? (raw.videoCount as number) ?? 0,
    profilePicUrl: (raw.avatarMedium as string) ?? (raw.avatarLarger as string) ?? null,
    totalLikes: (raw.heart as number) ?? (raw.heartCount as number) ?? 0,
    recentPosts,
  };
}
