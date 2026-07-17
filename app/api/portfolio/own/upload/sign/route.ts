import { getSupabaseAdmin } from "@/lib/supabase";
import { ensureManualUploadsProfile, loadOwnPortfolio } from "@/lib/portfolio-store";

const BUCKET = "portfolio-uploads";

export async function POST(request: Request) {
  try {
    const { filename, contentType } = (await request.json()) as {
      filename: string;
      contentType: string;
    };
    if (!filename) {
      return Response.json({ error: "filename is required" }, { status: 400 });
    }

    const portfolio = await loadOwnPortfolio();
    const profileId = await ensureManualUploadsProfile(portfolio.id);

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `manual/${profileId}/${crypto.randomUUID()}-${safeName}`;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return Response.json({
      path,
      token: data.token,
      publicUrl: publicUrlData.publicUrl,
      isVideo: contentType?.startsWith("video/") ?? false,
    });
  } catch (error) {
    console.error("Sign upload error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
