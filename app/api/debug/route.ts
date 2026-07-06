export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") ?? "nike";

  const key = process.env.RAPIDAPI_KEY;
  if (!key) return Response.json({ error: "RAPIDAPI_KEY not set" }, { status: 500 });

  const host = "instagram-best-experience.p.rapidapi.com";
  const headers = { "x-rapidapi-host": host, "x-rapidapi-key": key };

  // Step 1: profile
  const profileRes = await fetch(
    `https://${host}/profile?username=${encodeURIComponent(username)}`,
    { headers }
  );
  const profileText = await profileRes.text();
  let profileJson: Record<string, unknown>;
  try { profileJson = JSON.parse(profileText); } catch { return Response.json({ step: "profile_parse_error", raw: profileText.slice(0, 300) }); }

  if (!profileRes.ok) return Response.json({ step: "profile_failed", status: profileRes.status, body: profileJson });

  // Find the user id field
  const idField = profileJson.pk ?? profileJson.id ?? profileJson.user_id ?? profileJson.userId;

  // Step 2: feed
  const feedRes = await fetch(`https://${host}/feed?user_id=${idField}`, { headers });
  const feedJson = await feedRes.json();
  const items = (feedJson.items ?? []) as Record<string, unknown>[];

  return Response.json({
    step: "profile_ok",
    status: profileRes.status,
    topKeys: Object.keys(profileJson),
    pk: profileJson.pk,
    username: profileJson.username,
    full_name: profileJson.full_name,
    follower_count: profileJson.follower_count,
    feed: {
      status: feedRes.status,
      topLevelKeys: Object.keys(feedJson),
      itemCount: items.length,
      itemKeys: items[0] ? Object.keys(items[0]) : [],
      itemsPreview: items.map((it) => ({
        id: it.id,
        taken_at: it.taken_at,
        like_count: it.like_count,
        comment_count: it.comment_count,
        media_type: it.media_type,
        is_pinned: it.is_pinned,
        timeline_pinned_user_ids: it.timeline_pinned_user_ids,
      })),
    },
  });
}
