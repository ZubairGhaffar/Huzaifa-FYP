import { Member, MemberInput } from "@/types";

type CreateMemberPayload = {
  input: MemberInput;
  faceEmbedding: number[];
  faceImageBlob?: Blob | null;
};

export async function fetchMembers(): Promise<Member[]> {
  const response = await fetch("/api/members", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to load members");
  }

  return (await response.json()) as Member[];
}

export async function createMember(payload: CreateMemberPayload): Promise<Member> {
  const formData = new FormData();
  formData.append("name", payload.input.name);
  formData.append("relationship", payload.input.relationship);

  if (payload.input.email) formData.append("email", payload.input.email);
  if (payload.input.phone) formData.append("phone", payload.input.phone);
  if (payload.input.notes) formData.append("notes", payload.input.notes);

  formData.append("faceEmbedding", JSON.stringify(payload.faceEmbedding));

  if (payload.faceImageBlob) {
    formData.append("faceImage", payload.faceImageBlob, "face.jpg");
  }

  const response = await fetch("/api/members", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to save member");
  }

  return (await response.json()) as Member;
}

export async function removeMember(id: string): Promise<void> {
  const response = await fetch(`/api/members/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to delete member");
  }
}