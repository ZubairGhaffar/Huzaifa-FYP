"use client";

import { useState, useEffect } from "react";
import { Member } from "@/types";
import { fetchMembers as fetchMembersApi, removeMember } from "@/lib/api/members";

interface MemberListProps {
  onRefresh?: number;
}

export function MemberList({ onRefresh }: MemberListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMembersApi();
      setMembers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load members";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchMembers();
  }, [onRefresh]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this member?")) return;

    setDeletingId(id);
    try {
      await removeMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <div className="member-list-loading">Loading members...</div>;
  }

  if (error) {
    return (
      <div className="member-list-error">
        <p>Error: {error}</p>
        <button onClick={fetchMembers} className="btn btn-sm">
          Retry
        </button>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="member-list-empty">
        <p>No members added yet.</p>
        <p className="hint">Use the form above to add your first member.</p>
      </div>
    );
  }

  return (
    <div className="member-list">
      <h3>Members ({members.length})</h3>
      <div className="member-grid">
        {members.map((member) => (
          <div key={member.id} className="member-card">
            <div className="member-card-image">
              {member.face_image_url ? (
                <img src={member.face_image_url} alt={member.name} />
              ) : (
                <div className="member-card-placeholder">
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="member-card-info">
              <h4>{member.name}</h4>
              <span className="member-relationship">{member.relationship}</span>
              {member.email && <p className="member-email">{member.email}</p>}
              {member.phone && <p className="member-phone">{member.phone}</p>}
            </div>
            <button
              onClick={() => handleDelete(member.id)}
              disabled={deletingId === member.id}
              className="btn btn-icon btn-danger"
              title="Delete member"
            >
              {deletingId === member.id ? "..." : "×"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}