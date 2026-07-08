import { savePortfolio } from "@/lib/portfolio-store";

export async function PATCH(request: Request) {
  try {
    const { portfolioId } = (await request.json()) as { portfolioId: string };
    if (!portfolioId) {
      return Response.json({ error: "portfolioId is required" }, { status: 400 });
    }
    await savePortfolio(portfolioId);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Save portfolio error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
