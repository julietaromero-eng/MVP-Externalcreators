export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") ?? "nike";

  const key = process.env.RAPIDAPI_KEY;
  if (!key) return Response.json({ error: "RAPIDAPI_KEY not set" }, { status: 500 });

  const host = "instagram-best-experience.p.rapidapi.com";
  const headers = { "x-rapidapi-host": host, "x-rapidapi-key": key };

  try {
    const profileRes = await fetch(
      `https://${host}/user_profile_by_username?username=${encodeURIComponent(username)}`,
      { headers }
    );
    const profileText = await profileRes.text();
    let profileJson: unknown;
    try { profileJson = JSON.parse(profileText); } catch { profileJson = profileText; }

    if (!profileRes.ok) {
      return Response.json({ step: "profile", status: profileRes.status, body: profileJson });
    }

    const profile = profileJson as Record<string, unknown>;
    if (!profile.pk) {
      return Response.json({ step: "profile_ok_no_pk", status: profileRes.status, body: profileJson });
    }

    const feedRes = await fetch(
      `https://${host}/feed?user_id=${profile.pk}`,
      { headers }
    );
    const feedText = await feedRes.text();
    let feedJson: unknown;
    try { feedJson = JSON.parse(feedText); } catch { feedJson = feedText; }

    return Response.json({
      step: "feed",
      profileStatus: profileRes.status,
      pk: profile.pk,
      username: profile.username,
      feedStatus: feedRes.status,
      feedKeys: feedJson && typeof feedJson === "object" ? Object.keys(feedJson as object) : feedText.slice(0, 200),
      itemsCount: (feedJson as Record<string, unknown[]>)?.items?.length ?? 0,
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
