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

  return Response.json({
    step: "profile_ok",
    status: profileRes.status,
    topKeys: Object.keys(profileJson),
    pk: profileJson.pk,
    id: profileJson.id,
    user_id: profileJson.user_id,
    idField,
    username: profileJson.username,
    full_name: profileJson.full_name,
    follower_count: profileJson.follower_count,
  });
}
