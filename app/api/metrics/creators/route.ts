import { addCampaignCreator, listCampaignCreators, removeCampaignCreator } from "@/lib/portfolio-store";
import type { CampaignGeo, CampaignStage } from "@/lib/types";

export async function GET() {
  try {
    const creators = await listCampaignCreators();
    return Response.json({ creators });
  } catch (error) {
    console.error("List campaign creators error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { portfolioId, geo, stage } = (await request.json()) as {
      portfolioId: string;
      geo: CampaignGeo;
      stage: CampaignStage;
    };
    if (!portfolioId || !geo || !stage) {
      return Response.json({ error: "portfolioId, geo, and stage are required" }, { status: 400 });
    }
    await addCampaignCreator(portfolioId, geo, stage);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Add campaign creator error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { portfolioId } = (await request.json()) as { portfolioId: string };
    if (!portfolioId) {
      return Response.json({ error: "portfolioId is required" }, { status: 400 });
    }
    await removeCampaignCreator(portfolioId);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Remove campaign creator error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
