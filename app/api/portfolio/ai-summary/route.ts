import { saveAiSummary } from "@/lib/portfolio-store";

export async function PATCH(request: Request) {
  try {
    const { summary } = (await request.json()) as { summary: string };
    const saved = await saveAiSummary(summary ?? "");
    return Response.json({ summary: saved });
  } catch (error) {
    console.error("Update AI summary error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
