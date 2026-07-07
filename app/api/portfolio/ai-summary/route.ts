import { saveAiSummary } from "@/lib/portfolio-store";

export async function PATCH(request: Request) {
  try {
    const { summary, portfolioId } = (await request.json()) as { summary: string; portfolioId: string };
    if (!portfolioId) {
      return Response.json({ error: "portfolioId is required" }, { status: 400 });
    }
    const saved = await saveAiSummary(portfolioId, summary ?? "");
    return Response.json({ summary: saved });
  } catch (error) {
    console.error("Update AI summary error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
