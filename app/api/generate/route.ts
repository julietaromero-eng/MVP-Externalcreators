import { scrapeInstagram, scrapeTikTok } from "@/lib/scraper";
import { generateCreatorAnalysis } from "@/lib/ai";
import { normalizeInstagram, normalizeTikTok, stubProfile } from "@/lib/normalize";
import { loadPortfolio, saveGeneratedPortfolio } from "@/lib/portfolio-store";
import type { GenerateResponse } from "@/lib/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { instagramUrl, tiktokUrl, youtubeUrl, portfolioId } = await request.json();

    if (!instagramUrl && !tiktokUrl && !youtubeUrl) {
      return Response.json({ error: "Enter at least one URL" }, { status: 400 });
    }

    const [instagramResult, tiktokResult] = await Promise.allSettled([
      instagramUrl ? scrapeInstagram(instagramUrl) : Promise.resolve(null),
      tiktokUrl ? scrapeTikTok(tiktokUrl) : Promise.resolve(null),
    ]);

    if (instagramResult.status === "rejected") console.error("IG scrape error:", instagramResult.reason);
    if (tiktokResult.status === "rejected") console.error("TT scrape error:", tiktokResult.reason);

    const instagramRaw = instagramResult.status === "fulfilled" ? instagramResult.value : null;
    const tiktokRaw = tiktokResult.status === "fulfilled" ? tiktokResult.value : null;

    if (!instagramRaw && !tiktokRaw && !youtubeUrl) {
      const errorMessage = (result: PromiseSettledResult<unknown>) =>
        result.status === "rejected" ? String(result.reason?.message ?? result.reason) : "";
      const isRateLimited =
        errorMessage(instagramResult).includes("429") || errorMessage(tiktokResult).includes("429");
      return Response.json(
        {
          error: isRateLimited
            ? "The scraping provider is temporarily rate-limited. Please try again in a few minutes."
            : "Couldn't fetch the profile information. Check that the URLs are correct and the profiles are public.",
        },
        { status: 422 }
      );
    }

    const profiles = [
      instagramRaw ? normalizeInstagram(instagramRaw) : null,
      tiktokRaw ? normalizeTikTok(tiktokRaw) : null,
      youtubeUrl ? stubProfile("youtube", youtubeUrl) : null,
    ].filter((p): p is NonNullable<typeof p> => p !== null);

    const aiAnalysis = await generateCreatorAnalysis(profiles);
    const generatedAt = new Date().toISOString();

    let responseBody: GenerateResponse = { id: portfolioId ?? "", profiles, aiAnalysis, generatedAt };

    try {
      const savedId = await saveGeneratedPortfolio(profiles, aiAnalysis, portfolioId);
      const persisted = await loadPortfolio(savedId);
      if (persisted) responseBody = persisted;
    } catch (e) {
      console.error("Portfolio persistence error:", e);
    }

    return Response.json(responseBody);
  } catch (error) {
    console.error("Generate error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
