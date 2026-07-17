import { ensureManualUploadsProfile, insertManualPost, loadOwnPortfolio } from "@/lib/portfolio-store";

export async function POST(request: Request) {
  try {
    const { publicUrl, isVideo } = (await request.json()) as {
      publicUrl: string;
      isVideo: boolean;
    };
    if (!publicUrl) {
      return Response.json({ error: "publicUrl is required" }, { status: 400 });
    }

    const portfolio = await loadOwnPortfolio();
    const profileId = await ensureManualUploadsProfile(portfolio.id);
    const post = await insertManualPost(profileId, { publicUrl, isVideo: !!isVideo });

    return Response.json(post);
  } catch (error) {
    console.error("Complete upload error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
