import { replacePostMedia } from "@/lib/portfolio-store";

export async function POST(request: Request) {
  try {
    const { postId, publicUrl, isVideo } = (await request.json()) as {
      postId: string;
      publicUrl: string;
      isVideo: boolean;
    };
    if (!postId || !publicUrl) {
      return Response.json({ error: "postId and publicUrl are required" }, { status: 400 });
    }

    const post = await replacePostMedia(postId, { publicUrl, isVideo: !!isVideo });
    return Response.json(post);
  } catch (error) {
    console.error("Replace post media error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
