import { loadPortfolio } from "@/lib/portfolio-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") ?? undefined;
    const portfolio = await loadPortfolio(id);
    if (!portfolio) return Response.json({ portfolio: null });
    return Response.json(portfolio);
  } catch (error) {
    console.error("Load portfolio error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
