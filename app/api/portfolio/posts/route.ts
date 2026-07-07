import { applyPostOperations, type PostOperation } from "@/lib/portfolio-store";

export async function PATCH(request: Request) {
  try {
    const { operations } = (await request.json()) as { operations: PostOperation[] };

    if (!Array.isArray(operations) || operations.length === 0) {
      return Response.json({ error: "No operations to apply" }, { status: 400 });
    }

    await applyPostOperations(operations);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Update posts error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
