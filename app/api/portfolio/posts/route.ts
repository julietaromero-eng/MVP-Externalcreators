import { applyPostOperations, type PostOperation } from "@/lib/portfolio-store";

export async function PATCH(request: Request) {
  try {
    const { operations } = (await request.json()) as { operations: PostOperation[] };

    if (!Array.isArray(operations) || operations.length === 0) {
      return Response.json({ error: "No hay operaciones para aplicar" }, { status: 400 });
    }

    await applyPostOperations(operations);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Update posts error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
