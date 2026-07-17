import { loadOwnPortfolio } from "@/lib/portfolio-store";

export async function GET() {
  try {
    const portfolio = await loadOwnPortfolio();
    return Response.json(portfolio);
  } catch (error) {
    console.error("Load own portfolio error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
