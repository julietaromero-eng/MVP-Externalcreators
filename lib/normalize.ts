import type { CreatorProfile, CreatorPost } from "./types";

type RawData = Record<string, unknown>;

function igEngagement(p: RawData): number {
  return ((p.likesCount as number) ?? 0) + ((p.commentsCount as number) ?? 0) * 3;
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

  const sorted = [...rawPosts].sort((a, b) => igEngagement(b) - igEngagement(a));

  const recentPosts: CreatorPost[] = sorted.slice(0, 12).map((p) => ({
    thumbnailUrl: (p.displayUrl as string) ?? null,
    postUrl: (p.url as string) ?? null,
    likesCount: (p.likesCount as number) ?? 0,
    commentsCount: (p.commentsCount as number) ?? 0,
    caption: (p.caption as string) ?? "",
  }));

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

export function normalizeTikTok(raw: RawData): CreatorProfile {
  const rawVideos = (raw.videos as RawData[]) ?? [];

  const sorted = [...rawVideos].sort((a, b) => ttEngagement(b) - ttEngagement(a));

  const recentPosts: CreatorPost[] = sorted.slice(0, 12).map((v) => {
    const stats = (v.stats as Record<string, number>) ?? {};
    const videoInfo = (v.video as RawData) ?? {};
    return {
      thumbnailUrl: (videoInfo.cover as string) ?? (videoInfo.originCover as string) ?? null,
      postUrl: `https://www.tiktok.com/@${raw.uniqueId}/video/${v.id}`,
      likesCount: stats.likeCount ?? (v.diggCount as number) ?? 0,
      commentsCount: stats.commentCount ?? 0,
      viewsCount: stats.playCount ?? 0,
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
