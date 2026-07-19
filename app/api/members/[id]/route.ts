import { deleteMember } from "@/lib/supabase";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await deleteMember(id);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete member";
    return Response.json({ error: message }, { status: 500 });
  }
}