import { ApifyClient } from "apify-client";

export async function scrapeInstagram(url: string) {
  const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
  const normalized = url.endsWith("/") ? url : url + "/";

  const run = await client.actor("apify/instagram-scraper").call({
    directUrls: [normalized],
    resultsType: "details",
    resultsLimit: 30,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  if (!items.length) throw new Error("No Instagram data returned");
  return items[0] as Record<string, unknown>;
}

function extractTikTokUsername(url: string): string {
  const match = url.match(/@([^/?#]+)/);
  return match ? match[1] : url;
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
