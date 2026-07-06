import { ApifyClient } from "apify-client";

function extractIgUsername(url: string): string {
  const match = url.match(/instagram\.com\/([^/?#]+)/);
  return match ? match[1] : url.replace(/^@/, "");
}

function extractTikTokUsername(url: string): string {
  const match = url.match(/@([^/?#]+)/);
  return match ? match[1] : url;
}

const FEED_POST_TARGET = 20;

// The feed endpoint paginates in pages of ~12 items. Pagination cursor param
// is "next_max_id" (not the standard IG private-API "max_id") — verified
// against the live API response shape, not assumed.
async function fetchInstagramFeedItems(
  host: string,
  headers: Record<string, string>,
  userId: number,
  targetCount: number
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let nextMaxId: string | undefined;

  while (items.length < targetCount) {
    const url = new URL(`https://${host}/feed`);
    url.searchParams.set("user_id", String(userId));
    if (nextMaxId) url.searchParams.set("next_max_id", nextMaxId);

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
    const data = await res.json();
    const pageItems = (data.items ?? []) as Record<string, unknown>[];
    if (pageItems.length === 0) break;

    items.push(...pageItems);
    if (!data.more_available || !data.next_max_id) break;
    nextMaxId = data.next_max_id as string;
  }

  return items.slice(0, targetCount);
}

export async function scrapeInstagram(url: string) {
  const key = process.env.RAPIDAPI_KEY!;
  const host = "instagram-best-experience.p.rapidapi.com";
  const headers = { "x-rapidapi-host": host, "x-rapidapi-key": key };

  const username = extractIgUsername(url);

  const profileRes = await fetch(
    `https://${host}/profile?username=${encodeURIComponent(username)}`,
    { headers }
  );
  if (!profileRes.ok) throw new Error(`Profile fetch failed: ${profileRes.status}`);
  const profile = await profileRes.json();
  if (!profile.pk) throw new Error("No Instagram profile found");

  const latestPosts = await fetchInstagramFeedItems(host, headers, profile.pk, FEED_POST_TARGET);

  return {
    username: profile.username as string,
    fullName: profile.full_name as string,
    biography: (profile.biography as string) ?? "",
    followersCount: (profile.follower_count as number) ?? 0,
    followingCount: (profile.following_count as number) ?? 0,
    postsCount: (profile.media_count as number) ?? 0,
    profilePicUrl: (profile.hd_profile_pic_url_info?.url ?? profile.profile_pic_url ?? null) as string | null,
    pk: profile.pk as number,
    latestPosts,
  };
}

// ─── Not-yet-implemented platforms ──────────────────────────────────────

export class NotImplementedScraperError extends Error {
  constructor(public platform: "youtube" | "other") {
    super(`${platform} scraping is not implemented yet`);
    this.name = "NotImplementedScraperError";
  }
}

export async function scrapeTikTok(url: string) {
  const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
  const username = extractTikTokUsername(url);

  const run = await client.actor("clockworks/free-tiktok-scraper").call({
    profiles: [`https://www.tiktok.com/@${username}`],
    resultsType: "profiles",
    resultsLimit: 1,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  if (!items.length) throw new Error("No TikTok data returned");
  return items[0] as Record<string, unknown>;
}
