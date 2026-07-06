import { loadPortfolio } from "@/lib/portfolio-store";

export async function GET() {
  try {
    const portfolio = await loadPortfolio();
    if (!portfolio) return Response.json({ portfolio: null });
    return Response.json(portfolio);
  } catch (error) {
    console.error("Load portfolio error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
