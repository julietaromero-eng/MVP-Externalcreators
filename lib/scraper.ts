import { ApifyClient } from "apify-client";

function extractIgUsername(url: string): string {
  const match = url.match(/instagram\.com\/([^/?#]+)/);
  return match ? match[1] : url.replace(/^@/, "");
}

function extractTikTokUsername(url: string): string {
  const match = url.match(/@([^/?#]+)/);
  return match ? match[1] : url;
}

export async function scrapeInstagram(url: string) {
  const key = process.env.RAPIDAPI_KEY!;
  const host = "instagram-best-experience.p.rapidapi.com";
  const headers = { "x-rapidapi-host": host, "x-rapidapi-key": key };

  const username = extractIgUsername(url);

  const profileRes = await fetch(
    `https://${host}/user_profile_by_username?username=${encodeURIComponent(username)}`,
    { headers }
  );
  if (!profileRes.ok) throw new Error(`Profile fetch failed: ${profileRes.status}`);
  const profile = await profileRes.json();
  if (!profile.pk) throw new Error("No Instagram profile found");

  const feedRes = await fetch(
    `https://${host}/feed?user_id=${profile.pk}`,
    { headers }
  );
  if (!feedRes.ok) throw new Error(`Feed fetch failed: ${feedRes.status}`);
  const feedData = await feedRes.json();

  return {
    username: profile.username as string,
    fullName: profile.full_name as string,
    biography: (profile.biography as string) ?? "",
    followersCount: (profile.follower_count as number) ?? 0,
    followingCount: (profile.following_count as number) ?? 0,
    postsCount: (profile.media_count as number) ?? 0,
    profilePicUrl: (profile.hd_profile_pic_url_info?.url ?? profile.profile_pic_url ?? null) as string | null,
    latestPosts: ((feedData.items ?? []) as Record<string, unknown>[]),
  };
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
