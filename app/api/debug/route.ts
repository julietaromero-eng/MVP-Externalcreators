export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") ?? "nike";

  const key = process.env.RAPIDAPI_KEY;
  if (!key) return Response.json({ error: "RAPIDAPI_KEY not set" }, { status: 500 });

  const host = "instagram-best-experience.p.rapidapi.com";
  const headers = { "x-rapidapi-host": host, "x-rapidapi-key": key };

  const candidates = [
    `/user_profile_by_username?username=${encodeURIComponent(username)}`,
    `/profile?username=${encodeURIComponent(username)}`,
    `/v1/user_profile_by_username?username=${encodeURIComponent(username)}`,
    `/user?username=${encodeURIComponent(username)}`,
    `/user_by_username?username=${encodeURIComponent(username)}`,
    `/v1/profile?username=${encodeURIComponent(username)}`,
    `/username?username=${encodeURIComponent(username)}`,
  ];

  const results: Record<string, unknown>[] = [];

  for (const path of candidates) {
    try {
      const res = await fetch(`https://${host}${path}`, { headers });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); } catch { body = text.slice(0, 100); }
      results.push({ path, status: res.status, ok: res.ok, body: res.ok ? "OK - has data" : body });
      if (res.ok) break;
    } catch (e) {
      results.push({ path, error: String(e) });
    }
  }

  return Response.json({ results });
}
