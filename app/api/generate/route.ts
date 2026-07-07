import { scrapeInstagram, scrapeTikTok } from "@/lib/scraper";
import { generateCreatorAnalysis } from "@/lib/ai";
import { normalizeInstagram, normalizeTikTok, stubProfile } from "@/lib/normalize";
import { loadPortfolio, saveGeneratedPortfolio } from "@/lib/portfolio-store";
import type { GenerateResponse } from "@/lib/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { instagramUrl, tiktokUrl, youtubeUrl } = await request.json();

    if (!instagramUrl && !tiktokUrl && !youtubeUrl) {
      return Response.json({ error: "Ingresá al menos una URL" }, { status: 400 });
    }

    let instagramError: string | null = null;
    let tiktokError: string | null = null;

    const [instagramRaw, tiktokRaw] = await Promise.all([
      instagramUrl
        ? scrapeInstagram(instagramUrl).catch((e) => {
            instagramError = e?.message ?? String(e);
            console.error("IG scrape error:", instagramError);
            return null;
          })
        : null,
      tiktokUrl
        ? scrapeTikTok(tiktokUrl).catch((e) => {
            tiktokError = e?.message ?? String(e);
            console.error("TT scrape error:", tiktokError);
            return null;
          })
        : null,
    ]);

    if (!instagramRaw && !tiktokRaw && !youtubeUrl) {
      const isRateLimited = instagramError?.includes("429") || tiktokError?.includes("429");
      return Response.json(
        {
          error: isRateLimited
            ? "Instagram está inestable en este momento (límite temporal del proveedor). Probá de nuevo en unos minutos."
            : "No se pudo obtener información. Verificá que las URLs sean correctas y los perfiles sean públicos.",
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

    let responseBody: GenerateResponse = { profiles, aiAnalysis, generatedAt };

    try {
      await saveGeneratedPortfolio(profiles, aiAnalysis);
      const persisted = await loadPortfolio();
      if (persisted) responseBody = persisted;
    } catch (e) {
      console.error("Portfolio persistence error:", e);
    }

    return Response.json(responseBody);
  } catch (error) {
    console.error("Generate error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
