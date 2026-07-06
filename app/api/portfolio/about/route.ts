import { saveAbout } from "@/lib/portfolio-store";
import type { PortfolioAbout } from "@/lib/types";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as PortfolioAbout;
    const about = await saveAbout({
      bio: body.bio ?? "",
      contactEmail: body.contactEmail ?? null,
      contactLinks: Array.isArray(body.contactLinks) ? body.contactLinks : [],
    });
    return Response.json(about);
  } catch (error) {
    console.error("Update about error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
