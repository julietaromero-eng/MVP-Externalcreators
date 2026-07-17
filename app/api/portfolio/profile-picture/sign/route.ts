import { getSupabaseAdmin } from "@/lib/supabase";

const BUCKET = "portfolio-uploads";

export async function POST(request: Request) {
  try {
    const { portfolioId, filename } = (await request.json()) as {
      portfolioId: string;
      filename: string;
    };
    if (!portfolioId || !filename) {
      return Response.json({ error: "portfolioId and filename are required" }, { status: 400 });
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `profile-pics/${portfolioId}/${crypto.randomUUID()}-${safeName}`;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return Response.json({ path, token: data.token, publicUrl: publicUrlData.publicUrl });
  } catch (error) {
    console.error("Sign profile picture upload error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
