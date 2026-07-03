import { ApifyClient } from "apify-client";

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

export async function scrapeInstagram(url: string) {
  // Normalize URL: ensure trailing slash for the actor
  const normalized = url.endsWith("/") ? url : url + "/";

  const run = await client.actor("apify/instagram-profile-scraper").call({
    directUrls: [normalized],
    resultsType: "details",
    resultsLimit: 30, // fetch 30 so we can pick the top by engagement
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  if (!items.length) throw new Error("No Instagram data returned");
  return items[0] as Record<string, unknown>;
}

function extractTikTokUsername(url: string): string {
  // Handles: https://www.tiktok.com/@username or https://tiktok.com/@username/...
  const match = url.match(/@([^/?#]+)/);
  return match ? match[1] : url;
}

export async function scrapeTikTok(url: string) {
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
