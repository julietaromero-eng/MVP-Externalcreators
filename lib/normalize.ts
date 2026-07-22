import type { CreatorProfile, CreatorPost } from "./types";

type RawData = Record<string, unknown>;

const MAX_POSTS = 20;

function igEngagement(p: RawData): number {
  return ((p.like_count as number) ?? 0) + ((p.comment_count as number) ?? 0) * 3;
}

function ttEngagement(v: RawData): number {
  const stats = (v.stats as RawData) ?? {};
  // weight: comments > likes > views (views are much higher volume)
  return ((stats.diggCount as number) ?? 0) +
    ((stats.commentCount as number) ?? 0) * 3 +
    ((stats.playCount as number) ?? 0) * 0.001;
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
    const videoUrl = isVideo ? ((p.video_versions as RawData[])?.[0]?.url as string) ?? null : null;
    const code = p.code as string | undefined;
    const captionObj = p.caption as Record<string, unknown> | null;
    return {
      thumbnailUrl,
      postUrl: code ? `https://www.instagram.com/${isVideo ? "reel" : "p"}/${code}/` : null,
      likesCount: (p.like_count as number) ?? 0,
      commentsCount: (p.comment_count as number) ?? 0,
      isVideo,
      videoUrl,
      caption: (captionObj?.text as string) ?? "",
      isPinned: Boolean(p.is_pinned),
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

// Raw shape comes from lib/scraper.ts's scrapeTikTok (RapidAPI tiktok-scraper26),
// verified against a live call: { user, stats, posts }, where each post has
// { id, desc, stats: { diggCount, commentCount, playCount, shareCount }, video: { cover, originCover } }.
// This endpoint doesn't expose a pinned-post flag, so isPinned is always false.
export function normalizeTikTok(raw: RawData): CreatorProfile {
  const user = (raw.user as RawData) ?? {};
  const stats = (raw.stats as RawData) ?? {};
  const rawPosts = (raw.posts as RawData[]) ?? [];
  const sorted = [...rawPosts].sort((a, b) => ttEngagement(b) - ttEngagement(a)).slice(0, MAX_POSTS);

  const recentPosts: CreatorPost[] = sorted.map((p) => {
    const video = (p.video as RawData) ?? {};
    const postStats = (p.stats as RawData) ?? {};
    return {
      thumbnailUrl: (video.cover as string) ?? (video.originCover as string) ?? null,
      postUrl: p.id ? `https://www.tiktok.com/@${user.uniqueId}/video/${p.id}` : null,
      likesCount: (postStats.diggCount as number) ?? 0,
      commentsCount: (postStats.commentCount as number) ?? 0,
      viewsCount: (postStats.playCount as number) ?? 0,
      isVideo: true,
      caption: (p.desc as string) ?? "",
      isPinned: false,
    };
  });

  return {
    platform: "tiktok",
    username: (user.uniqueId as string) ?? "",
    displayName: (user.nickname as string) ?? (user.uniqueId as string) ?? "",
    bio: (user.signature as string) ?? "",
    followersCount: (stats.followerCount as number) ?? 0,
    followingCount: (stats.followingCount as number) ?? 0,
    postsCount: (stats.videoCount as number) ?? 0,
    profilePicUrl: (user.avatarLarger as string) ?? (user.avatarMedium as string) ?? null,
    totalLikes: (stats.heartCount as number) ?? 0,
    recentPosts,
  };
}
