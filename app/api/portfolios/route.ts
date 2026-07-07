import { listPortfolios } from "@/lib/portfolio-store";

export async function GET() {
  try {
    const portfolios = await listPortfolios();
    return Response.json({ portfolios });
  } catch (error) {
    console.error("List portfolios error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
