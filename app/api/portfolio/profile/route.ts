import { saveProfileOverrides } from "@/lib/portfolio-store";
import type { ProfileOverrides } from "@/lib/types";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as ProfileOverrides & { portfolioId: string };
    if (!body.portfolioId) {
      return Response.json({ error: "portfolioId is required" }, { status: 400 });
    }
    const overrides = await saveProfileOverrides(body.portfolioId, {
      displayName: body.displayName || null,
      profilePicUrl: body.profilePicUrl || null,
    });
    return Response.json(overrides);
  } catch (error) {
    console.error("Update profile error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
