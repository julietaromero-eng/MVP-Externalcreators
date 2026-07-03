import { scrapeInstagram, scrapeTikTok } from "@/lib/scraper";
import { generateCreatorAnalysis } from "@/lib/ai";
import { normalizeInstagram, normalizeTikTok } from "@/lib/normalize";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { instagramUrl, tiktokUrl } = await request.json();

    if (!instagramUrl && !tiktokUrl) {
      return Response.json({ error: "Ingresá al menos una URL" }, { status: 400 });
    }

    const [instagramRaw, tiktokRaw] = await Promise.all([
      instagramUrl ? scrapeInstagram(instagramUrl).catch(() => null) : null,
      tiktokUrl ? scrapeTikTok(tiktokUrl).catch(() => null) : null,
    ]);

    if (!instagramRaw && !tiktokRaw) {
      return Response.json(
        { error: "No se pudo obtener información. Verificá que las URLs sean correctas y los perfiles sean públicos." },
        { status: 422 }
      );
    }

    const profiles = [
      instagramRaw ? normalizeInstagram(instagramRaw) : null,
      tiktokRaw ? normalizeTikTok(tiktokRaw) : null,
    ].filter((p): p is NonNullable<typeof p> => p !== null);

    const aiAnalysis = await generateCreatorAnalysis(profiles);

    return Response.json({ profiles, aiAnalysis, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Generate error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
