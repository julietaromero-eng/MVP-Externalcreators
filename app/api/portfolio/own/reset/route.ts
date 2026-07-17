import { resetOwnPortfolio } from "@/lib/portfolio-store";

export async function POST() {
  try {
    await resetOwnPortfolio();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Reset own portfolio error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
