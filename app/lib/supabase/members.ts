import { supabase } from "./client";
import { Member, MemberInput } from "@/types";
import { MEMBERS_TABLE, MEMBER_STORAGE_BUCKET } from "@/lib/config";

export async function getAllMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from(MEMBERS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAllMembers] Error:", error);
    throw new Error(error.message);
  }

  return data || [];
}

export async function getMemberById(id: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from(MEMBERS_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[getMemberById] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function addMember(
  input: MemberInput,
  faceEmbedding: number[],
  faceImageBlob?: Blob
): Promise<Member> {
  let faceImageUrl: string | undefined;

  if (faceImageBlob) {
    const fileName = `face-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(MEMBER_STORAGE_BUCKET)
      .upload(fileName, faceImageBlob, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("[addMember] Storage upload error:", uploadError);
      throw new Error(`Failed to upload face image: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(MEMBER_STORAGE_BUCKET)
      .getPublicUrl(uploadData.path);

    faceImageUrl = urlData.publicUrl;
  }

  const { data, error } = await supabase
    .from(MEMBERS_TABLE)
    .insert({
      name: input.name,
      relationship: input.relationship,
      email: input.email || null,
      phone: input.phone || null,
      notes: input.notes || null,
      face_embedding: faceEmbedding,
      face_image_url: faceImageUrl || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[addMember] DB insert error:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function updateMember(
  id: string,
  updates: Partial<MemberInput>,
  newFaceEmbedding?: number[],
  newFaceImageBlob?: Blob
): Promise<Member> {
  let faceImageUrl: string | undefined;

  if (newFaceImageBlob) {
    const fileName = `face-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(MEMBER_STORAGE_BUCKET)
      .upload(fileName, newFaceImageBlob, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload face image: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(MEMBER_STORAGE_BUCKET)
      .getPublicUrl(uploadData.path);

    faceImageUrl = urlData.publicUrl;
  }

  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (newFaceEmbedding) {
    updateData.face_embedding = newFaceEmbedding;
  }
  if (faceImageUrl) {
    updateData.face_image_url = faceImageUrl;
  }

  const { data, error } = await supabase
    .from(MEMBERS_TABLE)
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateMember] Error:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function deleteMember(id: string): Promise<void> {
  const member = await getMemberById(id);
  if (member?.face_image_url) {
    const path = member.face_image_url.split("/").pop();
    if (path) {
      await supabase.storage.from(MEMBER_STORAGE_BUCKET).remove([path]);
    }
  }

  const { error } = await supabase.from(MEMBERS_TABLE).delete().eq("id", id);

  if (error) {
    console.error("[deleteMember] Error:", error);
    throw new Error(error.message);
  }
}

export async function findMembersByFaceEmbedding(
  embedding: number[],
  threshold: number = 0.7,
  limit: number = 5
): Promise<Array<Member & { similarity: number }>> {
  const { data, error } = await supabase.rpc("match_members", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_limit: limit,
  });

  if (error) {
    console.error("[findMembersByFaceEmbedding] Error:", error);
    throw new Error(error.message);
  }

  return data || [];
}