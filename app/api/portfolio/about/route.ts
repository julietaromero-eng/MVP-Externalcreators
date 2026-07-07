import { saveAbout } from "@/lib/portfolio-store";
import type { PortfolioAbout } from "@/lib/types";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as PortfolioAbout & { portfolioId: string };
    if (!body.portfolioId) {
      return Response.json({ error: "portfolioId is required" }, { status: 400 });
    }
    const about = await saveAbout(body.portfolioId, {
      bio: body.bio ?? "",
      hobbiesAndPassions: body.hobbiesAndPassions ?? "",
      industries: Array.isArray(body.industries) ? body.industries : [],
      contentTypes: Array.isArray(body.contentTypes) ? body.contentTypes : [],
      pronouns: body.pronouns ?? null,
      age: body.age ?? null,
      location: body.location ?? null,
      languages: body.languages ?? "",
      nationality: Array.isArray(body.nationality) ? body.nationality : [],
      contactEmail: body.contactEmail ?? null,
      socialLinks: {
        tiktok: body.socialLinks?.tiktok ?? "",
        instagram: body.socialLinks?.instagram ?? "",
        youtube: body.socialLinks?.youtube ?? "",
        kwai: body.socialLinks?.kwai ?? "",
        linkedin: body.socialLinks?.linkedin ?? "",
        twitter: body.socialLinks?.twitter ?? "",
        threads: body.socialLinks?.threads ?? "",
        facebook: body.socialLinks?.facebook ?? "",
        website: body.socialLinks?.website ?? "",
      },
      bookingLinks: {
        calendly: body.bookingLinks?.calendly ?? "",
      },
    });
    return Response.json(about);
  } catch (error) {
    console.error("Update about error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
