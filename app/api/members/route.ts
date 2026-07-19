import { addMember, getAllMembers } from "@/lib/supabase";
import { MemberInput } from "@/types";

export async function GET() {
  try {
    const members = await getAllMembers();
    return Response.json(members);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch members";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const faceEmbeddingField = formData.get("faceEmbedding");
    const faceEmbedding =
      typeof faceEmbeddingField === "string" ? (JSON.parse(faceEmbeddingField) as number[]) : [];

    const memberInput: MemberInput = {
      name: String(formData.get("name") ?? "").trim(),
      relationship: String(formData.get("relationship") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim() || undefined,
      phone: String(formData.get("phone") ?? "").trim() || undefined,
      notes: String(formData.get("notes") ?? "").trim() || undefined,
    };

    const faceImageValue = formData.get("faceImage");
    const faceImageBlob = faceImageValue instanceof Blob ? faceImageValue : undefined;

    const createdMember = await addMember(memberInput, faceEmbedding, faceImageBlob);
    return Response.json(createdMember, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create member";
    return Response.json({ error: message }, { status: 500 });
  }
}