function extractIgUsername(url: string): string {
  const trimmed = url.trim();
  const match = trimmed.match(/instagram\.com\/([^/?#]+)/);
  return match ? match[1] : trimmed.replace(/^@/, "");
}

function extractTikTokUsername(url: string): string {
  const trimmed = url.trim();
  const match = trimmed.match(/@([^/?#]+)/);
  return match ? match[1] : trimmed;
}

// The IG scraper API is intermittently unstable (shared scraping IP getting
// throttled by Instagram) — retry transient failures a couple times before
// giving up, since most clear within a few seconds.
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  delayMs = 1500
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, options);
    if (res.ok || attempt >= retries || (res.status !== 429 && res.status < 500)) return res;
    await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
  }
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

    const res = await fetchWithRetry(url.toString(), { headers });
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

  const profileRes = await fetchWithRetry(
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

// ─── TikTok (RapidAPI: tiktok-scraper26) ─────────────────────────────────

export class TikTokScraperError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "private" | "rate_limited" | "unauthorized" | "unknown"
  ) {
    super(message);
    this.name = "TikTokScraperError";
  }
}

const TIKTOK_RAPIDAPI_HOST = "tiktok-scraper26.p.rapidapi.com";

async function tiktokRapidApiFetch(path: string): Promise<Record<string, unknown>> {
  const key = process.env.RAPIDAPI_TIKTOK_KEY;
  if (!key) throw new Error("RAPIDAPI_TIKTOK_KEY not set");

  const res = await fetch(`https://${TIKTOK_RAPIDAPI_HOST}${path}`, {
    headers: { "x-rapidapi-host": TIKTOK_RAPIDAPI_HOST, "x-rapidapi-key": key },
  });

  if (res.status === 429) {
    throw new TikTokScraperError(
      "TikTok RapidAPI rate limit (429) reached on the free plan — try again in a bit.",
      "rate_limited"
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new TikTokScraperError(
      "RAPIDAPI_TIKTOK_KEY is invalid, or the account isn't subscribed to tiktok-scraper26.",
      "unauthorized"
    );
  }
  if (res.status === 404) {
    throw new TikTokScraperError("TikTok profile not found.", "not_found");
  }
  if (!res.ok) {
    throw new TikTokScraperError(`TikTok RapidAPI request failed: ${res.status}`, "unknown");
  }
  return res.json();
}

export async function scrapeTikTok(url: string) {
  const username = extractTikTokUsername(url);

  // Verified against the live API: response is { user, stats } directly, no
  // extra "userInfo" wrapper.
  const userInfo = await tiktokRapidApiFetch(`/userinfo-by-username?username=${encodeURIComponent(username)}`);
  const user = (userInfo.user as Record<string, unknown>) ?? {};
  const stats = (userInfo.stats as Record<string, unknown>) ?? {};

  const secUid = user.secUid as string | undefined;
  if (!secUid) throw new TikTokScraperError("TikTok profile not found.", "not_found");
  if (user.secret || user.privateAccount) {
    throw new TikTokScraperError("This TikTok profile is private.", "private");
  }

  // Verified: response is { data: { itemList: [...], cursor, hasMore } }.
  const postsData = await tiktokRapidApiFetch(
    `/user-posts?secUid=${encodeURIComponent(secUid)}&count=10&cursor=0`
  );
  const posts = (((postsData.data as Record<string, unknown>)?.itemList as Record<string, unknown>[]) ?? []);

  return { user, stats, posts };
}
