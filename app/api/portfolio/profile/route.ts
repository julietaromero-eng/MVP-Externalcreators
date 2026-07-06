import { saveProfileOverrides } from "@/lib/portfolio-store";
import type { ProfileOverrides } from "@/lib/types";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as ProfileOverrides;
    const overrides = await saveProfileOverrides({
      displayName: body.displayName || null,
      profilePicUrl: body.profilePicUrl || null,
    });
    return Response.json(overrides);
  } catch (error) {
    console.error("Update profile error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
